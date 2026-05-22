using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CRM.Model.Entities;

namespace CRM.IDataProvider;

public interface IContactRepository : IRepository<Contact>
{
    Task<IEnumerable<Contact>> GetContactsByOrganizationAsync(Guid orgId);
}
