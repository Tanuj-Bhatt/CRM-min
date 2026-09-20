using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CRM.IDataProvider;
using CRM.Model.DTOs;
using CRM.Model.Entities;
using CRM.Model.Enums;

namespace CRM.Business.Services;

public class LeadService : ILeadService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEmailService _emailService;
    private readonly IAutomationService _automationService;

    public LeadService(IUnitOfWork unitOfWork, IEmailService emailService, IAutomationService automationService)
    {
        _unitOfWork = unitOfWork;
        _emailService = emailService;
        _automationService = automationService;
    }

    public async Task<IEnumerable<LeadDto>> GetLeadsAsync(Guid orgId)
    {
        var leads = await _unitOfWork.Leads.GetLeadsByOrganizationAsync(orgId);
        var org = await _unitOfWork.Organizations.GetByIdAsync(orgId);
        var threshold = org?.StaleDealThresholdDays ?? 14;

        return leads.Select(l => MapToDto(l, threshold));
    }

    public async Task<PagedResult<LeadDto>> GetPagedLeadsAsync(Guid orgId, int page, int pageSize, string? search, LeadStatus? status, string? source)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var (items, totalCount) = await _unitOfWork.Leads.GetPagedLeadsAsync(orgId, page, pageSize, search, status, source);
        var org = await _unitOfWork.Organizations.GetByIdAsync(orgId);
        var threshold = org?.StaleDealThresholdDays ?? 14;

        return new PagedResult<LeadDto>(items.Select(l => MapToDto(l, threshold)), totalCount, page, pageSize);
    }

    public async Task<LeadDto?> GetLeadByIdAsync(Guid id, Guid orgId)
    {
        var lead = await _unitOfWork.Leads.GetLeadWithActivitiesAsync(id, orgId);
        if (lead == null) return null;

        var org = await _unitOfWork.Organizations.GetByIdAsync(orgId);
        var threshold = org?.StaleDealThresholdDays ?? 14;

        return MapToDto(lead, threshold);
    }

    public async Task<LeadDto> CreateLeadAsync(CreateLeadDto dto, Guid orgId)
    {
        Guid? assigneeId = dto.AssignedToUserId;

        // Auto-assign via Round-Robin if unassigned
        if (!assigneeId.HasValue)
        {
            var org = await _unitOfWork.Organizations.GetByIdAsync(orgId);
            if (org != null && org.AutoAssignRoundRobin)
            {
                assigneeId = await _automationService.GetNextRoundRobinAgentIdAsync(orgId);
            }
        }
        else
        {
            // Tenant boundary validation on explicit assignee
            var assignedUser = await _unitOfWork.Users.GetByIdAsync(assigneeId.Value);
            if (assignedUser == null || assignedUser.OrganizationId != orgId)
            {
                throw new InvalidOperationException("Assigned representative does not belong to your organization.");
            }
        }

        var lead = new Lead
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = dto.Email.Trim(),
            Phone = dto.Phone?.Trim() ?? string.Empty,
            CompanyName = dto.CompanyName.Trim(),
            EstimatedValue = dto.EstimatedValue,
            Status = dto.Status,
            Source = dto.Source.Trim(),
            OrganizationId = orgId,
            AssignedToUserId = assigneeId,
            ExpectedCloseDate = dto.ExpectedCloseDate,
            CloseReason = dto.CloseReason,
            LastContactedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        lead.Score = _automationService.CalculateDealScore(lead, 14);

        await _unitOfWork.Leads.AddAsync(lead);
        await _unitOfWork.CompleteAsync();

        var created = await _unitOfWork.Leads.GetLeadWithActivitiesAsync(lead.Id, orgId);
        return MapToDto(created ?? lead, 14);
    }

    public async Task<LeadDto?> UpdateLeadAsync(Guid id, UpdateLeadDto dto, Guid orgId)
    {
        var lead = await _unitOfWork.Leads.GetLeadWithActivitiesAsync(id, orgId);
        if (lead == null) return null;

        // Tenant boundary validation on assignee
        if (dto.AssignedToUserId.HasValue && dto.AssignedToUserId != lead.AssignedToUserId)
        {
            var assignedUser = await _unitOfWork.Users.GetByIdAsync(dto.AssignedToUserId.Value);
            if (assignedUser == null || assignedUser.OrganizationId != orgId)
            {
                throw new InvalidOperationException("Assigned representative does not belong to your organization.");
            }
        }

        // Automatic activity log if status changed
        if (lead.Status != dto.Status)
        {
            var statusLog = new ActivityLog
            {
                LeadId = lead.Id,
                UserId = lead.AssignedToUserId ?? Guid.Empty,
                Type = ActivityType.Note,
                Details = $"Pipeline status changed from '{lead.Status}' to '{dto.Status}'.{(string.IsNullOrWhiteSpace(dto.CloseReason) ? "" : $" Reason: {dto.CloseReason}")}",
                CreatedAt = DateTime.UtcNow
            };
            if (statusLog.UserId != Guid.Empty)
            {
                await _unitOfWork.ActivityLogs.AddAsync(statusLog);
            }

            // Automated Contact creation if deal marked Won
            if (dto.Status == LeadStatus.Won && lead.Status != LeadStatus.Won)
            {
                await _automationService.AutoSyncContactOnDealWonAsync(lead, orgId);
            }
        }

        lead.FirstName = dto.FirstName.Trim();
        lead.LastName = dto.LastName.Trim();
        lead.Email = dto.Email.Trim();
        lead.Phone = dto.Phone?.Trim() ?? string.Empty;
        lead.CompanyName = dto.CompanyName.Trim();
        lead.EstimatedValue = dto.EstimatedValue;
        lead.Status = dto.Status;
        lead.Source = dto.Source.Trim();
        lead.AssignedToUserId = dto.AssignedToUserId;
        lead.ExpectedCloseDate = dto.ExpectedCloseDate;
        lead.CloseReason = dto.CloseReason;
        lead.UpdatedAt = DateTime.UtcNow;

        var org = await _unitOfWork.Organizations.GetByIdAsync(orgId);
        var threshold = org?.StaleDealThresholdDays ?? 14;
        lead.Score = _automationService.CalculateDealScore(lead, threshold);

        _unitOfWork.Leads.Update(lead);
        await _unitOfWork.CompleteAsync();

        return MapToDto(lead, threshold);
    }

    public async Task<bool> DeleteLeadAsync(Guid id, Guid orgId)
    {
        var lead = await _unitOfWork.Leads.GetByIdAsync(id);
        if (lead == null || lead.OrganizationId != orgId) return false;

        // Soft delete
        lead.IsDeleted = true;
        lead.DeletedAt = DateTime.UtcNow;
        _unitOfWork.Leads.Update(lead);

        var result = await _unitOfWork.CompleteAsync();
        return result > 0;
    }

    public async Task<IEnumerable<ActivityLogDto>> GetActivitiesAsync(Guid leadId, Guid orgId)
    {
        var activities = await _unitOfWork.ActivityLogs.GetActivitiesByLeadAsync(leadId, orgId);
        return activities.Select(MapActivityToDto);
    }

    public async Task<ActivityLogDto> AddActivityAsync(Guid leadId, CreateActivityLogDto dto, Guid userId, Guid orgId)
    {
        var lead = await _unitOfWork.Leads.GetByIdAsync(leadId);
        if (lead == null || lead.OrganizationId != orgId)
        {
            throw new UnauthorizedAccessException("Lead does not belong to the user's organization.");
        }

        var activity = new ActivityLog
        {
            LeadId = leadId,
            UserId = userId,
            Type = dto.Type,
            Details = dto.Details,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.ActivityLogs.AddAsync(activity);

        // Update lead's last contacted date and recalculate score
        lead.LastContactedAt = DateTime.UtcNow;
        lead.Score = _automationService.CalculateDealScore(lead, 14);
        _unitOfWork.Leads.Update(lead);

        await _unitOfWork.CompleteAsync();

        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        return new ActivityLogDto(
            Id: activity.Id,
            LeadId: activity.LeadId,
            ContactId: activity.ContactId,
            UserId: activity.UserId,
            UserName: user != null ? $"{user.FirstName} {user.LastName}" : "Unknown User",
            Type: activity.Type,
            Details: activity.Details,
            CreatedAt: activity.CreatedAt
        );
    }

    public async Task<ActivityLogDto> SendEmailAsync(Guid leadId, SendEmailDto dto, Guid userId, Guid orgId)
    {
        var lead = await _unitOfWork.Leads.GetByIdAsync(leadId);
        if (lead == null || lead.OrganizationId != orgId)
        {
            throw new KeyNotFoundException("Lead not found or does not belong to your organization.");
        }

        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        var senderName = user != null ? $"{user.FirstName} {user.LastName}" : "AeroCRM Representative";

        var sent = await _emailService.SendEmailAsync(dto.RecipientEmail, dto.Subject, dto.Body, senderName);
        if (!sent)
        {
            throw new InvalidOperationException("Failed to dispatch email to recipient.");
        }

        var activity = new ActivityLog
        {
            LeadId = leadId,
            UserId = userId,
            Type = ActivityType.Email,
            Details = $"[Subject: {dto.Subject}]\n\n{dto.Body}",
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.ActivityLogs.AddAsync(activity);

        lead.LastContactedAt = DateTime.UtcNow;
        lead.Score = _automationService.CalculateDealScore(lead, 14);
        _unitOfWork.Leads.Update(lead);

        await _unitOfWork.CompleteAsync();

        return new ActivityLogDto(
            Id: activity.Id,
            LeadId: activity.LeadId,
            ContactId: activity.ContactId,
            UserId: activity.UserId,
            UserName: senderName,
            Type: activity.Type,
            Details: activity.Details,
            CreatedAt: activity.CreatedAt
        );
    }

    public async Task<byte[]> ExportLeadsCsvAsync(Guid orgId)
    {
        var leads = await _unitOfWork.Leads.GetLeadsByOrganizationAsync(orgId);
        var sb = new StringBuilder();
        sb.AppendLine("First Name,Last Name,Email,Phone,Company Name,Estimated Value,Status,Source,Assignee,Score,Expected Close Date,Close Reason,Created At");

        foreach (var l in leads)
        {
            var assignee = l.AssignedToUser != null ? $"{l.AssignedToUser.FirstName} {l.AssignedToUser.LastName}" : "Unassigned";
            var expDate = l.ExpectedCloseDate?.ToString("yyyy-MM-dd") ?? "";
            var closeReason = EscapeCsv(l.CloseReason ?? "");
            sb.AppendLine($"{EscapeCsv(l.FirstName)},{EscapeCsv(l.LastName)},{EscapeCsv(l.Email)},{EscapeCsv(l.Phone)},{EscapeCsv(l.CompanyName)},{l.EstimatedValue},{l.Status},{EscapeCsv(l.Source)},{EscapeCsv(assignee)},{l.Score},{expDate},{closeReason},{l.CreatedAt:yyyy-MM-dd HH:mm}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<ImportCsvResultDto> ImportLeadsCsvAsync(Stream csvStream, Guid orgId, Guid userId)
    {
        using var reader = new StreamReader(csvStream, Encoding.UTF8);
        var errors = new List<string>();
        int totalProcessed = 0;
        int importedCount = 0;

        string? headerLine = await reader.ReadLineAsync();
        if (headerLine == null)
        {
            return new ImportCsvResultDto(0, 0, 0, new List<string> { "CSV file is empty." });
        }

        var org = await _unitOfWork.Organizations.GetByIdAsync(orgId);

        int lineNum = 1;
        while (!reader.EndOfStream)
        {
            lineNum++;
            var line = await reader.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(line)) continue;

            totalProcessed++;
            var columns = ParseCsvLine(line);

            if (columns.Length < 3)
            {
                errors.Add($"Line {lineNum}: Insufficient columns. Minimum required: First Name, Last Name, Email.");
                continue;
            }

            var firstName = columns[0].Trim();
            var lastName = columns.Length > 1 ? columns[1].Trim() : "";
            var email = columns.Length > 2 ? columns[2].Trim() : "";
            var phone = columns.Length > 3 ? columns[3].Trim() : "";
            var company = columns.Length > 4 ? columns[4].Trim() : "Direct Client";
            var valueStr = columns.Length > 5 ? columns[5].Trim() : "0";
            var statusStr = columns.Length > 6 ? columns[6].Trim() : "New";
            var source = columns.Length > 7 ? columns[7].Trim() : "Imported";

            if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(email))
            {
                errors.Add($"Line {lineNum}: First name and email are mandatory.");
                continue;
            }

            decimal.TryParse(valueStr.Replace("$", "").Replace(",", ""), out var value);
            if (!Enum.TryParse<LeadStatus>(statusStr, true, out var status))
            {
                status = LeadStatus.New;
            }

            Guid? assignee = userId;
            if (org != null && org.AutoAssignRoundRobin)
            {
                assignee = await _automationService.GetNextRoundRobinAgentIdAsync(orgId) ?? userId;
            }

            var lead = new Lead
            {
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                Phone = phone,
                CompanyName = string.IsNullOrWhiteSpace(company) ? "Direct Client" : company,
                EstimatedValue = value,
                Status = status,
                Source = string.IsNullOrWhiteSpace(source) ? "Imported" : source,
                OrganizationId = orgId,
                AssignedToUserId = assignee,
                LastContactedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            lead.Score = _automationService.CalculateDealScore(lead, org?.StaleDealThresholdDays ?? 14);

            await _unitOfWork.Leads.AddAsync(lead);
            importedCount++;
        }

        if (importedCount > 0)
        {
            await _unitOfWork.CompleteAsync();
        }

        return new ImportCsvResultDto(totalProcessed, importedCount, totalProcessed - importedCount, errors);
    }

    private static string EscapeCsv(string field)
    {
        if (string.IsNullOrEmpty(field)) return "";
        if (field.Contains(",") || field.Contains("\"") || field.Contains("\n") || field.Contains("\r"))
        {
            return $"\"{field.Replace("\"", "\"\"")}\"";
        }
        return field;
    }

    private static string[] ParseCsvLine(string line)
    {
        var values = new List<string>();
        var sb = new StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '\"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '\"')
                {
                    sb.Append('\"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                values.Add(sb.ToString());
                sb.Clear();
            }
            else
            {
                sb.Append(c);
            }
        }
        values.Add(sb.ToString());
        return values.ToArray();
    }

    private static LeadDto MapToDto(Lead lead, int staleThresholdDays)
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

    private static ActivityLogDto MapActivityToDto(ActivityLog log)
    {
        var userName = log.User != null 
            ? $"{log.User.FirstName} {log.User.LastName}" 
            : "Unknown User";

        return new ActivityLogDto(
            Id: log.Id,
            LeadId: log.LeadId,
            ContactId: log.ContactId,
            UserId: log.UserId,
            UserName: userName,
            Type: log.Type,
            Details: log.Details,
            CreatedAt: log.CreatedAt
        );
    }
}
