using System;

namespace CRM.Model.DTOs;

public record WebhookLeadDto(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? CompanyName,
    decimal? EstimatedValue,
    string? Source,
    string? Notes
);

public record AutomationSettingsDto(
    string WebhookApiKey,
    string WebhookUrl,
    bool AutoAssignRoundRobin,
    int StaleDealThresholdDays,
    int ActiveAgentsCount
);

public record UpdateAutomationSettingsDto(
    bool AutoAssignRoundRobin,
    int StaleDealThresholdDays
);
