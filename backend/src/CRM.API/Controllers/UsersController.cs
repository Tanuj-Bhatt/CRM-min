using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CRM.Business.Security;
using CRM.Business.Services;
using CRM.IDataProvider;
using CRM.Model.DTOs;
using CRM.Model.Entities;

namespace CRM.API.Controllers;

[Authorize(Roles = "Admin,Manager")]
[Route("api/[controller]")]
public class UsersController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;

    public UsersController(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var orgId = GetOrganizationId();
        var users = await _unitOfWork.Users.GetUsersByOrganizationAsync(orgId);
        var dtos = users.Select(u => new UserDto(
            u.Id, u.Email, u.FirstName, u.LastName, u.Role, u.CreatedAt
        ));
        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var orgId = GetOrganizationId();
        var user = await _unitOfWork.Users.GetByIdAsync(id);
        if (user == null || user.OrganizationId != orgId)
            return NotFound(new { message = "User not found." });

        return Ok(new UserDto(
            user.Id, user.Email, user.FirstName, user.LastName, user.Role, user.CreatedAt
        ));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        var orgId = GetOrganizationId();

        // Check if email already exists
        var existingUser = await _unitOfWork.Users.GetByEmailAsync(dto.Email);
        if (existingUser != null)
            return BadRequest(new { message = "A user with this email already exists." });

        var user = new User
        {
            Email = dto.Email,
            PasswordHash = _passwordHasher.HashPassword(dto.Password),
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Role = dto.Role,
            OrganizationId = orgId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Users.AddAsync(user);
        await _unitOfWork.CompleteAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id },
            new UserDto(user.Id, user.Email, user.FirstName, user.LastName, user.Role, user.CreatedAt));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var orgId = GetOrganizationId();
        var user = await _unitOfWork.Users.GetByIdAsync(id);
        if (user == null || user.OrganizationId != orgId)
            return NotFound(new { message = "User not found." });

        // Prevent deleting yourself
        if (user.Id == GetUserId())
            return BadRequest(new { message = "You cannot delete your own account." });

        _unitOfWork.Users.Remove(user);
        await _unitOfWork.CompleteAsync();

        return NoContent();
    }
}
