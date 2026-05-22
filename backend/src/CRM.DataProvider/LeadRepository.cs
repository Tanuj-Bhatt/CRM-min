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
}
