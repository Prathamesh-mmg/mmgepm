using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MMG.EPM.API.Data;
using MMG.EPM.API.Domain.DTOs;
using MMG.EPM.API.Infrastructure.Services;

namespace MMG.EPM.API.Controllers;

[ApiController, Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ITokenService       _tokens;
    private readonly ICurrentUserService _cu;
    private readonly AppDbContext        _db;
    private readonly ILogger<AuthController> _logger;

    public AuthController(ITokenService tokens, ICurrentUserService cu, AppDbContext db, ILogger<AuthController> logger)
    { _tokens = tokens; _cu = cu; _db = db; _logger = logger; }

    [HttpPost("login"), AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Email == req.Email.ToLowerInvariant() && !u.IsDeleted);

        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            if (user != null)
            {
                user.FailedLoginAttempts++;
                if (user.FailedLoginAttempts >= 5)
                    user.LockedUntil = DateTime.UtcNow.AddMinutes(30);
                await _db.SaveChangesAsync();
            }
            return Unauthorized(new { message = "Invalid credentials" });
        }

        if (!user.IsActive)
            return Unauthorized(new { message = "Account is inactive" });

        if (user.LockedUntil.HasValue && user.LockedUntil > DateTime.UtcNow)
            return Unauthorized(new { message = "Account is locked. Try again later." });

        // Reset failed attempts
        user.FailedLoginAttempts = 0;
        user.LockedUntil  = null;
        user.LastLoginAt  = DateTime.UtcNow;

        var roles       = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct().ToList();

        var accessToken  = _tokens.GenerateAccessToken(user, roles);
        var refreshToken = _tokens.GenerateRefreshToken();
        user.RefreshToken       = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        var userDto = new UserDto(user.Id, user.FirstName, user.LastName, user.Email,
            user.Phone, user.Department, user.JobTitle, user.IsActive,
            user.LastLoginAt, user.CreatedAt, roles, permissions);

        return Ok(new LoginResponse(accessToken, refreshToken, 3600, userDto));
    }

    [HttpPost("refresh"), AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        var principal = _tokens.ValidateExpiredToken(req.RefreshToken.Length > 200 ? req.RefreshToken : "");
        // Find by refresh token
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.RefreshToken == req.RefreshToken && !u.IsDeleted);

        if (user == null || user.RefreshTokenExpiry < DateTime.UtcNow)
            return Unauthorized(new { message = "Invalid or expired refresh token" });

        var roles       = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var permissions = new List<string>();
        var newAccess   = _tokens.GenerateAccessToken(user, roles);
        var newRefresh  = _tokens.GenerateRefreshToken();
        user.RefreshToken       = newRefresh;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        var userDto = new UserDto(user.Id, user.FirstName, user.LastName, user.Email,
            user.Phone, user.Department, user.JobTitle, user.IsActive,
            user.LastLoginAt, user.CreatedAt, roles, permissions);

        return Ok(new LoginResponse(newAccess, newRefresh, 3600, userDto));
    }

    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout()
    {
        var user = await _db.Users.FindAsync(_cu.UserId);
        if (user != null)
        {
            user.RefreshToken       = null;
            user.RefreshTokenExpiry = null;
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpGet("me"), Authorize]
    public async Task<IActionResult> Me()
    {
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == _cu.UserId && !u.IsDeleted);

        if (user == null) return NotFound();

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var perms  = user.UserRoles.SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code).Distinct().ToList();

        return Ok(new UserDto(user.Id, user.FirstName, user.LastName, user.Email,
            user.Phone, user.Department, user.JobTitle, user.IsActive,
            user.LastLoginAt, user.CreatedAt, roles, perms));
    }

    [HttpPost("change-password"), Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var user = await _db.Users.FindAsync(_cu.UserId);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect" });

        user.PasswordHash      = BCrypt.Net.BCrypt.HashPassword(req.NewPassword, workFactor: 11);
        user.MustChangePassword = false;
        user.UpdatedAt         = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password changed successfully" });
    }
}
