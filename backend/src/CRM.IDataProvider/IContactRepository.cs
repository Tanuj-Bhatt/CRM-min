using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CRM.Model.Entities;

namespace CRM.IDataProvider;

public interface IContactRepository : IRepository<Contact>
{
    Task<IEnumerable<Contact>> GetContactsByOrganizationAsync(Guid orgId);
    Task<(IEnumerable<Contact> Items, int TotalCount)> GetPagedContactsAsync(
        Guid orgId,
        int page,
        int pageSize,
        string? search = null);
}
