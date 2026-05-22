using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CRM.IDataProvider;
using CRM.Model.DTOs;
using CRM.Model.Entities;

namespace CRM.Business.Services;

public class ContactService : IContactService
{
    private readonly IUnitOfWork _unitOfWork;

    public ContactService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<ContactDto>> GetContactsAsync(Guid orgId)
    {
        var contacts = await _unitOfWork.Contacts.GetContactsByOrganizationAsync(orgId);
        return contacts.Select(MapToDto);
    }

    public async Task<ContactDto?> GetContactByIdAsync(Guid id, Guid orgId)
    {
        var contact = await _unitOfWork.Contacts.GetByIdAsync(id);
        if (contact == null || contact.OrganizationId != orgId) return null;
        return MapToDto(contact);
    }

    public async Task<ContactDto> CreateContactAsync(CreateContactDto dto, Guid orgId)
    {
        var contact = new Contact
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            JobTitle = dto.JobTitle,
            CompanyName = dto.CompanyName,
            OrganizationId = orgId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Contacts.AddAsync(contact);
        await _unitOfWork.CompleteAsync();

        return MapToDto(contact);
    }

    public async Task<ContactDto?> UpdateContactAsync(Guid id, UpdateContactDto dto, Guid orgId)
    {
        var contact = await _unitOfWork.Contacts.GetByIdAsync(id);
        if (contact == null || contact.OrganizationId != orgId) return null;

        contact.FirstName = dto.FirstName;
        contact.LastName = dto.LastName;
        contact.Email = dto.Email;
        contact.Phone = dto.Phone;
        contact.JobTitle = dto.JobTitle;
        contact.CompanyName = dto.CompanyName;
        contact.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Contacts.Update(contact);
        await _unitOfWork.CompleteAsync();

        return MapToDto(contact);
    }

    public async Task<bool> DeleteContactAsync(Guid id, Guid orgId)
    {
        var contact = await _unitOfWork.Contacts.GetByIdAsync(id);
        if (contact == null || contact.OrganizationId != orgId) return false;

        _unitOfWork.Contacts.Remove(contact);
        var result = await _unitOfWork.CompleteAsync();
        return result > 0;
    }

    private static ContactDto MapToDto(Contact contact)
    {
        return new ContactDto(
            Id: contact.Id,
            FirstName: contact.FirstName,
            LastName: contact.LastName,
            Email: contact.Email,
            Phone: contact.Phone,
            JobTitle: contact.JobTitle,
            CompanyName: contact.CompanyName,
            CreatedAt: contact.CreatedAt,
            UpdatedAt: contact.UpdatedAt
        );
    }
}
