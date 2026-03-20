using Microsoft.EntityFrameworkCore;
using MMG.EPM.API.Domain.Entities;

namespace MMG.EPM.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ── Auth ──────────────────────────────────────────
    public DbSet<User>             Users             => Set<User>();
    public DbSet<Role>             Roles             => Set<Role>();
    public DbSet<UserRole>         UserRoles         => Set<UserRole>();
    public DbSet<Permission>       Permissions       => Set<Permission>();
    public DbSet<RolePermission>   RolePermissions   => Set<RolePermission>();
    public DbSet<Country>          Countries         => Set<Country>();
    public DbSet<SBUCode>          SBUCodes          => Set<SBUCode>();
    public DbSet<FileAttachment>   FileAttachments   => Set<FileAttachment>();

    // ── Audit ─────────────────────────────────────────
    public DbSet<AuditLog>         AuditLogs         => Set<AuditLog>();

    // ── Notifications ─────────────────────────────────
    public DbSet<NotificationTemplate> NotificationTemplates => Set<NotificationTemplate>();
    public DbSet<Notification>         Notifications         => Set<Notification>();

    // ── Projects ──────────────────────────────────────
    public DbSet<Project>          Projects          => Set<Project>();
    public DbSet<SubProject>       SubProjects       => Set<SubProject>();
    public DbSet<ProjectMember>    ProjectMembers    => Set<ProjectMember>();
    public DbSet<ProjectTask>      Tasks             => Set<ProjectTask>();
    public DbSet<TaskAssignee>     TaskAssignees     => Set<TaskAssignee>();
    public DbSet<WorkProgress>     WorkProgress      => Set<WorkProgress>();
    public DbSet<WorkProgressPhoto> WorkProgressPhotos => Set<WorkProgressPhoto>();
    public DbSet<Contractor>       Contractors       => Set<Contractor>();
    public DbSet<LabourCategory>   LabourCategories  => Set<LabourCategory>();
    public DbSet<CrewAttendance>   CrewAttendance    => Set<CrewAttendance>();
    public DbSet<DPRReport>        DPRReports        => Set<DPRReport>();

    // ── Documents ─────────────────────────────────────
    public DbSet<FolderTemplate>   FolderTemplates   => Set<FolderTemplate>();
    public DbSet<ProjectFolder>    ProjectFolders    => Set<ProjectFolder>();
    public DbSet<Document>         Documents         => Set<Document>();
    public DbSet<Drawing>          Drawings          => Set<Drawing>();
    public DbSet<ChangeRequest>    ChangeRequests    => Set<ChangeRequest>();

    // ── Procurement ───────────────────────────────────
    public DbSet<Vendor>           Vendors           => Set<Vendor>();
    public DbSet<MaterialRequest>  MaterialRequests  => Set<MaterialRequest>();
    public DbSet<MRLineItem>       MRLineItems       => Set<MRLineItem>();
    public DbSet<PurchaseOrder>    PurchaseOrders    => Set<PurchaseOrder>();
    public DbSet<POPayment>        POPayments        => Set<POPayment>();

    // ── Inventory ─────────────────────────────────────
    public DbSet<MaterialCategory> MaterialCategories => Set<MaterialCategory>();
    public DbSet<Material>         Materials          => Set<Material>();
    public DbSet<StockLedgerEntry> StockLedger        => Set<StockLedgerEntry>();
    public DbSet<SiteTransfer>     SiteTransfers      => Set<SiteTransfer>();

    // ── Resource ──────────────────────────────────────
    public DbSet<ResourceType>           ResourceTypes           => Set<ResourceType>();
    public DbSet<Calendar>               Calendars               => Set<Calendar>();
    public DbSet<CalendarException>      CalendarExceptions      => Set<CalendarException>();
    public DbSet<Resource>               Resources               => Set<Resource>();
    public DbSet<TaskResourceAllocation> TaskResourceAllocations => Set<TaskResourceAllocation>();
    public DbSet<EquipmentDeployment>    EquipmentDeployments    => Set<EquipmentDeployment>();

    // ── Budget ────────────────────────────────────────
    public DbSet<BudgetWBS>        BudgetWBSItems    => Set<BudgetWBS>();
    public DbSet<ProjectBudget>    ProjectBudgets    => Set<ProjectBudget>();
    public DbSet<CommittedAmount>  CommittedAmounts  => Set<CommittedAmount>();
    public DbSet<Expenditure>      Expenditures      => Set<Expenditure>();

    // ── Risk ──────────────────────────────────────────
    public DbSet<Risk>             Risks             => Set<Risk>();
    public DbSet<RiskStakeholder>  RiskStakeholders  => Set<RiskStakeholder>();
    public DbSet<RiskUpdate>       RiskUpdates       => Set<RiskUpdate>();
    public DbSet<TaskDelay>        TaskDelays         => Set<TaskDelay>();
    public DbSet<TaskComment>      TaskComments       => Set<TaskComment>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // Apply all entity configurations from the assembly
        mb.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Schema mappings
        mb.Entity<User>().ToTable("Users", "Auth");
        mb.Entity<Role>().ToTable("Roles", "Auth");
        mb.Entity<UserRole>().ToTable("UserRoles", "Auth");
        mb.Entity<Permission>().ToTable("Permissions", "Auth");
        mb.Entity<RolePermission>().ToTable("RolePermissions", "Auth");
        mb.Entity<Country>().ToTable("Countries", "Auth");
        mb.Entity<SBUCode>().ToTable("SBUCodes", "Auth");
        mb.Entity<FileAttachment>().ToTable("FileAttachments", "Auth");

        mb.Entity<AuditLog>().ToTable("AuditLog", "Audit");
        mb.Entity<NotificationTemplate>().ToTable("NotificationTemplates", "Notify");
        mb.Entity<Notification>().ToTable("Notifications", "Notify");

        mb.Entity<Project>().ToTable("Projects", "Project");
        mb.Entity<SubProject>().ToTable("SubProjects", "Project");
        mb.Entity<ProjectMember>().ToTable("ProjectMembers", "Project");
        mb.Entity<ProjectTask>().ToTable("Tasks", "Project");
        mb.Entity<TaskAssignee>().ToTable("TaskAssignees", "Project");
        mb.Entity<WorkProgress>().ToTable("WorkProgress", "Project");
        mb.Entity<WorkProgressPhoto>().ToTable("WorkProgressPhotos", "Project");
        mb.Entity<Contractor>().ToTable("Contractors", "Project");
        mb.Entity<LabourCategory>().ToTable("LabourCategories", "Project");
        mb.Entity<CrewAttendance>().ToTable("CrewAttendance", "Project");
        mb.Entity<DPRReport>().ToTable("DPRReports", "Project");

        mb.Entity<FolderTemplate>().ToTable("FolderTemplates", "Document");
        mb.Entity<ProjectFolder>().ToTable("ProjectFolders", "Document");
        mb.Entity<Document>().ToTable("Documents", "Document");
        mb.Entity<Drawing>().ToTable("Drawings", "Document");
        mb.Entity<ChangeRequest>().ToTable("ChangeRequests", "Document");

        mb.Entity<MaterialRequest>().ToTable("MaterialRequests", "Procurement");
        mb.Entity<MRLineItem>().ToTable("MRLineItems", "Procurement");
        mb.Entity<PurchaseOrder>().ToTable("PurchaseOrders", "Procurement");
        mb.Entity<POPayment>().ToTable("POPayments", "Procurement");
        mb.Entity<Vendor>().ToTable("Vendors", "Procurement");

        mb.Entity<MaterialCategory>().ToTable("MaterialCategories", "Inventory");
        mb.Entity<Material>().ToTable("Materials", "Inventory");
        mb.Entity<StockLedgerEntry>().ToTable("StockLedger", "Inventory");
        mb.Entity<SiteTransfer>().ToTable("SiteTransfers", "Inventory");

        mb.Entity<ResourceType>().ToTable("ResourceTypes", "Resource");
        mb.Entity<Calendar>().ToTable("Calendars", "Resource");
        mb.Entity<CalendarException>().ToTable("CalendarExceptions", "Resource");
        mb.Entity<Resource>().ToTable("Resources", "Resource");
        mb.Entity<TaskResourceAllocation>().ToTable("TaskResourceAllocations", "Resource");
        mb.Entity<EquipmentDeployment>().ToTable("EquipmentDeployment", "Resource");

        mb.Entity<BudgetWBS>().ToTable("BudgetWBS", "Budget");
        mb.Entity<ProjectBudget>().ToTable("ProjectBudgets", "Budget");
        mb.Entity<CommittedAmount>().ToTable("CommittedAmounts", "Budget");
        mb.Entity<Expenditure>().ToTable("Expenditures", "Budget");

        mb.Entity<Risk>().ToTable("Risks", "Risk");
        mb.Entity<TaskDelay>().ToTable("TaskDelays", "Project");
        mb.Entity<TaskComment>().ToTable("TaskComments", "Project");
        mb.Entity<RiskStakeholder>().ToTable("RiskStakeholders", "Risk");
        mb.Entity<RiskUpdate>().ToTable("RiskUpdates", "Risk");

        // Unique constraints
        mb.Entity<User>().HasIndex(u => u.Email).IsUnique();
        mb.Entity<Role>().HasIndex(r => r.Name).IsUnique();
        mb.Entity<UserRole>().HasKey(ur => new { ur.UserId, ur.RoleId });
        mb.Entity<RolePermission>().HasKey(rp => new { rp.RoleId, rp.PermissionId });
        mb.Entity<TaskAssignee>().HasKey(ta => new { ta.TaskId, ta.UserId });
        mb.Entity<RiskStakeholder>().HasKey(rs => new { rs.RiskId, rs.UserId });
        mb.Entity<Project>().HasIndex(p => p.Code).IsUnique();
        mb.Entity<Material>().HasIndex(m => m.MaterialCode).IsUnique();
        mb.Entity<MaterialRequest>().HasIndex(mr => mr.MrNumber).IsUnique();
        mb.Entity<PurchaseOrder>().HasIndex(po => po.PoNumber).IsUnique();
        mb.Entity<Vendor>().HasIndex(v => v.VendorCode).IsUnique();
        mb.Entity<Risk>().HasIndex(r => r.RiskNumber);
        mb.Entity<ChangeRequest>().HasIndex(cr => cr.CrNumber);

        // Self-referencing task hierarchy
        mb.Entity<ProjectTask>()
            .HasOne(t => t.ParentTask)
            .WithMany(t => t.SubTasks)
            .HasForeignKey(t => t.ParentTaskId)
            .OnDelete(DeleteBehavior.Restrict);

        // Self-referencing budget WBS
        mb.Entity<BudgetWBS>()
            .HasOne(w => w.Parent)
            .WithMany(w => w.Children)
            .HasForeignKey(w => w.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Self-referencing folders
        mb.Entity<ProjectFolder>()
            .HasOne(f => f.Parent)
            .WithMany(f => f.Children)
            .HasForeignKey(f => f.ParentId)
            .OnDelete(DeleteBehavior.Restrict);
        mb.Entity<StockLedgerEntry>().Property(s => s.Quantity).HasPrecision(14, 3);
    }
}

// Add to AppDbContext - Task extensions
// NOTE: Add these properties to the AppDbContext class body
