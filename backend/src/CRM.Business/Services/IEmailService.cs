using System.Threading.Tasks;

namespace CRM.Business.Services;

public interface IEmailService
{
    Task<bool> SendEmailAsync(string toEmail, string subject, string bodyHtml, string? fromName = null);
}
