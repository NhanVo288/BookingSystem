namespace Application.DTOs.Payment
{
    public class InitiatePaymentDto
    {
        public int PaymentMethodId { get; set; }
        public PaymentRedirectionUrls? RedirectionUrls { get; set; }
    }
}
