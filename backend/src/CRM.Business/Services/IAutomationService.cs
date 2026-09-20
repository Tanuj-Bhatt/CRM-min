using System;
using System.Threading.Tasks;
using CRM.Model.DTOs;
using CRM.Model.Entities;

namespace CRM.Business.Services;

public interface IAutomationService
{
    Task<Guid?> GetNextRoundRobinAgentIdAsync(Guid orgId);
    int CalculateDealScore(Lead lead, int staleThresholdDays);
    Task<LeadDto> CaptureInboundLeadAsync(WebhookLeadDto dto, string apiKey);
    Task<AutomationSettingsDto> GetSettingsAsync(Guid orgId, string requestHost);
    Task<AutomationSettingsDto> UpdateSettingsAsync(Guid orgId, UpdateAutomationSettingsDto dto, string requestHost);
    Task<string> RegenerateApiKeyAsync(Guid orgId);
    Task AutoSyncContactOnDealWonAsync(Lead lead, Guid orgId);
}
