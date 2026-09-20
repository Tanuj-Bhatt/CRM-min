using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using CRM.Business.Services;
using CRM.Model.DTOs;

namespace CRM.API.Controllers;

[Authorize]
[Route("api/[controller]")]
public class ContactsController : BaseApiController
{
    private readonly IContactService _contactService;

    public ContactsController(IContactService contactService)
    {
        _contactService = contactService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var orgId = GetOrganizationId();
        var contacts = await _contactService.GetContactsAsync(orgId);
        return Ok(contacts);
    }

    [HttpGet("paged")]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        var orgId = GetOrganizationId();
        var paged = await _contactService.GetPagedContactsAsync(orgId, page, pageSize, search);
        return Ok(paged);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var orgId = GetOrganizationId();
        var contact = await _contactService.GetContactByIdAsync(id, orgId);
        if (contact == null) return NotFound(new { message = "Contact not found." });
        return Ok(contact);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateContactDto dto)
    {
        var orgId = GetOrganizationId();
        var contact = await _contactService.CreateContactAsync(dto, orgId);
        return CreatedAtAction(nameof(GetById), new { id = contact.Id }, contact);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateContactDto dto)
    {
        var orgId = GetOrganizationId();
        var contact = await _contactService.UpdateContactAsync(id, dto, orgId);
        if (contact == null) return NotFound(new { message = "Contact not found." });
        return Ok(contact);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var orgId = GetOrganizationId();
        var success = await _contactService.DeleteContactAsync(id, orgId);
        if (!success) return NotFound(new { message = "Contact not found." });
        return NoContent();
    }

    // ---- CSV Import & Export ----

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv()
    {
        var orgId = GetOrganizationId();
        var bytes = await _contactService.ExportContactsCsvAsync(orgId);
        return File(bytes, "text/csv", $"aerocrm_contacts_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpPost("import/csv")]
    public async Task<IActionResult> ImportCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Please upload a valid non-empty CSV file." });
        }

        var orgId = GetOrganizationId();
        using var stream = file.OpenReadStream();
        var result = await _contactService.ImportContactsCsvAsync(stream, orgId);
        return Ok(result);
    }
}
