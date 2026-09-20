using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CRM.IDataProvider;
using CRM.Model.DTOs;
using CRM.Model.Entities;
using CRM.Model.Enums;

namespace CRM.Business.Services;

public class AutomationService : IAutomationService
{
    private readonly IUnitOfWork _unitOfWork;

    public AutomationService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid?> GetNextRoundRobinAgentIdAsync(Guid orgId)
    {
        var users = await _unitOfWork.Users.GetUsersByOrganizationAsync(orgId);
        var userList = users.ToList();
        if (!userList.Any()) return null;

        var leads = await _unitOfWork.Leads.GetLeadsByOrganizationAsync(orgId);
        var activeLeads = leads.Where(l => l.Status != LeadStatus.Won && l.Status != LeadStatus.Lost).ToList();

        // Assign to the user with the lowest active deal count (load-balanced round-robin)
        var userWithLowestLoad = userList
            .Select(u => new
            {
                User = u,
                OpenLeadCount = activeLeads.Count(l => l.AssignedToUserId == u.Id)
            })
            .OrderBy(x => x.OpenLeadCount)
            .ThenBy(x => x.User.CreatedAt)
            .FirstOrDefault();

        return userWithLowestLoad?.User.Id;
    }

    public int CalculateDealScore(Lead lead, int staleThresholdDays)
    {
        if (lead.Status == LeadStatus.Lost) return 5;
        if (lead.Status == LeadStatus.Won) return 100;

        int score = 40; // baseline

        // 1. Estimated Deal Value
        if (lead.EstimatedValue >= 100000) score += 25;
        else if (lead.EstimatedValue >= 50000) score += 15;
        else if (lead.EstimatedValue >= 10000) score += 10;
        else if (lead.EstimatedValue > 0) score += 5;

        // 2. Stage Progression
        switch (lead.Status)
        {
            case LeadStatus.Qualified: score += 20; break;
            case LeadStatus.Contacted: score += 10; break;
            case LeadStatus.New: score += 5; break;
        }

        // 3. Acquisition Source Quality
        var source = (lead.Source ?? "").ToLower();
        if (source.Contains("referral")) score += 15;
        else if (source.Contains("linkedin") || source.Contains("website")) score += 10;
        else if (source.Contains("event")) score += 8;

        // 4. Activity Engagement & Recency
        var activityCount = lead.Activities?.Count ?? 0;
        score += Math.Min(activityCount * 4, 20); // up to +20 pts

        var lastContact = lead.LastContactedAt ?? lead.CreatedAt;
        var daysSinceContact = (DateTime.UtcNow - lastContact).TotalDays;

        if (daysSinceContact <= 2) score += 15;
        else if (daysSinceContact <= 7) score += 8;
        else if (daysSinceContact > staleThresholdDays) score -= 30; // Stale penalty

        return Math.Clamp(score, 1, 99);
    }

    public async Task<LeadDto> CaptureInboundLeadAsync(WebhookLeadDto dto, string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new UnauthorizedAccessException("Webhook API key is required.");
        }

        var orgs = await _unitOfWork.Organizations.GetAllAsync();
        var org = orgs.FirstOrDefault(o => o.WebhookApiKey == apiKey.Trim());
        if (org == null)
        {
            throw new UnauthorizedAccessException("Invalid or expired Webhook API key.");
        }

        // Auto-assign via round-robin if enabled
        Guid? assigneeId = null;
        if (org.AutoAssignRoundRobin)
        {
            assigneeId = await GetNextRoundRobinAgentIdAsync(org.Id);
        }

        var lead = new Lead
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName?.Trim() ?? string.Empty,
            Email = dto.Email.Trim(),
            Phone = dto.Phone?.Trim() ?? string.Empty,
            CompanyName = string.IsNullOrWhiteSpace(dto.CompanyName) ? "Direct Client" : dto.CompanyName.Trim(),
            EstimatedValue = dto.EstimatedValue ?? 0,
            Status = LeadStatus.New,
            Source = string.IsNullOrWhiteSpace(dto.Source) ? "Website Webhook" : dto.Source.Trim(),
            OrganizationId = org.Id,
            AssignedToUserId = assigneeId,
            LastContactedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        lead.Score = CalculateDealScore(lead, org.StaleDealThresholdDays);

        await _unitOfWork.Leads.AddAsync(lead);

        // Automated activity log
        var activity = new ActivityLog
        {
            LeadId = lead.Id,
            UserId = assigneeId ?? Guid.Empty,
            Type = ActivityType.Note,
            Details = $"⚡ [Automated Inbound Lead Capture]\nCaptured via website webhook integration.\nNotes: {dto.Notes ?? "No additional notes provided."}",
            CreatedAt = DateTime.UtcNow
        };

        if (assigneeId.HasValue)
        {
            await _unitOfWork.ActivityLogs.AddAsync(activity);
        }

        await _unitOfWork.CompleteAsync();

        var createdLead = await _unitOfWork.Leads.GetLeadWithActivitiesAsync(lead.Id, org.Id);
        return MapLeadDto(createdLead ?? lead, org.StaleDealThresholdDays);
    }

    public async Task<AutomationSettingsDto> GetSettingsAsync(Guid orgId, string requestHost)
    {
        var org = await _unitOfWork.Organizations.GetByIdAsync(orgId);
        if (org == null) throw new KeyNotFoundException("Organization not found.");

        var users = await _unitOfWork.Users.GetUsersByOrganizationAsync(orgId);

        var webhookUrl = $"{requestHost}/api/automations/capture?apiKey={org.WebhookApiKey}";

        return new AutomationSettingsDto(
            WebhookApiKey: org.WebhookApiKey,
            WebhookUrl: webhookUrl,
            AutoAssignRoundRobin: org.AutoAssignRoundRobin,
            StaleDealThresholdDays: org.StaleDealThresholdDays,
            ActiveAgentsCount: users.Count()
        );
    }

    public async Task<AutomationSettingsDto> UpdateSettingsAsync(Guid orgId, UpdateAutomationSettingsDto dto, string requestHost)
    {
        var org = await _unitOfWork.Organizations.GetByIdAsync(orgId);
        if (org == null) throw new KeyNotFoundException("Organization not found.");

        org.AutoAssignRoundRobin = dto.AutoAssignRoundRobin;
        if (dto.StaleDealThresholdDays >= 3 && dto.StaleDealThresholdDays <= 90)
        {
            org.StaleDealThresholdDays = dto.StaleDealThresholdDays;
        }
        org.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Organizations.Update(org);
        await _unitOfWork.CompleteAsync();

        return await GetSettingsAsync(orgId, requestHost);
    }

    public async Task<string> RegenerateApiKeyAsync(Guid orgId)
    {
        var org = await _unitOfWork.Organizations.GetByIdAsync(orgId);
        if (org == null) throw new KeyNotFoundException("Organization not found.");

        org.WebhookApiKey = Guid.NewGuid().ToString("N");
        org.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Organizations.Update(org);
        await _unitOfWork.CompleteAsync();

        return org.WebhookApiKey;
    }

    public async Task AutoSyncContactOnDealWonAsync(Lead lead, Guid orgId)
    {
        if (string.IsNullOrWhiteSpace(lead.Email)) return;

        var contacts = await _unitOfWork.Contacts.GetContactsByOrganizationAsync(orgId);
        var existing = contacts.FirstOrDefault(c => c.Email.ToLower() == lead.Email.ToLower());

        if (existing == null)
        {
            var newContact = new Contact
            {
                FirstName = lead.FirstName,
                LastName = lead.LastName,
                Email = lead.Email,
                Phone = lead.Phone,
                JobTitle = "Account Owner",
                CompanyName = lead.CompanyName,
                OrganizationId = orgId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Contacts.AddAsync(newContact);
            await _unitOfWork.CompleteAsync();
        }
    }

    private static LeadDto MapLeadDto(Lead lead, int staleThresholdDays)
    {
        var assignedName = lead.AssignedToUser != null 
            ? $"{lead.AssignedToUser.FirstName} {lead.AssignedToUser.LastName}" 
            : null;

        var lastContact = lead.LastContactedAt ?? lead.CreatedAt;
        var isStale = (DateTime.UtcNow - lastContact).TotalDays >= staleThresholdDays &&
                      lead.Status != LeadStatus.Won && 
                      lead.Status != LeadStatus.Lost;

        return new LeadDto(
            Id: lead.Id,
            FirstName: lead.FirstName,
            LastName: lead.LastName,
            Email: lead.Email,
            Phone: lead.Phone,
            CompanyName: lead.CompanyName,
            EstimatedValue: lead.EstimatedValue,
            Status: lead.Status,
            Source: lead.Source,
            AssignedToUserId: lead.AssignedToUserId,
            AssignedToUserName: assignedName,
            ExpectedCloseDate: lead.ExpectedCloseDate,
            CloseReason: lead.CloseReason,
            Score: lead.Score > 0 ? lead.Score : 50,
            LastContactedAt: lead.LastContactedAt,
            IsStale: isStale,
            CreatedAt: lead.CreatedAt,
            UpdatedAt: lead.UpdatedAt
        );
    }
}
