using System;
using CRM.Model.Enums;

namespace CRM.Model.DTOs;

public record LeadDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string CompanyName,
    decimal EstimatedValue,
    LeadStatus Status,
    string Source,
    Guid? AssignedToUserId,
    string? AssignedToUserName,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateLeadDto(
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string CompanyName,
    decimal EstimatedValue,
    LeadStatus Status,
    string Source,
    Guid? AssignedToUserId
);

public record UpdateLeadDto(
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string CompanyName,
    decimal EstimatedValue,
    LeadStatus Status,
    string Source,
    Guid? AssignedToUserId
);

public record ActivityLogDto(
    Guid Id,
    Guid? LeadId,
    Guid? ContactId,
    Guid UserId,
    string UserName,
    ActivityType Type,
    string Details,
    DateTime CreatedAt
);

public record CreateActivityLogDto(
    ActivityType Type,
    string Details
);
