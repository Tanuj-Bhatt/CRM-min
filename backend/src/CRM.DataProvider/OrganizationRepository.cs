using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CRM.IDataProvider;
using CRM.Model.Entities;

namespace CRM.DataProvider;

public class OrganizationRepository : Repository<Organization>, IOrganizationRepository
{
    private CRMContext CRMContext => (CRMContext)Context;

    public OrganizationRepository(CRMContext context) : base(context)
    {
    }

    public async Task<bool> ExistsByNameAsync(string name)
    {
        return await CRMContext.Organizations
            .AnyAsync(o => o.Name.ToLower() == name.ToLower());
    }
}
