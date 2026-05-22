using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CRM.Model.DTOs;

namespace CRM.Business.Services;

public interface IContactService
{
    Task<IEnumerable<ContactDto>> GetContactsAsync(Guid orgId);
    Task<ContactDto?> GetContactByIdAsync(Guid id, Guid orgId);
    Task<ContactDto> CreateContactAsync(CreateContactDto dto, Guid orgId);
    Task<ContactDto?> UpdateContactAsync(Guid id, UpdateContactDto dto, Guid orgId);
    Task<bool> DeleteContactAsync(Guid id, Guid orgId);
}
