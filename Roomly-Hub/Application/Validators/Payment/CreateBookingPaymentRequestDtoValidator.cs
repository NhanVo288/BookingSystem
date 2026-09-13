using Application.DTOs.Payment;
using FluentValidation;

namespace Application.Validators.Payment
{
    public class CreateBookingPaymentRequestDtoValidator : AbstractValidator<CreateBookingPaymentRequestDto>
    {
        public CreateBookingPaymentRequestDtoValidator()
        {
            RuleFor(x => x.BookingId)
                .NotEmpty().WithMessage("BookingId is required.");

            RuleFor(x => x.PaymentMethodId)
                .InclusiveBetween(1, 3).WithMessage("PaymentMethodId must be 1 (bank transfer), 2 (card), or 3 (NAPAS bank transfer).");

            RuleFor(x => x.RedirectionUrls)
                .SetValidator(new PaymentRedirectionUrlsValidator()!)
                .When(x => x.RedirectionUrls is not null);
        }
    }
}
