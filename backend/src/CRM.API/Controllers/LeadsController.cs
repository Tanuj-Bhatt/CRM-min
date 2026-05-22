using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CRM.Business.Services;
using CRM.Model.DTOs;

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
        var lead = await _leadService.CreateLeadAsync(dto, orgId);
        return CreatedAtAction(nameof(GetById), new { id = lead.Id }, lead);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateLeadDto dto)
    {
        var orgId = GetOrganizationId();
        var lead = await _leadService.UpdateLeadAsync(id, dto, orgId);
        if (lead == null) return NotFound(new { message = "Lead not found." });
        return Ok(lead);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var orgId = GetOrganizationId();
        var success = await _leadService.DeleteLeadAsync(id, orgId);
        if (!success) return NotFound(new { message = "Lead not found." });
        return NoContent();
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
