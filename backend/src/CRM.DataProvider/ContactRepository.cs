using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CRM.IDataProvider;
using CRM.Model.Entities;

namespace CRM.DataProvider;

public class ContactRepository : Repository<Contact>, IContactRepository
{
    private CRMContext CRMContext => (CRMContext)Context;

    public ContactRepository(CRMContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Contact>> GetContactsByOrganizationAsync(Guid orgId)
    {
        return await CRMContext.Contacts
            .Where(c => c.OrganizationId == orgId)
            .OrderBy(c => c.LastName)
            .ThenBy(c => c.FirstName)
            .ToListAsync();
    }
}
