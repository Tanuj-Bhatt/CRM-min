using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CRM.Business.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string bodyHtml, string? fromName = null)
    {
        var smtpHost = _config["Smtp:Host"];
        var smtpPort = int.TryParse(_config["Smtp:Port"], out var port) ? port : 587;
        var smtpUser = _config["Smtp:User"];
        var smtpPass = _config["Smtp:Password"];
        var fromEmail = _config["Smtp:FromEmail"] ?? "noreply@aerocrm.com";
        var senderDisplayName = fromName ?? _config["Smtp:FromName"] ?? "AeroCRM Platform";

        if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUser))
        {
            _logger.LogInformation(
                "[EmailService - Development Simulation]\nTo: {ToEmail}\nSubject: {Subject}\nBody:\n{Body}",
                toEmail, subject, bodyHtml);
            await Task.Delay(100); // Simulate network latency
            return true;
        }

        try
        {
            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(smtpUser, smtpPass),
                EnableSsl = true
            };

            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail, senderDisplayName),
                Subject = subject,
                Body = bodyHtml,
                IsBodyHtml = true
            };
            message.To.Add(toEmail);

            await client.SendMailAsync(message);
            _logger.LogInformation("Successfully dispatched email to {ToEmail}", toEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {ToEmail}", toEmail);
            return false;
        }
    }
}
