using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CRM.Model.Entities;

namespace CRM.IDataProvider;

public interface ILeadRepository : IRepository<Lead>
{
    Task<IEnumerable<Lead>> GetLeadsByOrganizationAsync(Guid orgId);
    Task<Lead?> GetLeadWithActivitiesAsync(Guid id, Guid orgId);
    Task<(IEnumerable<Lead> Items, int TotalCount)> GetPagedLeadsAsync(
        Guid orgId, 
        int page, 
        int pageSize, 
        string? search = null, 
        CRM.Model.Enums.LeadStatus? status = null, 
        string? source = null);
}
