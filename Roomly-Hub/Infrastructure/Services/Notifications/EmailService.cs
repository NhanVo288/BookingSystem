using Application.DTOs;
using Application.Interfaces.Services;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Infrastructure.Services.Notifications
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _settings;

        public EmailService(IOptions<EmailSettings> settings)
        {
            _settings = settings.Value;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
            message.To.Add(new MailboxAddress(string.Empty, toEmail));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();
            var hasCredentials = !string.IsNullOrWhiteSpace(_settings.Password);
            var socketOptions = hasCredentials
                ? SecureSocketOptions.StartTls
                : SecureSocketOptions.StartTlsWhenAvailable;

            await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, socketOptions, cancellationToken);

            // Local SMTP catchers such as Mailpit do not require authentication.
            // Production providers should always configure a password and use STARTTLS.
            if (hasCredentials)
            {
                await client.AuthenticateAsync(_settings.SenderEmail, _settings.Password, cancellationToken);
            }

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
        }
    }
}
