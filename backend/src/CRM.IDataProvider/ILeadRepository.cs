using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CRM.Model.Entities;

namespace CRM.IDataProvider;

public interface ILeadRepository : IRepository<Lead>
{
    Task<IEnumerable<Lead>> GetLeadsByOrganizationAsync(Guid orgId);
    Task<Lead?> GetLeadWithActivitiesAsync(Guid id, Guid orgId);
}
