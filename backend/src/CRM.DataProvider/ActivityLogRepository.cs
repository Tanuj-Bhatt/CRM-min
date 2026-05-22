using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CRM.IDataProvider;
using CRM.Model.Entities;

namespace CRM.DataProvider;

public class ActivityLogRepository : Repository<ActivityLog>, IActivityLogRepository
{
    private CRMContext CRMContext => (CRMContext)Context;

    public ActivityLogRepository(CRMContext context) : base(context)
    {
    }

    public async Task<IEnumerable<ActivityLog>> GetActivitiesByLeadAsync(Guid leadId, Guid orgId)
    {
        return await CRMContext.ActivityLogs
            .Include(a => a.User)
            .Where(a => a.LeadId == leadId && a.Lead!.OrganizationId == orgId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ActivityLog>> GetRecentActivitiesByOrganizationAsync(Guid orgId, int count)
    {
        return await CRMContext.ActivityLogs
            .Include(a => a.User)
            .Include(a => a.Lead)
            .Include(a => a.Contact)
            .Where(a => (a.Lead != null && a.Lead.OrganizationId == orgId) || (a.Contact != null && a.Contact.OrganizationId == orgId))
            .OrderByDescending(a => a.CreatedAt)
            .Take(count)
            .ToListAsync();
    }
}
