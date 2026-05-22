using System.Threading.Tasks;
using CRM.Model.DTOs;

namespace CRM.Business.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<bool> RegisterOrganizationAsync(RegisterRequest request);
    Task<bool> ForgotPasswordAsync(ForgotPasswordRequest request);
}
