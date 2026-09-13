using Application.DTOs.Payment;
using Domain.Entities.Booking;

namespace Application.Interfaces.Services.Bookings
{
    public interface IBookingPaymentRequestFactory
    {
        PaymentInvoiceRequest Create(Booking booking, int? paymentMethodId, PaymentRedirectionUrls? redirectionUrls);
    }
}
