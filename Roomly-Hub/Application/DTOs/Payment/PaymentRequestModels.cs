using Newtonsoft.Json;

namespace Application.DTOs.Payment
{
    public class PaymentInvoiceRequest
    {
        public string InvoiceNumber { get; set; } = string.Empty;
        public int? PaymentMethodId { get; set; }
        public string Amount { get; set; } = string.Empty;
        public string Currency { get; set; } = "VND";
        public string Description { get; set; } = string.Empty;
        public string? CustomerId { get; set; }
        public PaymentRedirectionUrls? RedirectionUrls { get; set; }
    }

    public class PaymentRedirectionUrls
    {
        [JsonProperty("successUrl")]
        public string? OnSuccess { get; set; }

        [JsonProperty("errorUrl")]
        public string? OnFailure { get; set; }

        [JsonProperty("cancelUrl")]
        public string? OnPending { get; set; }
    }
}
