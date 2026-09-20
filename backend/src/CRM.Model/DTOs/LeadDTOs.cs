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
    DateTime? ExpectedCloseDate,
    string? CloseReason,
    int Score,
    DateTime? LastContactedAt,
    bool IsStale,
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
    Guid? AssignedToUserId,
    DateTime? ExpectedCloseDate = null,
    string? CloseReason = null
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
    Guid? AssignedToUserId,
    DateTime? ExpectedCloseDate = null,
    string? CloseReason = null
);

public record SendEmailDto(
    string RecipientEmail,
    string Subject,
    string Body
);

public record ImportCsvResultDto(
    int TotalProcessed,
    int ImportedCount,
    int FailedCount,
    List<string> Errors
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
