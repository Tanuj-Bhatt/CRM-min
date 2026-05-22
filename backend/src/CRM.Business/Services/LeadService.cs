using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CRM.IDataProvider;
using CRM.Model.DTOs;
using CRM.Model.Entities;
using CRM.Model.Enums;

namespace CRM.Business.Services;

public class LeadService : ILeadService
{
    private readonly IUnitOfWork _unitOfWork;

    public LeadService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<LeadDto>> GetLeadsAsync(Guid orgId)
    {
        var leads = await _unitOfWork.Leads.GetLeadsByOrganizationAsync(orgId);
        return leads.Select(MapToDto);
    }

    public async Task<LeadDto?> GetLeadByIdAsync(Guid id, Guid orgId)
    {
        var lead = await _unitOfWork.Leads.GetLeadWithActivitiesAsync(id, orgId);
        if (lead == null) return null;
        return MapToDto(lead);
    }

    public async Task<LeadDto> CreateLeadAsync(CreateLeadDto dto, Guid orgId)
    {
        var lead = new Lead
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            CompanyName = dto.CompanyName,
            EstimatedValue = dto.EstimatedValue,
            Status = dto.Status,
            Source = dto.Source,
            OrganizationId = orgId,
            AssignedToUserId = dto.AssignedToUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Leads.AddAsync(lead);
        await _unitOfWork.CompleteAsync();

        var created = await _unitOfWork.Leads.GetLeadWithActivitiesAsync(lead.Id, orgId);
        return MapToDto(created ?? lead);
    }

    public async Task<LeadDto?> UpdateLeadAsync(Guid id, UpdateLeadDto dto, Guid orgId)
    {
        var lead = await _unitOfWork.Leads.GetLeadWithActivitiesAsync(id, orgId);
        if (lead == null) return null;

        lead.FirstName = dto.FirstName;
        lead.LastName = dto.LastName;
        lead.Email = dto.Email;
        lead.Phone = dto.Phone;
        lead.CompanyName = dto.CompanyName;
        lead.EstimatedValue = dto.EstimatedValue;
        lead.Status = dto.Status;
        lead.Source = dto.Source;
        lead.AssignedToUserId = dto.AssignedToUserId;
        lead.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Leads.Update(lead);
        await _unitOfWork.CompleteAsync();

        return MapToDto(lead);
    }

    public async Task<bool> DeleteLeadAsync(Guid id, Guid orgId)
    {
        var lead = await _unitOfWork.Leads.GetByIdAsync(id);
        if (lead == null || lead.OrganizationId != orgId) return false;

        _unitOfWork.Leads.Remove(lead);
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

    private static LeadDto MapToDto(Lead lead)
    {
        var assignedName = lead.AssignedToUser != null 
            ? $"{lead.AssignedToUser.FirstName} {lead.AssignedToUser.LastName}" 
            : null;

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
