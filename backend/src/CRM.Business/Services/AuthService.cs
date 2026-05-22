using System;
using System.Threading.Tasks;
using CRM.Business.Security;
using CRM.IDataProvider;
using CRM.Model.DTOs;
using CRM.Model.Entities;
using CRM.Model.Enums;

namespace CRM.Business.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher, IJwtTokenGenerator jwtTokenGenerator)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _unitOfWork.Users.GetByEmailAsync(request.Email);
        if (user == null) return null;

        var isValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isValid) return null;

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new LoginResponse(
            Token: token,
            UserId: user.Id,
            Email: user.Email,
            FirstName: user.FirstName,
            LastName: user.LastName,
            Role: user.Role,
            OrganizationId: user.OrganizationId,
            OrganizationName: user.Organization.Name
        );
    }

    public async Task<bool> RegisterOrganizationAsync(RegisterRequest request)
    {
        // 1. Check if email already registered
        var existingUser = await _unitOfWork.Users.GetByEmailAsync(request.AdminEmail);
        if (existingUser != null) return false;

        // 2. Check if organization name exists
        var orgExists = await _unitOfWork.Organizations.ExistsByNameAsync(request.OrganizationName);
        if (orgExists) return false;

        // 3. Create Organization
        var organization = new Organization
        {
            Name = request.OrganizationName,
            SubscriptionTier = "Pro",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _unitOfWork.Organizations.AddAsync(organization);

        // 4. Create Admin User
        var adminUser = new User
        {
            Email = request.AdminEmail,
            PasswordHash = _passwordHasher.HashPassword(request.AdminPassword),
            FirstName = request.AdminFirstName,
            LastName = request.AdminLastName,
            Role = Role.Admin,
            OrganizationId = organization.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _unitOfWork.Users.AddAsync(adminUser);

        // 5. Complete Transaction
        var result = await _unitOfWork.CompleteAsync();
        return result > 0;
    }

    public async Task<bool> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _unitOfWork.Users.GetByEmailAsync(request.Email);
        if (user == null) return false;

        Console.WriteLine($"[Forgot Password Link Requested] User: {user.Email}. Sent reset link placeholder.");
        return true;
    }
}
