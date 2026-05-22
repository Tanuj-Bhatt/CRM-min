using System.Threading.Tasks;
using CRM.Model.Entities;

namespace CRM.IDataProvider;

public interface IOrganizationRepository : IRepository<Organization>
{
    Task<bool> ExistsByNameAsync(string name);
}
