using Newtonsoft.Json;

namespace Application.DTOs.Payment
{
    public sealed class SePayOptions
    {
        public const string SectionName = "SePay";

        public string MerchantId { get; set; } = string.Empty;
        public string SecretKey { get; set; } = string.Empty;
        public string IpnSecret { get; set; } = string.Empty;
        public string CheckoutUrl { get; set; } = "https://pay-sandbox.sepay.vn/v1/checkout/init";
        public string ApiBaseUrl { get; set; } = "https://pgapi-sandbox.sepay.vn";
    }

    public sealed class SePayIpnRequest
    {
        [JsonProperty("timestamp")]
        public long Timestamp { get; set; }

        [JsonProperty("notification_type")]
        public string NotificationType { get; set; } = string.Empty;

        [JsonProperty("order")]
        public SePayIpnOrder? Order { get; set; }

        [JsonProperty("transaction")]
        public SePayIpnTransaction? Transaction { get; set; }
    }

    public sealed class SePayIpnOrder
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("order_id")]
        public string OrderId { get; set; } = string.Empty;

        [JsonProperty("order_status")]
        public string OrderStatus { get; set; } = string.Empty;

        [JsonProperty("order_currency")]
        public string Currency { get; set; } = string.Empty;

        [JsonProperty("order_amount")]
        public string Amount { get; set; } = string.Empty;

        [JsonProperty("order_invoice_number")]
        public string InvoiceNumber { get; set; } = string.Empty;
    }

    public sealed class SePayIpnTransaction
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("transaction_id")]
        public string TransactionId { get; set; } = string.Empty;

        [JsonProperty("payment_method")]
        public string PaymentMethod { get; set; } = string.Empty;

        [JsonProperty("transaction_status")]
        public string Status { get; set; } = string.Empty;

        [JsonProperty("transaction_amount")]
        public string Amount { get; set; } = string.Empty;

        [JsonProperty("transaction_currency")]
        public string Currency { get; set; } = string.Empty;
    }

    public sealed class SePayOrderDetailResponse
    {
        [JsonProperty("data")]
        public SePayOrderDetail? Data { get; set; }
    }

    public sealed class SePayOrderDetail
    {
        [JsonProperty("order_status")]
        public string Status { get; set; } = string.Empty;
    }
}
