using Microsoft.AspNetCore.Mvc;
using CRM.Business.Services;
using CRM.Model.DTOs;

namespace CRM.API.Controllers;

[Route("api/[controller]")]
public class AuthController : BaseApiController
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var success = await _authService.RegisterOrganizationAsync(request);
        if (!success)
            return BadRequest(new { message = "Registration failed. Email or organization name may already exist." });

        return Ok(new { message = "Organization registered successfully." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (result == null)
            return Unauthorized(new { message = "Invalid email or password." });

        return Ok(result);
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var result = await _authService.ForgotPasswordAsync(request);
        // Always return OK to prevent email enumeration
        return Ok(new { message = "If this email is registered, a reset link has been sent." });
    }
}
