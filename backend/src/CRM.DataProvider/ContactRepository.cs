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

    public async Task<(IEnumerable<Contact> Items, int TotalCount)> GetPagedContactsAsync(
        Guid orgId,
        int page,
        int pageSize,
        string? search = null)
    {
        var query = CRMContext.Contacts
            .Where(c => c.OrganizationId == orgId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower().Trim();
            query = query.Where(c =>
                c.FirstName.ToLower().Contains(s) ||
                c.LastName.ToLower().Contains(s) ||
                c.CompanyName.ToLower().Contains(s) ||
                c.Email.ToLower().Contains(s) ||
                (c.Phone != null && c.Phone.ToLower().Contains(s)) ||
                (c.JobTitle != null && c.JobTitle.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(c => c.LastName)
            .ThenBy(c => c.FirstName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}
