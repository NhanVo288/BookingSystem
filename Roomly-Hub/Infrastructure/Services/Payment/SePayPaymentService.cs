using Application.DTOs.Payment;
using Application.Interfaces.Services;
using Domain.Entities.Payment;
using Domain.enums.Booking;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;

namespace Infrastructure.Services.Payment
{
    public sealed class SePayPaymentService : IPaymentService
    {
        public const string HttpClientName = "SePay";

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<SePayPaymentService> _logger;
        private readonly SePayOptions _options;

        public SePayPaymentService(
            IHttpClientFactory httpClientFactory,
            IOptions<SePayOptions> options,
            ILogger<SePayPaymentService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _options = options.Value;
        }

        public Task<EInvoiceResponseData?> CreateEInvoiceAsync(PaymentInvoiceRequest invoice, CancellationToken cancellationToken = default)
        {
            try
            {
                if (invoice == null ||
                    string.IsNullOrWhiteSpace(_options.MerchantId) ||
                    string.IsNullOrWhiteSpace(_options.SecretKey) ||
                    string.IsNullOrWhiteSpace(_options.CheckoutUrl))
                {
                    _logger.LogError("SePay checkout configuration or invoice data is missing");
                    return Task.FromResult<EInvoiceResponseData?>(null);
                }

                if (!decimal.TryParse(invoice.Amount, NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) ||
                    amount <= 0 ||
                    decimal.Truncate(amount) != amount)
                {
                    _logger.LogWarning("Invalid SePay payment amount for invoice {InvoiceNumber}", invoice.InvoiceNumber);
                    return Task.FromResult<EInvoiceResponseData?>(null);
                }

                if (!string.Equals(invoice.Currency, "VND", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("SePay only supports VND; received {Currency}", invoice.Currency);
                    return Task.FromResult<EInvoiceResponseData?>(null);
                }

                var fields = BuildCheckoutFields(invoice, amount);
                var signature = Sign(fields);
                fields.Add("signature", signature);

                _logger.LogInformation("Created SePay checkout form for invoice {InvoiceNumber}", invoice.InvoiceNumber);
                return Task.FromResult<EInvoiceResponseData?>(new EInvoiceResponseData
                {
                    InvoiceId = invoice.InvoiceNumber,
                    InvoiceKey = signature,
                    Url = _options.CheckoutUrl,
                    CheckoutMethod = "POST",
                    CheckoutFields = fields
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create SePay checkout form");
                return Task.FromResult<EInvoiceResponseData?>(null);
            }
        }

        public Task<IList<PaymentMethoodModel>?> GetPaymentMethods(CancellationToken cancellationToken = default)
        {
            IList<PaymentMethoodModel> methods = new List<PaymentMethoodModel>
            {
                new() { Id = 1, PaymentId = 1, NameEn = "Bank transfer", NameAr = "Bank transfer", Redirect = "POST", Logo = string.Empty },
                new() { Id = 2, PaymentId = 2, NameEn = "Card", NameAr = "Card", Redirect = "POST", Logo = string.Empty },
                new() { Id = 3, PaymentId = 3, NameEn = "NAPAS bank transfer", NameAr = "NAPAS bank transfer", Redirect = "POST", Logo = string.Empty }
            };

            return Task.FromResult<IList<PaymentMethoodModel>?>(methods);
        }

        public bool VerifyIpnSecret(string? secret)
        {
            if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(_options.IpnSecret))
                return false;

            var expected = Encoding.UTF8.GetBytes(_options.IpnSecret);
            var received = Encoding.UTF8.GetBytes(secret);
            return expected.Length == received.Length && CryptographicOperations.FixedTimeEquals(expected, received);
        }

        public async Task<PaymentStatus> CheckInvoiceStatusAsync(string invoiceReference, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(invoiceReference))
                return PaymentStatus.Failed;

            try
            {
                var client = _httpClientFactory.CreateClient(HttpClientName);
                var baseUrl = _options.ApiBaseUrl.TrimEnd('/');
                var request = new HttpRequestMessage(
                    HttpMethod.Get,
                    $"{baseUrl}/v1/order/detail/{Uri.EscapeDataString(invoiceReference)}");

                var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.MerchantId}:{_options.SecretKey}"));
                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

                var response = await client.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("SePay order lookup failed for {InvoiceReference} with status {StatusCode}", invoiceReference, response.StatusCode);
                    return PaymentStatus.Pending;
                }

                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                var order = JsonConvert.DeserializeObject<SePayOrderDetailResponse>(content)?.Data;

                return order?.Status?.ToUpperInvariant() switch
                {
                    "CAPTURED" => PaymentStatus.Paid,
                    "CANCELLED" => PaymentStatus.Failed,
                    _ => PaymentStatus.Pending
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check SePay order status for {InvoiceReference}", invoiceReference);
                return PaymentStatus.Pending;
            }
        }

        private Dictionary<string, string> BuildCheckoutFields(PaymentInvoiceRequest invoice, decimal amount)
        {
            var fields = new Dictionary<string, string>
            {
                ["order_amount"] = amount.ToString("0", CultureInfo.InvariantCulture),
                ["merchant"] = _options.MerchantId,
                ["currency"] = "VND",
                ["operation"] = "PURCHASE",
                ["order_description"] = invoice.Description,
                ["order_invoice_number"] = invoice.InvoiceNumber
            };

            if (!string.IsNullOrWhiteSpace(invoice.CustomerId))
                fields.Add("customer_id", invoice.CustomerId);

            var paymentMethod = MapPaymentMethod(invoice.PaymentMethodId);
            if (paymentMethod != null)
                fields.Add("payment_method", paymentMethod);

            if (!string.IsNullOrWhiteSpace(invoice.RedirectionUrls?.OnSuccess))
                fields.Add("success_url", invoice.RedirectionUrls.OnSuccess);
            if (!string.IsNullOrWhiteSpace(invoice.RedirectionUrls?.OnFailure))
                fields.Add("error_url", invoice.RedirectionUrls.OnFailure);
            if (!string.IsNullOrWhiteSpace(invoice.RedirectionUrls?.OnPending))
                fields.Add("cancel_url", invoice.RedirectionUrls.OnPending);

            return fields;
        }

        private string Sign(IReadOnlyDictionary<string, string> fields)
        {
            var payload = string.Join(",", fields.Select(field => $"{field.Key}={field.Value}"));
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.SecretKey));
            return Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
        }

        private static string? MapPaymentMethod(int? paymentMethodId) => paymentMethodId switch
        {
            null => null,
            1 => "BANK_TRANSFER",
            2 => "CARD",
            3 => "NAPAS_BANK_TRANSFER",
            _ => throw new ArgumentOutOfRangeException(nameof(paymentMethodId), "Unsupported SePay payment method")
        };
    }
}
