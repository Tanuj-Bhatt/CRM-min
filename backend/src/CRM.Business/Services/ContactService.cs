using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
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

    public async Task<PagedResult<ContactDto>> GetPagedContactsAsync(Guid orgId, int page, int pageSize, string? search)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var (items, totalCount) = await _unitOfWork.Contacts.GetPagedContactsAsync(orgId, page, pageSize, search);
        return new PagedResult<ContactDto>(items.Select(MapToDto), totalCount, page, pageSize);
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
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = dto.Email.Trim(),
            Phone = dto.Phone?.Trim() ?? string.Empty,
            JobTitle = dto.JobTitle?.Trim() ?? string.Empty,
            CompanyName = dto.CompanyName?.Trim() ?? string.Empty,
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

        contact.FirstName = dto.FirstName.Trim();
        contact.LastName = dto.LastName.Trim();
        contact.Email = dto.Email.Trim();
        contact.Phone = dto.Phone?.Trim() ?? string.Empty;
        contact.JobTitle = dto.JobTitle?.Trim() ?? string.Empty;
        contact.CompanyName = dto.CompanyName?.Trim() ?? string.Empty;
        contact.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Contacts.Update(contact);
        await _unitOfWork.CompleteAsync();

        return MapToDto(contact);
    }

    public async Task<bool> DeleteContactAsync(Guid id, Guid orgId)
    {
        var contact = await _unitOfWork.Contacts.GetByIdAsync(id);
        if (contact == null || contact.OrganizationId != orgId) return false;

        // Soft delete
        contact.IsDeleted = true;
        contact.DeletedAt = DateTime.UtcNow;
        _unitOfWork.Contacts.Update(contact);

        var result = await _unitOfWork.CompleteAsync();
        return result > 0;
    }

    public async Task<byte[]> ExportContactsCsvAsync(Guid orgId)
    {
        var contacts = await _unitOfWork.Contacts.GetContactsByOrganizationAsync(orgId);
        var sb = new StringBuilder();
        sb.AppendLine("First Name,Last Name,Email,Phone,Job Title,Company Name,Created At");

        foreach (var c in contacts)
        {
            sb.AppendLine($"{EscapeCsv(c.FirstName)},{EscapeCsv(c.LastName)},{EscapeCsv(c.Email)},{EscapeCsv(c.Phone)},{EscapeCsv(c.JobTitle)},{EscapeCsv(c.CompanyName)},{c.CreatedAt:yyyy-MM-dd HH:mm}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<ImportCsvResultDto> ImportContactsCsvAsync(Stream csvStream, Guid orgId)
    {
        using var reader = new StreamReader(csvStream, Encoding.UTF8);
        var errors = new List<string>();
        int totalProcessed = 0;
        int importedCount = 0;

        string? headerLine = await reader.ReadLineAsync();
        if (headerLine == null)
        {
            return new ImportCsvResultDto(0, 0, 0, new List<string> { "CSV file is empty." });
        }

        int lineNum = 1;
        while (!reader.EndOfStream)
        {
            lineNum++;
            var line = await reader.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(line)) continue;

            totalProcessed++;
            var columns = ParseCsvLine(line);

            if (columns.Length < 3)
            {
                errors.Add($"Line {lineNum}: Minimum required columns: First Name, Last Name, Email.");
                continue;
            }

            var firstName = columns[0].Trim();
            var lastName = columns.Length > 1 ? columns[1].Trim() : "";
            var email = columns.Length > 2 ? columns[2].Trim() : "";
            var phone = columns.Length > 3 ? columns[3].Trim() : "";
            var jobTitle = columns.Length > 4 ? columns[4].Trim() : "";
            var company = columns.Length > 5 ? columns[5].Trim() : "";

            if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(email))
            {
                errors.Add($"Line {lineNum}: First name and email cannot be empty.");
                continue;
            }

            var contact = new Contact
            {
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                Phone = phone,
                JobTitle = jobTitle,
                CompanyName = company,
                OrganizationId = orgId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Contacts.AddAsync(contact);
            importedCount++;
        }

        if (importedCount > 0)
        {
            await _unitOfWork.CompleteAsync();
        }

        return new ImportCsvResultDto(totalProcessed, importedCount, totalProcessed - importedCount, errors);
    }

    private static string EscapeCsv(string field)
    {
        if (string.IsNullOrEmpty(field)) return "";
        if (field.Contains(",") || field.Contains("\"") || field.Contains("\n") || field.Contains("\r"))
        {
            return $"\"{field.Replace("\"", "\"\"")}\"";
        }
        return field;
    }

    private static string[] ParseCsvLine(string line)
    {
        var values = new List<string>();
        var sb = new StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '\"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '\"')
                {
                    sb.Append('\"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                values.Add(sb.ToString());
                sb.Clear();
            }
            else
            {
                sb.Append(c);
            }
        }
        values.Add(sb.ToString());
        return values.ToArray();
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
