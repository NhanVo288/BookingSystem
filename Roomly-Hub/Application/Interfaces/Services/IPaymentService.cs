using Application.DTOs.Payment;
using Domain.Entities.Payment;
using Domain.enums.Booking;

namespace Application.Interfaces.Services
{
    public interface IPaymentService
    {
        Task<EInvoiceResponseData?> CreateEInvoiceAsync(PaymentInvoiceRequest invoice, CancellationToken cancellationToken = default);

        Task<IList<PaymentMethoodModel>?> GetPaymentMethods(CancellationToken cancellationToken = default);

        bool VerifyIpnSecret(string? secret);

        Task<PaymentStatus> CheckInvoiceStatusAsync(string invoiceReference, CancellationToken cancellationToken = default);
    }
}
