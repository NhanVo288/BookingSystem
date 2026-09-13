using Newtonsoft.Json;

namespace Application.DTOs.Payment
{
    public sealed class EInvoiceResponseData
    {
        [JsonProperty("invoiceKey")]
        public string InvoiceKey { get; set; } = string.Empty;

        [JsonProperty("invoiceId")]
        public string InvoiceId { get; set; } = string.Empty;

        [JsonProperty("url")]
        public string Url { get; set; } = string.Empty;

        [JsonProperty("checkoutMethod")]
        public string CheckoutMethod { get; set; } = "POST";

        [JsonProperty("checkoutFields")]
        public IReadOnlyDictionary<string, string> CheckoutFields { get; set; } = new Dictionary<string, string>();
    }
}
