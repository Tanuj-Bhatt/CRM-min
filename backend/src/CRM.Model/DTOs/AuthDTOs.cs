using System;
using CRM.Model.Enums;

namespace CRM.Model.DTOs;

public record RegisterRequest(
    string OrganizationName,
    string AdminEmail,
    string AdminPassword,
    string AdminFirstName,
    string AdminLastName
);

public record LoginRequest(
    string Email,
    string Password
);

public record LoginResponse(
    string Token,
    Guid UserId,
    string Email,
    string FirstName,
    string LastName,
    Role Role,
    Guid OrganizationId,
    string OrganizationName
);

public record ForgotPasswordRequest(
    string Email
);
