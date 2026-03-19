using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MMG.EPM.API.Domain.Entities;

// ─── Project ───────────────────────────────────────────────────────────────

public class Project : BaseEntity
{
    [Required, MaxLength(300)] public string Name { get; set; } = "";
    [Required, MaxLength(50)]  public string Code { get; set; } = "";
    [MaxLength(2000)] public string? Description { get; set; }

    // Classification
    [MaxLength(100)] public string? ProjectType { get; set; }
    [MaxLength(100)] public string? Country { get; set; }
    [MaxLength(200)] public string? Location { get; set; }
    [MaxLength(20)]  public string? SBUCode { get; set; }

    // Dates
    public DateTime StartDate { get; set; }
    public DateTime? ExpectedEndDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    // Financials
    [Column(TypeName = "decimal(18,2)")] public decimal? Budget { get; set; }
    [MaxLength(10)] public string? Currency { get; set; } = "USD";

    // Client
    [MaxLength(300)] public string? ClientName { get; set; }
    [MaxLength(200)] public string? ClientContact { get; set; }

    // Status
    [Required, MaxLength(50)] public string Status { get; set; } = "Planning";
    // Planning | Active | OnHold | Completed | Cancelled

    // Computed (refreshed on task save)
    [Column(TypeName = "decimal(5,2)")] public decimal OverallProgress { get; set; } = 0;

    // Key roles (denormalized for performance)
    public Guid? ProjectManagerId     { get; set; }
    public Guid? ProjectHeadId        { get; set; }
    public Guid? PlanningEngineerId   { get; set; }

    [ForeignKey(nameof(ProjectManagerId))]   public User? ProjectManager   { get; set; }
    [ForeignKey(nameof(ProjectHeadId))]       public User? ProjectHead       { get; set; }
    [ForeignKey(nameof(PlanningEngineerId))]  public User? PlanningEngineer  { get; set; }

    // Navigation
    public ICollection<SubProject>       SubProjects       { get; set; } = new List<SubProject>();
    public ICollection<ProjectMember>    Members           { get; set; } = new List<ProjectMember>();
    public ICollection<ProjectTask>      Tasks             { get; set; } = new List<ProjectTask>();
    public ICollection<ProjectFolder>    Folders           { get; set; } = new List<ProjectFolder>();
    public ICollection<DPRReport>        DPRReports        { get; set; } = new List<DPRReport>();
    public ICollection<Risk>             Risks             { get; set; } = new List<Risk>();
    public ICollection<BudgetWBS>        BudgetWBSItems    { get; set; } = new List<BudgetWBS>();
    public ICollection<MaterialRequest>  MaterialRequests  { get; set; } = new List<MaterialRequest>();
}

public class SubProject : BaseEntity
{
    public Guid ProjectId { get; set; }
    [Required, MaxLength(300)] public string Name { get; set; } = "";
    [MaxLength(50)]  public string? Code { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
    [MaxLength(50)] public string Status { get; set; } = "Active";

    public Project Project { get; set; } = null!;
    public ICollection<ProjectTask> Tasks { get; set; } = new List<ProjectTask>();
}

public class ProjectMember : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Guid UserId    { get; set; }
    [Required, MaxLength(100)] public string ProjectRole { get; set; } = "TeamMember";
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAt { get; set; }
    public bool IsActive { get; set; } = true;

    public Project Project { get; set; } = null!;
    public User    User    { get; set; } = null!;
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

public class ProjectTask : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Guid? SubProjectId { get; set; }
    public Guid? ParentTaskId { get; set; }   // Self-referencing for 7-level WBS

    [Required, MaxLength(500)] public string Name { get; set; } = "";
    [MaxLength(2000)] public string? Description { get; set; }
    [MaxLength(20)]   public string? WbsCode { get; set; }     // e.g. "1.2.3"
    public int Level { get; set; } = 1;                         // 1–7

    // Dates & Estimates
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate   { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal? EstimatedHours { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal? ActualHours    { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? EstimatedCost  { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? ActualCost     { get; set; }

    // Status & Progress
    [Required, MaxLength(50)] public string Status { get; set; } = "NotStarted";
    // NotStarted | InProgress | Completed | OnHold | Cancelled
    [Required, MaxLength(50)] public string Priority { get; set; } = "Medium";
    // Low | Medium | High | Critical
    [Column(TypeName = "decimal(5,2)")] public decimal ProgressPercentage { get; set; } = 0;

    // Assigned user (primary)
    public Guid? AssigneeId { get; set; }

    // Flags
    public bool IsMilestone { get; set; } = false;
    public bool HasChildren { get; set; } = false;
    public int SortOrder { get; set; } = 0;

    // Navigation
    [ForeignKey(nameof(AssigneeId))]   public User?        Assignee    { get; set; }
    [ForeignKey(nameof(ParentTaskId))] public ProjectTask? ParentTask  { get; set; }
    public Project     Project    { get; set; } = null!;
    public SubProject? SubProject { get; set; }
    public ICollection<ProjectTask>      SubTasks             { get; set; } = new List<ProjectTask>();
    public ICollection<TaskAssignee>     Assignees            { get; set; } = new List<TaskAssignee>();
    public ICollection<WorkProgress>     WorkProgresses       { get; set; } = new List<WorkProgress>();
    public ICollection<FileAttachment>   Attachments          { get; set; } = new List<FileAttachment>();
}

public class TaskAssignee
{
    public Guid TaskId  { get; set; }
    public Guid UserId  { get; set; }
    [MaxLength(100)] public string? Role { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    public ProjectTask Task { get; set; } = null!;
    public User        User { get; set; } = null!;
}

public class WorkProgress : BaseEntity
{
    public Guid TaskId { get; set; }
    public Guid UpdatedById { get; set; }
    [MaxLength(2000)] public string? Notes { get; set; }
    [Column(TypeName = "decimal(5,2)")] public decimal ProgressPercentage { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal? HoursLogged { get; set; }
    public DateTime ReportedAt { get; set; } = DateTime.UtcNow;

    public ProjectTask Task       { get; set; } = null!;
    public User        UpdatedBy  { get; set; } = null!;
    public ICollection<WorkProgressPhoto> Photos { get; set; } = new List<WorkProgressPhoto>();
}

public class WorkProgressPhoto : BaseEntity
{
    public Guid WorkProgressId { get; set; }
    [Required, MaxLength(500)] public string FileName { get; set; } = "";
    [Required, MaxLength(1000)] public string FilePath { get; set; } = "";
    [MaxLength(500)] public string? FileUrl { get; set; }
    [MaxLength(500)] public string? Caption { get; set; }
    public long FileSize { get; set; }

    public WorkProgress WorkProgress { get; set; } = null!;
}

// ─── Labour ────────────────────────────────────────────────────────────────

public class Contractor : BaseEntity
{
    [Required, MaxLength(300)] public string Name { get; set; } = "";
    [MaxLength(50)]  public string? Code { get; set; }
    [MaxLength(200)] public string? ContactPerson { get; set; }
    [MaxLength(256)] public string? Email { get; set; }
    [MaxLength(20)]  public string? Phone { get; set; }
    [MaxLength(100)] public string? Country { get; set; }
    [MaxLength(500)] public string? Address { get; set; }
    [MaxLength(50)]  public string? ContractorType { get; set; }   // Labour | Subcontractor | Both
    public bool IsActive { get; set; } = true;

    public ICollection<CrewAttendance> CrewAttendances { get; set; } = new List<CrewAttendance>();
}

public class LabourCategory : BaseEntity
{
    [Required, MaxLength(100)] public string Name { get; set; } = "";    // Carpenter, Mason, etc.
    [MaxLength(100)] public string? TradeCode { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal? DefaultDailyRate { get; set; }
    [MaxLength(10)] public string? Currency { get; set; } = "USD";
    public bool IsActive { get; set; } = true;
}

public class CrewAttendance : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Guid? ContractorId { get; set; }
    public Guid? LabourCategoryId { get; set; }
    public DateTime AttendanceDate { get; set; }
    [Required, MaxLength(300)] public string LabourName { get; set; } = "";
    [MaxLength(100)] public string? TradeName { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Present";
    // Present | Absent | HalfDay | Leave
    [Column(TypeName = "decimal(5,2)")] public decimal? HoursWorked { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal? DailyRate    { get; set; }
    [MaxLength(500)] public string? Notes { get; set; }
    public Guid? RecordedById { get; set; }

    public Project?       Project        { get; set; }
    public Contractor?    Contractor     { get; set; }
    public LabourCategory? LabourCategory { get; set; }
    [ForeignKey(nameof(RecordedById))] public User? RecordedBy { get; set; }
}

// ─── DPR ───────────────────────────────────────────────────────────────────

public class DPRReport : BaseEntity
{
    public Guid ProjectId { get; set; }
    public DateTime ReportDate { get; set; }
    [MaxLength(2000)] public string? WorkCompleted { get; set; }
    [MaxLength(2000)] public string? PlannedForTomorrow { get; set; }
    [MaxLength(2000)] public string? Issues { get; set; }
    [MaxLength(2000)] public string? SafetyObservations { get; set; }
    public int? LabourCount { get; set; }
    public int? EquipmentCount { get; set; }
    [Column(TypeName = "decimal(5,1)")] public decimal? WeatherTemperature { get; set; }
    [MaxLength(100)] public string? WeatherCondition { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Draft";
    // Draft | Submitted | Approved | Rejected
    public Guid? SubmittedById { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public Guid? ApprovedById { get; set; }
    public DateTime? ApprovedAt { get; set; }
    [MaxLength(500)] public string? RejectionReason { get; set; }

    public Project Project { get; set; } = null!;
    [ForeignKey(nameof(SubmittedById))] public User? SubmittedBy { get; set; }
    [ForeignKey(nameof(ApprovedById))]  public User? ApprovedBy  { get; set; }
}
