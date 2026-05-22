using System;
using CRM.Model.Enums;

namespace CRM.Model.DTOs;

public record UserDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    Role Role,
    DateTime CreatedAt
);

public record CreateUserDto(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    Role Role
);
