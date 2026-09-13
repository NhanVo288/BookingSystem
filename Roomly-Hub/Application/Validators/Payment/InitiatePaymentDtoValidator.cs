using Application.DTOs.Payment;
using FluentValidation;

namespace Application.Validators.Payment
{
    public class InitiatePaymentDtoValidator : AbstractValidator<InitiatePaymentDto>
    {
        public InitiatePaymentDtoValidator()
        {
            RuleFor(x => x.PaymentMethodId)
                .InclusiveBetween(1, 3).WithMessage("PaymentMethodId must be 1 (bank transfer), 2 (card), or 3 (NAPAS bank transfer).");

            RuleFor(x => x.RedirectionUrls)
                .SetValidator(new PaymentRedirectionUrlsValidator()!)
                .When(x => x.RedirectionUrls is not null);
        }
    }
}
