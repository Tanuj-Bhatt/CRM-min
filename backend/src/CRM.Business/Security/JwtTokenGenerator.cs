using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using CRM.Model.Entities;

namespace CRM.Business.Security;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _config;

    public JwtTokenGenerator(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(User user)
    {
        var keyString = _config["Jwt:Key"] ?? "SUPER_SECRET_KEY_CRM_SYSTEM_10_LATEST_VERSION_2026_JWT_TOKEN";
        var issuer = _config["Jwt:Issuer"] ?? "CRM.API";
        var audience = _config["Jwt:Audience"] ?? "CRM.Client";
        var expiryInMinutes = double.TryParse(_config["Jwt:ExpiryInMinutes"], out var val) ? val : 1440; // Default 1 day

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("OrganizationId", user.OrganizationId.ToString()),
            new("FirstName", user.FirstName),
            new("LastName", user.LastName)
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryInMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
