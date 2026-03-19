using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MMG.EPM.API.Domain.Entities;

// ─── Base ──────────────────────────────────────────────────────────────────

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedById { get; set; }
    public Guid? UpdatedById { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
}

// ─── Auth ──────────────────────────────────────────────────────────────────

public class User : BaseEntity
{
    [Required, MaxLength(100)] public string FirstName { get; set; } = "";
    [Required, MaxLength(100)] public string LastName { get; set; } = "";
    [Required, MaxLength(256)] public string Email { get; set; } = "";
    [Required] public string PasswordHash { get; set; } = "";
    [MaxLength(20)]  public string? Phone { get; set; }
    [MaxLength(100)] public string? Department { get; set; }
    [MaxLength(100)] public string? JobTitle { get; set; }
    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; } = false;
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockedUntil { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public string? AvatarUrl { get; set; }

    public ICollection<UserRole>       UserRoles       { get; set; } = new List<UserRole>();
    public ICollection<ProjectMember>  ProjectMembers  { get; set; } = new List<ProjectMember>();
    public ICollection<Notification>   Notifications   { get; set; } = new List<Notification>();

    [NotMapped] public string FullName => $"{FirstName} {LastName}".Trim();
}

public class Role : BaseEntity
{
    [Required, MaxLength(100)] public string Name { get; set; } = "";
    [MaxLength(500)] public string? Description { get; set; }
    public bool IsSystem { get; set; } = false;

    public ICollection<UserRole>       UserRoles       { get; set; } = new List<UserRole>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class UserRole
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Role Role { get; set; } = null!;
}

public class Permission : BaseEntity
{
    [Required, MaxLength(100)] public string Name { get; set; } = "";
    [Required, MaxLength(100)] public string Code { get; set; } = "";
    [MaxLength(100)] public string? Module { get; set; }
    [MaxLength(500)] public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class RolePermission
{
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }

    public Role       Role       { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}

public class Country : BaseEntity
{
    [Required, MaxLength(100)] public string Name { get; set; } = "";
    [MaxLength(3)] public string? Code { get; set; }
    [MaxLength(10)] public string? CurrencyCode { get; set; }
}

public class SBUCode : BaseEntity
{
    [Required, MaxLength(20)]  public string Code { get; set; } = "";
    [Required, MaxLength(200)] public string Name { get; set; } = "";
    [MaxLength(50)] public string? Country { get; set; }
    public bool IsActive { get; set; } = true;
}

public class FileAttachment : BaseEntity
{
    [Required, MaxLength(500)] public string FileName { get; set; } = "";
    [Required, MaxLength(1000)] public string FilePath { get; set; } = "";
    [MaxLength(500)] public string? FileUrl { get; set; }
    [MaxLength(100)] public string? ContentType { get; set; }
    public long FileSize { get; set; }
    [MaxLength(50)] public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public Guid? UploadedById { get; set; }

    public User? UploadedBy { get; set; }
}

// ─── Audit ─────────────────────────────────────────────────────────────────

public class AuditLog : BaseEntity
{
    [Required, MaxLength(100)] public string Action { get; set; } = "";
    [Required, MaxLength(100)] public string EntityType { get; set; } = "";
    public Guid EntityId { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    [MaxLength(50)] public string? IpAddress { get; set; }
    [MaxLength(500)] public string? UserAgent { get; set; }
    public Guid? UserId { get; set; }

    public User? User { get; set; }
}

// ─── Notifications ─────────────────────────────────────────────────────────

public class NotificationTemplate : BaseEntity
{
    [Required, MaxLength(100)] public string Code { get; set; } = "";
    [Required, MaxLength(200)] public string Subject { get; set; } = "";
    [Required] public string Body { get; set; } = "";
    [Required, MaxLength(50)] public string Channel { get; set; } = "InApp"; // InApp, Email, Both
    public bool IsActive { get; set; } = true;
}

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    [Required, MaxLength(200)] public string Title { get; set; } = "";
    [Required] public string Message { get; set; } = "";
    [MaxLength(50)] public string? Type { get; set; }     // Info, Warning, Success, Danger
    [MaxLength(50)] public string? Module { get; set; }
    public Guid? EntityId { get; set; }
    [MaxLength(500)] public string? ActionUrl { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }

    public User User { get; set; } = null!;
}
