using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CRM.Model.Entities;

namespace CRM.IDataProvider;

public interface IActivityLogRepository : IRepository<ActivityLog>
{
    Task<IEnumerable<ActivityLog>> GetActivitiesByLeadAsync(Guid leadId, Guid orgId);
    Task<IEnumerable<ActivityLog>> GetRecentActivitiesByOrganizationAsync(Guid orgId, int count);
}
