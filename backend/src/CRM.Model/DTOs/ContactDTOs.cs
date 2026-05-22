using System;

namespace CRM.Model.DTOs;

public record ContactDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string JobTitle,
    string CompanyName,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateContactDto(
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string JobTitle,
    string CompanyName
);

public record UpdateContactDto(
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string JobTitle,
    string CompanyName
);
