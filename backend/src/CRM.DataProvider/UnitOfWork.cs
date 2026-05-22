using System.Threading.Tasks;
using CRM.IDataProvider;

namespace CRM.DataProvider;

public class UnitOfWork : IUnitOfWork
{
    private readonly CRMContext _context;

    public ILeadRepository Leads { get; }
    public IContactRepository Contacts { get; }
    public IUserRepository Users { get; }
    public IOrganizationRepository Organizations { get; }
    public IActivityLogRepository ActivityLogs { get; }

    public UnitOfWork(CRMContext context)
    {
        _context = context;
        Leads = new LeadRepository(_context);
        Contacts = new ContactRepository(_context);
        Users = new UserRepository(_context);
        Organizations = new OrganizationRepository(_context);
        ActivityLogs = new ActivityLogRepository(_context);
    }

    public async Task<int> CompleteAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
