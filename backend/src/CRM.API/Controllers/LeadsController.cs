using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using CRM.Business.Services;
using CRM.Model.DTOs;
using CRM.Model.Enums;

namespace CRM.API.Controllers;

[Authorize]
[Route("api/[controller]")]
public class LeadsController : BaseApiController
{
    private readonly ILeadService _leadService;
    private readonly IClaudeService _claudeService;

    public LeadsController(ILeadService leadService, IClaudeService claudeService)
    {
        _leadService = leadService;
        _claudeService = claudeService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var orgId = GetOrganizationId();
        var leads = await _leadService.GetLeadsAsync(orgId);
        return Ok(leads);
    }

    [HttpGet("paged")]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] LeadStatus? status = null,
        [FromQuery] string? source = null)
    {
        var orgId = GetOrganizationId();
        var paged = await _leadService.GetPagedLeadsAsync(orgId, page, pageSize, search, status, source);
        return Ok(paged);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var orgId = GetOrganizationId();
        var lead = await _leadService.GetLeadByIdAsync(id, orgId);
        if (lead == null) return NotFound(new { message = "Lead not found." });
        return Ok(lead);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLeadDto dto)
    {
        var orgId = GetOrganizationId();
        try
        {
            var lead = await _leadService.CreateLeadAsync(dto, orgId);
            return CreatedAtAction(nameof(GetById), new { id = lead.Id }, lead);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateLeadDto dto)
    {
        var orgId = GetOrganizationId();
        try
        {
            var lead = await _leadService.UpdateLeadAsync(id, dto, orgId);
            if (lead == null) return NotFound(new { message = "Lead not found." });
            return Ok(lead);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var orgId = GetOrganizationId();
        var success = await _leadService.DeleteLeadAsync(id, orgId);
        if (!success) return NotFound(new { message = "Lead not found." });
        return NoContent();
    }

    // ---- CSV Import & Export ----

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv()
    {
        var orgId = GetOrganizationId();
        var bytes = await _leadService.ExportLeadsCsvAsync(orgId);
        return File(bytes, "text/csv", $"aerocrm_leads_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpPost("import/csv")]
    public async Task<IActionResult> ImportCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Please upload a valid non-empty CSV file." });
        }

        var orgId = GetOrganizationId();
        var userId = GetUserId();

        using var stream = file.OpenReadStream();
        var result = await _leadService.ImportLeadsCsvAsync(stream, orgId, userId);
        return Ok(result);
    }

    // ---- Email Dispatch Studio ----

    [HttpPost("{id}/send-email")]
    public async Task<IActionResult> SendEmail(Guid id, [FromBody] SendEmailDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RecipientEmail) || string.IsNullOrWhiteSpace(dto.Subject) || string.IsNullOrWhiteSpace(dto.Body))
        {
            return BadRequest(new { message = "Recipient email, subject, and email body are required." });
        }

        var orgId = GetOrganizationId();
        var userId = GetUserId();

        try
        {
            var activity = await _leadService.SendEmailAsync(id, dto, userId, orgId);
            return Ok(new { message = "Email dispatched successfully.", activity });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // ---- Activity Logs ----

    [HttpGet("{id}/activities")]
    public async Task<IActionResult> GetActivities(Guid id)
    {
        var orgId = GetOrganizationId();
        var activities = await _leadService.GetActivitiesAsync(id, orgId);
        return Ok(activities);
    }

    [HttpPost("{id}/activities")]
    public async Task<IActionResult> AddActivity(Guid id, [FromBody] CreateActivityLogDto dto)
    {
        var orgId = GetOrganizationId();
        var userId = GetUserId();
        var activity = await _leadService.AddActivityAsync(id, dto, userId, orgId);
        return Ok(activity);
    }

    // ---- Claude AI Endpoints ----

    [HttpGet("{id}/ai-summary")]
    public async Task<IActionResult> GetAISummary(Guid id)
    {
        var orgId = GetOrganizationId();
        var summary = await _claudeService.SummarizeLeadActivitiesAsync(id, orgId);
        return Ok(new { summary });
    }

    [HttpGet("{id}/draft-email")]
    public async Task<IActionResult> DraftEmail(Guid id)
    {
        var orgId = GetOrganizationId();
        var email = await _claudeService.DraftFollowUpEmailAsync(id, orgId);
        return Ok(new { email });
    }
}
