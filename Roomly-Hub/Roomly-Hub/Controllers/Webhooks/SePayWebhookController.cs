using Application.Common.Constants;
using Application.DTOs.Payment;
using Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Roomly_Hub.Common;

namespace Roomly_Hub.Controllers.Webhooks
{
    [AllowAnonymous]
    [Route("api/webhooks/sepay")]
    [Route("api/v1/webhooks/sepay")]
    public sealed class SePayWebhookController : ApiControllerBase
    {
        private readonly IPaymentWebhookService _paymentWebhookService;

        public SePayWebhookController(IPaymentWebhookService paymentWebhookService)
        {
            _paymentWebhookService = paymentWebhookService;
        }

        [HttpPost("ipn")]
        [RequestSizeLimit(1024 * 1024)]
        public async Task<IActionResult> HandleIpn(CancellationToken cancellationToken)
        {
            using var reader = new StreamReader(Request.Body);
            var rawBody = await reader.ReadToEndAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(rawBody))
                return BadRequest();

            SePayIpnRequest? ipn;
            try
            {
                ipn = JsonConvert.DeserializeObject<SePayIpnRequest>(rawBody);
            }
            catch (JsonException)
            {
                return BadRequest();
            }

            if (ipn == null)
                return BadRequest();

            var secret = Request.Headers["X-Secret-Key"].FirstOrDefault();
            var result = await _paymentWebhookService.HandleIpnAsync(ipn, secret, cancellationToken);
            if (result.IsFailure)
            {
                return result.ErrorCode switch
                {
                    var code when code == Errors.Codes.Common.UnauthorizedAction => Unauthorized(CreateProblemDetails(result, StatusCodes.Status401Unauthorized, "Unauthorized")),
                    var code when code == Errors.Codes.Booking.BookingNotFound => NotFound(CreateProblemDetails(result, StatusCodes.Status404NotFound, "Booking not found")),
                    var code when code == Errors.Codes.Booking.InvalidBookingState => Conflict(CreateProblemDetails(result, StatusCodes.Status409Conflict, "Invalid booking state")),
                    var code when code == Errors.Codes.Booking.ConcurrencyConflict => Conflict(CreateProblemDetails(result, StatusCodes.Status409Conflict, "Concurrency conflict")),
                    _ => BadRequest(CreateProblemDetails(result, StatusCodes.Status400BadRequest, "Invalid IPN"))
                };
            }

            return Ok(new { success = true });
        }
    }
}
