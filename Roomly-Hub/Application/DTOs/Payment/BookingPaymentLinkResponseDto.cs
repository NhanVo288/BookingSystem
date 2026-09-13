using Domain.enums.Booking;

namespace Application.DTOs.Payment
{
    public class BookingPaymentLinkResponseDto
    {
        public Guid BookingId { get; set; }
        public BookingStatus Status { get; set; }
        public string PaymentUrl { get; set; }
        public string CheckoutMethod { get; set; } = "POST";
        public IReadOnlyDictionary<string, string> CheckoutFields { get; set; } = new Dictionary<string, string>();
    }
}
