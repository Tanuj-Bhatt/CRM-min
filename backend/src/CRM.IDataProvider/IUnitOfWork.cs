using System;
using System.Threading.Tasks;

namespace CRM.IDataProvider;

public interface IUnitOfWork : IDisposable
{
    ILeadRepository Leads { get; }
    IContactRepository Contacts { get; }
    IUserRepository Users { get; }
    IOrganizationRepository Organizations { get; }
    IActivityLogRepository ActivityLogs { get; }
    Task<int> CompleteAsync();
}
