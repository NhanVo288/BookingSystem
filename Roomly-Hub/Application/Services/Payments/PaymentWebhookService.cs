using Application.Common.Constants;
using Application.Common.Exceptions;
using Application.Common.Results;
using Application.DTOs.Payment;
using Application.Events.Notifications;
using Application.Interfaces.Persistence;
using Application.Interfaces.Services;
using Domain.Entities.Outbox;
using Domain.Entities.Payment;
using Domain.enums.Booking;
using Domain.Interfaces.Repositories;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Data;
using System.Globalization;

namespace Application.Services.Payments
{
    public sealed class PaymentWebhookService : IPaymentWebhookService
    {
        private readonly IPaymentService _paymentService;
        private readonly IBookingRepository _bookingRepository;
        private readonly IPaymentWebhookLogRepository _webhookLogRepository;
        private readonly IOutboxMessageRepository _outboxMessageRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<PaymentWebhookService> _logger;

        public PaymentWebhookService(
            IPaymentService paymentService,
            IBookingRepository bookingRepository,
            IPaymentWebhookLogRepository webhookLogRepository,
            IOutboxMessageRepository outboxMessageRepository,
            IUnitOfWork unitOfWork,
            ILogger<PaymentWebhookService> logger)
        {
            _paymentService = paymentService;
            _bookingRepository = bookingRepository;
            _webhookLogRepository = webhookLogRepository;
            _outboxMessageRepository = outboxMessageRepository;
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<Result> HandleIpnAsync(SePayIpnRequest ipn, string? secret, CancellationToken cancellationToken = default)
        {
            if (ipn?.Order == null || ipn.Transaction == null || string.IsNullOrWhiteSpace(ipn.Order.InvoiceNumber))
                return Result.Failure(Errors.Codes.Common.ValidationError, Errors.Messages.Common.RequestValidationFailed);

            if (!_paymentService.VerifyIpnSecret(secret))
            {
                _logger.LogWarning("Rejected SePay IPN because X-Secret-Key is invalid");
                return Result.Failure(Errors.Codes.Common.UnauthorizedAction, Errors.Messages.Room.UnauthorizedAction);
            }

            var eventReference = FirstNonEmpty(ipn.Transaction.TransactionId, ipn.Transaction.Id, ipn.Order.OrderId, ipn.Order.Id);
            if (string.IsNullOrWhiteSpace(eventReference))
                return Result.Failure(Errors.Codes.Common.ValidationError, Errors.Messages.Common.RequestValidationFailed);
            var webhookType = string.Equals(ipn.NotificationType, "ORDER_PAID", StringComparison.OrdinalIgnoreCase)
                ? WebhookType.Success
                : WebhookType.Cancelled;

            if (await _webhookLogRepository.IsDuplicateAsync(null, null, eventReference, webhookType, cancellationToken))
            {
                _logger.LogInformation("Duplicate SePay IPN ignored for event {EventReference}", eventReference);
                return Result.Success();
            }

            var webhookLog = new PaymentWebhookLog
            {
                InvoiceKey = ipn.Order.InvoiceNumber,
                ReferenceId = eventReference,
                WebhookType = webhookType,
                RawPayload = JsonConvert.SerializeObject(ipn)
            };
            await _webhookLogRepository.AddAsync(webhookLog, cancellationToken);

            if (string.Equals(ipn.NotificationType, "TRANSACTION_VOID", StringComparison.OrdinalIgnoreCase))
                return await HandleVoidedTransactionAsync(ipn, webhookLog, cancellationToken);

            if (!string.Equals(ipn.NotificationType, "ORDER_PAID", StringComparison.OrdinalIgnoreCase))
            {
                webhookLog.MarkAsProcessed(true, $"Ignored SePay notification type: {ipn.NotificationType}");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                return Result.Success();
            }

            if (!IsSuccessfulPayment(ipn))
            {
                webhookLog.MarkAsProcessed(false, "Order or transaction is not in a successful state");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                return Result.Failure(Errors.Codes.Common.ValidationError, Errors.Messages.Common.RequestValidationFailed);
            }

            var booking = await _bookingRepository.GetBookingByInvoiceIdAsync(ipn.Order.InvoiceNumber, cancellationToken);
            if (booking == null)
            {
                webhookLog.MarkAsProcessed(false, "Booking not found");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                return Result.Failure(Errors.Codes.Booking.BookingNotFound, Errors.Messages.Booking.BookingNotFound);
            }

            webhookLog.BookingId = booking.Id;
            await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);

            if (!HasExpectedPaymentDetails(ipn, booking.TotalPrice))
            {
                webhookLog.MarkAsProcessed(false, "Payment amount or currency does not match booking");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                _logger.LogWarning("SePay IPN amount/currency mismatch for booking {BookingId}", booking.Id);
                return Result.Failure(Errors.Codes.Common.ValidationError, Errors.Messages.Common.RequestValidationFailed);
            }

            if (booking.PaymentStatus == PaymentStatus.Paid || booking.Status == BookingStatus.Confirmed)
            {
                webhookLog.MarkAsProcessed(true, "Idempotent: already paid");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                return Result.Success();
            }

            if (booking.Status != BookingStatus.AwaitingPayment)
            {
                webhookLog.MarkAsProcessed(false, $"Invalid booking state: {booking.Status}");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                return Result.Failure(Errors.Codes.Booking.InvalidBookingState, Errors.Messages.Booking.InvalidBookingState);
            }

            try
            {
                return await _unitOfWork.ExecuteInTransactionAsync(async token =>
                {
                    var latestBooking = await _bookingRepository.GetBookingByIdAsync(booking.Id, token);
                    if (latestBooking == null)
                        return Result.Failure(Errors.Codes.Booking.BookingNotFound, Errors.Messages.Booking.BookingNotFound);

                    if (latestBooking.PaymentStatus == PaymentStatus.Paid || latestBooking.Status == BookingStatus.Confirmed)
                    {
                        webhookLog.MarkAsProcessed(true, "Idempotent: already paid");
                        await _webhookLogRepository.UpdateAsync(webhookLog, token);
                        return Result.Success();
                    }

                    latestBooking.MarkPaymentSucceeded(MapPaymentMethod(ipn.Transaction.PaymentMethod));
                    await _bookingRepository.UpdateBookingAsync(latestBooking, token);
                    await _outboxMessageRepository.AddAsync(
                        OutboxMessage.Create(
                            nameof(PaymentConfirmationEvent),
                            JsonConvert.SerializeObject(new PaymentConfirmationEvent(latestBooking.Id, latestBooking.GuestId, ipn.Order.InvoiceNumber))),
                        token);
                    await _unitOfWork.SaveChangesAsync(token);

                    webhookLog.MarkAsProcessed(true);
                    await _webhookLogRepository.UpdateAsync(webhookLog, token);
                    _logger.LogInformation("SePay IPN confirmed payment for booking {BookingId}", latestBooking.Id);
                    return Result.Success();
                }, cancellationToken, IsolationLevel.ReadCommitted);
            }
            catch (ConcurrencyException ex)
            {
                webhookLog.MarkAsProcessed(false, $"Concurrency conflict: {ex.Message}");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                return Result.Failure(Errors.Codes.Booking.ConcurrencyConflict, Errors.Messages.Booking.ConcurrencyConflict);
            }
        }

        public async Task<Result> HandleSuccessWebhookAsync(string invoiceReference, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(invoiceReference))
                return Result.Failure(Errors.Codes.Common.ValidationError, Errors.Messages.Common.RequestValidationFailed);

            var booking = await _bookingRepository.GetBookingByInvoiceIdAsync(invoiceReference, cancellationToken);
            if (booking == null)
                return Result.Failure(Errors.Codes.Booking.BookingNotFound, Errors.Messages.Booking.BookingNotFound);
            if (booking.PaymentStatus == PaymentStatus.Paid || booking.Status == BookingStatus.Confirmed)
                return Result.Success();
            if (booking.Status != BookingStatus.AwaitingPayment)
                return Result.Failure(Errors.Codes.Booking.InvalidBookingState, Errors.Messages.Booking.InvalidBookingState);

            try
            {
                return await _unitOfWork.ExecuteInTransactionAsync(async token =>
                {
                    var latestBooking = await _bookingRepository.GetBookingByIdAsync(booking.Id, token);
                    if (latestBooking == null)
                        return Result.Failure(Errors.Codes.Booking.BookingNotFound, Errors.Messages.Booking.BookingNotFound);
                    if (latestBooking.PaymentStatus == PaymentStatus.Paid || latestBooking.Status == BookingStatus.Confirmed)
                        return Result.Success();

                    latestBooking.MarkPaymentSucceeded(latestBooking.PaymentMethod);
                    await _bookingRepository.UpdateBookingAsync(latestBooking, token);
                    await _outboxMessageRepository.AddAsync(
                        OutboxMessage.Create(nameof(PaymentConfirmationEvent), JsonConvert.SerializeObject(new PaymentConfirmationEvent(latestBooking.Id, latestBooking.GuestId, invoiceReference))),
                        token);
                    await _unitOfWork.SaveChangesAsync(token);
                    return Result.Success();
                }, cancellationToken, IsolationLevel.ReadCommitted);
            }
            catch (ConcurrencyException)
            {
                return Result.Failure(Errors.Codes.Booking.ConcurrencyConflict, Errors.Messages.Booking.ConcurrencyConflict);
            }
        }

        private async Task<Result> HandleVoidedTransactionAsync(
            SePayIpnRequest ipn,
            PaymentWebhookLog webhookLog,
            CancellationToken cancellationToken)
        {
            var booking = await _bookingRepository.GetBookingByInvoiceIdAsync(ipn.Order!.InvoiceNumber, cancellationToken);
            if (booking == null)
            {
                webhookLog.MarkAsProcessed(false, "Booking not found");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                return Result.Failure(Errors.Codes.Booking.BookingNotFound, Errors.Messages.Booking.BookingNotFound);
            }

            webhookLog.BookingId = booking.Id;
            if (booking.PaymentStatus == PaymentStatus.Refunded)
            {
                webhookLog.MarkAsProcessed(true, "Idempotent: already refunded");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                return Result.Success();
            }

            if (booking.PaymentStatus != PaymentStatus.Paid)
            {
                webhookLog.MarkAsProcessed(true, $"Ignored void for payment status: {booking.PaymentStatus}");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                return Result.Success();
            }

            try
            {
                return await _unitOfWork.ExecuteInTransactionAsync(async token =>
                {
                    var latestBooking = await _bookingRepository.GetBookingByIdAsync(booking.Id, token);
                    if (latestBooking == null)
                        return Result.Failure(Errors.Codes.Booking.BookingNotFound, Errors.Messages.Booking.BookingNotFound);
                    if (latestBooking.PaymentStatus != PaymentStatus.Refunded)
                    {
                        latestBooking.MarkAsRefunded();
                        await _bookingRepository.UpdateBookingAsync(latestBooking, token);
                        await _unitOfWork.SaveChangesAsync(token);
                    }

                    webhookLog.MarkAsProcessed(true);
                    await _webhookLogRepository.UpdateAsync(webhookLog, token);
                    return Result.Success();
                }, cancellationToken, IsolationLevel.ReadCommitted);
            }
            catch (ConcurrencyException ex)
            {
                webhookLog.MarkAsProcessed(false, $"Concurrency conflict: {ex.Message}");
                await _webhookLogRepository.UpdateAsync(webhookLog, cancellationToken);
                return Result.Failure(Errors.Codes.Booking.ConcurrencyConflict, Errors.Messages.Booking.ConcurrencyConflict);
            }
        }

        private static bool IsSuccessfulPayment(SePayIpnRequest ipn) =>
            string.Equals(ipn.Order!.OrderStatus, "CAPTURED", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(ipn.Transaction!.Status, "APPROVED", StringComparison.OrdinalIgnoreCase);

        private static bool HasExpectedPaymentDetails(SePayIpnRequest ipn, decimal expectedAmount)
        {
            var order = ipn.Order!;
            var transaction = ipn.Transaction!;
            return string.Equals(order.Currency, "VND", StringComparison.OrdinalIgnoreCase) &&
                   string.Equals(transaction.Currency, "VND", StringComparison.OrdinalIgnoreCase) &&
                   decimal.TryParse(order.Amount, NumberStyles.Number, CultureInfo.InvariantCulture, out var orderAmount) &&
                   decimal.TryParse(transaction.Amount, NumberStyles.Number, CultureInfo.InvariantCulture, out var transactionAmount) &&
                   orderAmount == expectedAmount && transactionAmount == expectedAmount;
        }

        private static PaymentMethod MapPaymentMethod(string paymentMethod) => paymentMethod.ToUpperInvariant() switch
        {
            "CARD" => PaymentMethod.Card,
            "NAPAS_BANK_TRANSFER" => PaymentMethod.NapasBankTransfer,
            _ => PaymentMethod.BankTransfer
        };

        private static string FirstNonEmpty(params string[] values) =>
            values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? string.Empty;
    }
}
