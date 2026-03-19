using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MimeKit;
using MMG.EPM.API.Data;
using MMG.EPM.API.Domain.Entities;

namespace MMG.EPM.API.Infrastructure.Services;

// ─── Token Service ──────────────────────────────────────────────────────────

public interface ITokenService
{
    string GenerateAccessToken(User user, IEnumerable<string> roles);
    string GenerateRefreshToken();
    ClaimsPrincipal? ValidateExpiredToken(string token);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _cfg;
    public TokenService(IConfiguration cfg) => _cfg = cfg;

    public string GenerateAccessToken(User user, IEnumerable<string> roles)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new("firstName", user.FirstName),
            new("lastName",  user.LastName),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        var token = new JwtSecurityToken(
            issuer: _cfg["Jwt:Issuer"], audience: _cfg["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(_cfg["Jwt:ExpiryMinutes"] ?? "60")),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    public ClaimsPrincipal? ValidateExpiredToken(string token)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
        try
        {
            return new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true, IssuerSigningKey = key,
                ValidateIssuer = true, ValidIssuer = _cfg["Jwt:Issuer"],
                ValidateAudience = true, ValidAudience = _cfg["Jwt:Audience"],
                ValidateLifetime = false,
            }, out _);
        }
        catch { return null; }
    }
}

// ─── Current User Service ───────────────────────────────────────────────────

public interface ICurrentUserService
{
    Guid   UserId  { get; }
    string Email   { get; }
    bool   IsAdmin { get; }
    Task<List<string>> GetRolesAsync();
    Task<List<string>> GetPermissionsAsync();
}

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _http;
    private readonly AppDbContext _db;
    public CurrentUserService(IHttpContextAccessor http, AppDbContext db) { _http = http; _db = db; }

    private ClaimsPrincipal? User => _http.HttpContext?.User;

    public Guid UserId => Guid.TryParse(
        User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
        User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var id) ? id : Guid.Empty;

    public string Email => User?.FindFirst(ClaimTypes.Email)?.Value
                        ?? User?.FindFirst(JwtRegisteredClaimNames.Email)?.Value ?? "";

    public bool IsAdmin => User?.IsInRole("Admin") ?? false;

    public async Task<List<string>> GetRolesAsync() =>
        await _db.UserRoles.Where(ur => ur.UserId == UserId).Select(ur => ur.Role.Name).ToListAsync();

    public async Task<List<string>> GetPermissionsAsync() =>
        await _db.UserRoles.Where(ur => ur.UserId == UserId)
            .SelectMany(ur => ur.Role.RolePermissions).Select(rp => rp.Permission.Code)
            .Distinct().ToListAsync();
}

// ─── File Storage Service ───────────────────────────────────────────────────

public interface IFileStorageService
{
    Task<(string path, string url)> SaveFileAsync(IFormFile file, string subfolder);
    (Stream? stream, string? contentType, string? fileName) GetFile(string relativePath);
    void DeleteFile(string relativePath);
}

public class FileStorageService : IFileStorageService
{
    private readonly string _root;
    private readonly string _baseUrl;
    private readonly ILogger<FileStorageService> _logger;

    public FileStorageService(IConfiguration cfg, ILogger<FileStorageService> logger)
    {
        _root    = cfg["Storage:Root"] ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        _baseUrl = cfg["Storage:BaseUrl"] ?? "/uploads";
        _logger  = logger;
        Directory.CreateDirectory(_root);
    }

    public async Task<(string path, string url)> SaveFileAsync(IFormFile file, string subfolder)
    {
        var dir  = Path.Combine(_root, subfolder);
        Directory.CreateDirectory(dir);
        var ext      = Path.GetExtension(file.FileName);
        var name     = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(dir, name);
        var relPath  = $"{subfolder}/{name}".Replace('\\', '/');
        await using var fs = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(fs);
        _logger.LogInformation("Saved {Original} -> {Path}", file.FileName, fullPath);
        return (relPath, $"{_baseUrl}/{relPath}");
    }

    public (Stream? stream, string? contentType, string? fileName) GetFile(string relativePath)
    {
        var full = Path.Combine(_root, relativePath.TrimStart('/'));
        if (!File.Exists(full)) return (null, null, null);
        return (File.OpenRead(full), GetMime(full), Path.GetFileName(full));
    }

    public void DeleteFile(string relativePath)
    {
        var full = Path.Combine(_root, relativePath.TrimStart('/'));
        if (File.Exists(full)) File.Delete(full);
    }

    private static string GetMime(string path) => Path.GetExtension(path).ToLower() switch
    {
        ".pdf"  => "application/pdf",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png"  => "image/png",
        ".gif"  => "image/gif",
        ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls"  => "application/vnd.ms-excel",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".dwg"  => "application/acad",
        _       => "application/octet-stream",
    };
}

// ─── Email Service ──────────────────────────────────────────────────────────

public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlBody);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _cfg;
    private readonly ILogger<EmailService> _logger;
    public EmailService(IConfiguration cfg, ILogger<EmailService> logger) { _cfg = cfg; _logger = logger; }

    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        if (_cfg["Email:Enabled"] != "true") { _logger.LogInformation("Email skipped (disabled): {Subject}", subject); return; }
        try
        {
            var msg = new MimeMessage();
            msg.From.Add(MailboxAddress.Parse(_cfg["Email:From"] ?? "noreply@mmgepm.com"));
            msg.To.Add(MailboxAddress.Parse(to));
            msg.Subject = subject;
            msg.Body    = new TextPart("html") { Text = htmlBody };
            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(_cfg["Email:Host"], int.Parse(_cfg["Email:Port"] ?? "587"),
                MailKit.Security.SecureSocketOptions.StartTls);
            if (!string.IsNullOrEmpty(_cfg["Email:Username"]))
                await smtp.AuthenticateAsync(_cfg["Email:Username"], _cfg["Email:Password"]);
            await smtp.SendAsync(msg);
            await smtp.DisconnectAsync(true);
        }
        catch (Exception ex) { _logger.LogError(ex, "Email failed to {To}", to); }
    }
}

// ─── Notification Service ───────────────────────────────────────────────────

public interface INotificationService
{
    Task SendAsync(Guid userId, string title, string message,
        string? type = "Info", string? module = null, Guid? entityId = null, string? actionUrl = null);
    Task SendToRoleAsync(string roleName, string title, string message, string? type = "Info");
    Task MarkAsReadAsync(Guid notificationId, Guid userId);
    Task MarkAllAsReadAsync(Guid userId);
    Task<List<Notification>> GetUnreadAsync(Guid userId, int take = 20);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;
    private readonly ILogger<NotificationService> _logger;
    public NotificationService(AppDbContext db, IHubContext<NotificationHub> hub, ILogger<NotificationService> logger)
    { _db = db; _hub = hub; _logger = logger; }

    public async Task SendAsync(Guid userId, string title, string message,
        string? type = "Info", string? module = null, Guid? entityId = null, string? actionUrl = null)
    {
        var n = new Notification { UserId = userId, Title = title, Message = message, Type = type, Module = module, EntityId = entityId, ActionUrl = actionUrl };
        _db.Notifications.Add(n);
        await _db.SaveChangesAsync();
        try { await _hub.Clients.User(userId.ToString()).SendAsync("notification", new { n.Id, n.Title, n.Message, n.Type, n.CreatedAt }); }
        catch (Exception ex) { _logger.LogWarning(ex, "SignalR push failed uid={UserId}", userId); }
    }

    public async Task SendToRoleAsync(string roleName, string title, string message, string? type = "Info")
    {
        var uids = await _db.UserRoles.Where(ur => ur.Role.Name == roleName).Select(ur => ur.UserId).ToListAsync();
        foreach (var uid in uids) await SendAsync(uid, title, message, type);
    }

    public async Task MarkAsReadAsync(Guid notificationId, Guid userId)
    {
        var n = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);
        if (n != null) { n.IsRead = true; n.ReadAt = DateTime.UtcNow; await _db.SaveChangesAsync(); }
    }

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true).SetProperty(n => n.ReadAt, DateTime.UtcNow));
    }

    public async Task<List<Notification>> GetUnreadAsync(Guid userId, int take = 20) =>
        await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead)
            .OrderByDescending(n => n.CreatedAt).Take(take).ToListAsync();
}

// ─── Audit Service ──────────────────────────────────────────────────────────

public interface IAuditService
{
    Task LogAsync(string action, string entityType, Guid entityId, string? oldValues = null, string? newValues = null);
}

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _cu;
    private readonly IHttpContextAccessor _http;
    public AuditService(AppDbContext db, ICurrentUserService cu, IHttpContextAccessor http) { _db = db; _cu = cu; _http = http; }

    public async Task LogAsync(string action, string entityType, Guid entityId, string? oldValues = null, string? newValues = null)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Action = action, EntityType = entityType, EntityId = entityId,
            OldValues = oldValues, NewValues = newValues,
            UserId    = _cu.UserId == Guid.Empty ? null : _cu.UserId,
            IpAddress = _http.HttpContext?.Connection?.RemoteIpAddress?.ToString(),
            UserAgent = _http.HttpContext?.Request.Headers["User-Agent"].ToString(),
        });
        await _db.SaveChangesAsync();
    }
}

// ─── SignalR Hub ────────────────────────────────────────────────────────────

public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        await base.OnConnectedAsync();
    }
}
