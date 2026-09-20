using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CRM.Business.Services;
using CRM.Model.DTOs;

namespace CRM.API.Controllers;

[Route("api/[controller]")]
public class AutomationsController : BaseApiController
{
    private readonly IAutomationService _automationService;

    public AutomationsController(IAutomationService automationService)
    {
        _automationService = automationService;
    }

    [Authorize]
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var orgId = GetOrganizationId();
        var host = $"{Request.Scheme}://{Request.Host}";
        var settings = await _automationService.GetSettingsAsync(orgId, host);
        return Ok(settings);
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateAutomationSettingsDto dto)
    {
        var orgId = GetOrganizationId();
        var host = $"{Request.Scheme}://{Request.Host}";
        var updated = await _automationService.UpdateSettingsAsync(orgId, dto, host);
        return Ok(updated);
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpPost("regenerate-key")]
    public async Task<IActionResult> RegenerateKey()
    {
        var orgId = GetOrganizationId();
        var newKey = await _automationService.RegenerateApiKeyAsync(orgId);
        return Ok(new { apiKey = newKey, message = "Webhook API key regenerated successfully." });
    }

    /// <summary>
    /// Public webhook endpoint for inbound lead capture (Website forms, Landing pages, Zapier, Webflow)
    /// Protected via ?apiKey={key} or X-AeroCRM-ApiKey header.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("capture")]
    public async Task<IActionResult> CaptureLead(
        [FromBody] WebhookLeadDto dto,
        [FromQuery] string? apiKey)
    {
        if (string.IsNullOrWhiteSpace(dto.FirstName) || string.IsNullOrWhiteSpace(dto.Email))
        {
            return BadRequest(new { message = "First name and email are required to capture an inbound lead." });
        }

        var key = apiKey ?? Request.Headers["X-AeroCRM-ApiKey"].ToString();
        if (string.IsNullOrWhiteSpace(key))
        {
            return Unauthorized(new { message = "Missing Webhook API key in query or X-AeroCRM-ApiKey header." });
        }

        try
        {
            var created = await _automationService.CaptureInboundLeadAsync(dto, key);
            return StatusCode(201, new { message = "Inbound lead captured successfully.", lead = created });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
