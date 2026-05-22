using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace CRM.API.Controllers;

[ApiController]
public abstract class BaseApiController : ControllerBase
{
    protected Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }

    protected Guid GetOrganizationId()
    {
        var orgClaim = User.FindFirstValue("OrganizationId");
        return Guid.TryParse(orgClaim, out var id) ? id : Guid.Empty;
    }

    protected string GetUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role) ?? "Agent";
    }
}
