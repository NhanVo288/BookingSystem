using Application.Common.Results;
using Application.DTOs.Payment;

namespace Application.Interfaces.Services
{
    public interface IPaymentWebhookService
    {
        Task<Result> HandleIpnAsync(SePayIpnRequest ipn, string? secret, CancellationToken cancellationToken = default);

        Task<Result> HandleSuccessWebhookAsync(string invoiceReference, CancellationToken cancellationToken = default);
    }
}
