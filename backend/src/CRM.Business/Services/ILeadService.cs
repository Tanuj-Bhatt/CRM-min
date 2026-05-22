using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CRM.Model.DTOs;

namespace CRM.Business.Services;

public interface ILeadService
{
    Task<IEnumerable<LeadDto>> GetLeadsAsync(Guid orgId);
    Task<LeadDto?> GetLeadByIdAsync(Guid id, Guid orgId);
    Task<LeadDto> CreateLeadAsync(CreateLeadDto dto, Guid orgId);
    Task<LeadDto?> UpdateLeadAsync(Guid id, UpdateLeadDto dto, Guid orgId);
    Task<bool> DeleteLeadAsync(Guid id, Guid orgId);
    Task<IEnumerable<ActivityLogDto>> GetActivitiesAsync(Guid leadId, Guid orgId);
    Task<ActivityLogDto> AddActivityAsync(Guid leadId, CreateActivityLogDto dto, Guid userId, Guid orgId);
}
