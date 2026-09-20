using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CRM.IDataProvider;
using CRM.Model.Entities;

namespace CRM.DataProvider;

public class LeadRepository : Repository<Lead>, ILeadRepository
{
    private CRMContext CRMContext => (CRMContext)Context;

    public LeadRepository(CRMContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Lead>> GetLeadsByOrganizationAsync(Guid orgId)
    {
        return await CRMContext.Leads
            .Include(l => l.AssignedToUser)
            .Where(l => l.OrganizationId == orgId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();
    }

    public async Task<Lead?> GetLeadWithActivitiesAsync(Guid id, Guid orgId)
    {
        return await CRMContext.Leads
            .Include(l => l.AssignedToUser)
            .Include(l => l.Activities)
                .ThenInclude(a => a.User)
            .FirstOrDefaultAsync(l => l.Id == id && l.OrganizationId == orgId);
    }

    public async Task<(IEnumerable<Lead> Items, int TotalCount)> GetPagedLeadsAsync(
        Guid orgId, 
        int page, 
        int pageSize, 
        string? search = null, 
        CRM.Model.Enums.LeadStatus? status = null, 
        string? source = null)
    {
        var query = CRMContext.Leads
            .Include(l => l.AssignedToUser)
            .Where(l => l.OrganizationId == orgId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower().Trim();
            query = query.Where(l =>
                l.FirstName.ToLower().Contains(s) ||
                l.LastName.ToLower().Contains(s) ||
                l.CompanyName.ToLower().Contains(s) ||
                l.Email.ToLower().Contains(s) ||
                (l.Phone != null && l.Phone.ToLower().Contains(s)));
        }

        if (status.HasValue)
        {
            query = query.Where(l => l.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(source))
        {
            query = query.Where(l => l.Source == source);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}
