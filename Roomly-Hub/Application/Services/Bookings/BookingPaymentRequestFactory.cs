using Application.DTOs.Payment;
using Application.Interfaces.Services.Bookings;
using Domain.Entities.Booking;
using System.Globalization;

namespace Application.Services.Bookings
{
    public class BookingPaymentRequestFactory : IBookingPaymentRequestFactory
    {
        public PaymentInvoiceRequest Create(Booking booking, int? paymentMethodId, PaymentRedirectionUrls? redirectionUrls)
        {
            return new PaymentInvoiceRequest
            {
                InvoiceNumber = $"ROOMLY-{booking.Id:N}-{Guid.NewGuid():N}",
                PaymentMethodId = paymentMethodId,
                Amount = booking.TotalPrice.ToString("0.##", CultureInfo.InvariantCulture),
                Currency = "VND",
                Description = $"Roomly booking {booking.Id:N}",
                CustomerId = booking.GuestId.ToString("N"),
                RedirectionUrls = redirectionUrls
            };
        }
    }
}
