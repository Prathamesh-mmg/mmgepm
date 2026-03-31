using System.Text;
using System.Text.Json.Serialization;
using Hangfire;
using Hangfire.SqlServer;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using MMG.EPM.API.Data;
using MMG.EPM.API.Infrastructure.Services;

using MMG.EPM.API.Infrastructure.Middleware;
using FluentValidation;

var builder = WebApplication.CreateBuilder(args);

// ──────────────────────────────────────────────
// SERILOG
// ──────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("Logs/mmgepm-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 30)
    .CreateLogger();

builder.Host.UseSerilog();

// ──────────────────────────────────────────────
// SERVICES
// ──────────────────────────────────────────────

// DB Context
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sql =>
        {
            sql.CommandTimeout(120);
            sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null);
        }));

// JWT Auth
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secret = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret not configured");

builder.Services.AddAuthentication(opt =>
{
    opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    opt.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(opt =>
{
    opt.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    opt.SaveToken = true;
    opt.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
        ValidateIssuer           = true,
        ValidIssuer              = jwtSettings["Issuer"],
        ValidateAudience         = true,
        ValidAudience            = jwtSettings["Audience"],
        ValidateLifetime         = true,
        ClockSkew                = TimeSpan.Zero
    };
    // Allow JWT from SignalR query string
    opt.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var path = ctx.HttpContext.Request.Path;
            if (path.StartsWithSegments("/hubs"))
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token))
                    ctx.Token = token;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Redis cache
if (!string.IsNullOrEmpty(builder.Configuration.GetConnectionString("Redis")))
{
    builder.Services.AddStackExchangeRedisCache(opt =>
        opt.Configuration = builder.Configuration.GetConnectionString("Redis"));
}
else
{
    builder.Services.AddDistributedMemoryCache();
}


// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Application Services
builder.Services.AddScoped<ITokenService,       TokenService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IEmailService,       EmailService>();
builder.Services.AddScoped<INotificationService,NotificationService>();
builder.Services.AddScoped<IProjectService,     ProjectService>();
builder.Services.AddScoped<ITaskService,        TaskService>();
builder.Services.AddScoped<IDocumentService,    DocumentService>();
builder.Services.AddScoped<IProcurementService, ProcurementService>();
builder.Services.AddScoped<IInventoryService,   InventoryService>();
builder.Services.AddScoped<IResourceService,    ResourceService>();
builder.Services.AddScoped<IBudgetService,      BudgetService>();
builder.Services.AddScoped<IRiskService,        RiskService>();
builder.Services.AddScoped<IDashboardService,   DashboardService>();
builder.Services.AddScoped<IReportService,      ReportService>();
builder.Services.AddScoped<IDprService,         DprService>();
builder.Services.AddScoped<IAuditService,            AuditService>();
builder.Services.AddScoped<IUserManagementService,   UserManagementService>();

// HttpContextAccessor
builder.Services.AddHttpContextAccessor();

// SignalR
builder.Services.AddSignalR();

// Hangfire
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("DefaultConnection"),
        new SqlServerStorageOptions
        {
            CommandBatchMaxTimeout       = TimeSpan.FromMinutes(5),
            SlidingInvisibilityTimeout   = TimeSpan.FromMinutes(5),
            QueuePollInterval            = TimeSpan.Zero,
            UseRecommendedIsolationLevel = true,
            DisableGlobalLocks           = true
        }));
builder.Services.AddHangfireServer();

// CORS
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("AllowFrontend", policy =>
    {
        var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        policy
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Controllers
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        opt.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title   = "MMG EPM API",
        Version = "v1",
        Description = "Enterprise Project Management System - Mount Meru Group"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type   = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description  = "Enter JWT token"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }},
            Array.Empty<string>()
        }
    });
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
});

// ──────────────────────────────────────────────
// PIPELINE
// ──────────────────────────────────────────────
var app = builder.Build();

app.UseSerilogRequestLogging();

// Swagger always enabled (restrict in production via auth if needed)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MMG EPM API v1");
    c.RoutePrefix = "swagger";
});

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<AuditMiddleware>();

// Only redirect to HTTPS in production
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

// Hangfire dashboard (restrict to admin in production)
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthFilter() }
});

// Register recurring jobs
// Daily DPR auto-generation at 11:00 AM
RecurringJob.AddOrUpdate<IDprService>(
    "auto-generate-dprs",
    svc => svc.AutoGenerateDailyDprsAsync(),
    "0 11 * * *"); // Every day at 11:00 AM

// Apply pending EF migrations on startup (optional for dev)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // ── Schema sync: add missing columns that may not exist in older DBs ──
    var conn = db.Database.GetDbConnection();
    await conn.OpenAsync();
    var schemaSql = new[]
    {
        // BudgetWBS: ProjectBudgetId column
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Budget.BudgetWBS') AND name = 'ProjectBudgetId') ALTER TABLE [Budget].[BudgetWBS] ADD [ProjectBudgetId] uniqueidentifier NULL;",
        // Drawing.Status column
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Document.Drawings') AND name = 'Status') ALTER TABLE [Document].[Drawings] ADD [Status] nvarchar(50) NOT NULL DEFAULT 'IFC';",

        // ── Inventory.Materials: dynamically make all legacy NOT NULL columns nullable ──
        @"DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql +
  'ALTER TABLE [Inventory].[Materials] ALTER COLUMN [' + c.name + '] ' +
  t.name +
  CASE WHEN t.name IN ('nvarchar','varchar','char','nchar')
       THEN '(' + CASE WHEN c.max_length = -1 THEN 'max'
                       WHEN t.name IN ('nvarchar','nchar') THEN CAST(c.max_length/2 AS NVARCHAR)
                       ELSE CAST(c.max_length AS NVARCHAR) END + ')'
       WHEN t.name IN ('decimal','numeric') THEN '(' + CAST(c.precision AS NVARCHAR) + ',' + CAST(c.scale AS NVARCHAR) + ')'
       ELSE '' END +
  ' NULL; '
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
JOIN sys.objects o ON c.object_id = o.object_id
JOIN sys.schemas s ON o.schema_id = s.schema_id
WHERE s.name = 'Inventory' AND o.name = 'Materials'
  AND c.is_nullable = 0 AND c.is_identity = 0
  AND c.name NOT IN ('Id','CreatedAt','UpdatedAt','IsDeleted','Name','Unit','CurrentStock','IsActive','MaterialCode');
IF LEN(@sql) > 0 EXEC sp_executesql @sql;",

        // ── Inventory.Materials: missing columns ──
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'Name') ALTER TABLE [Inventory].[Materials] ADD [Name] nvarchar(300) NOT NULL DEFAULT '';",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'MaterialCode') ALTER TABLE [Inventory].[Materials] ADD [MaterialCode] nvarchar(50) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'CategoryId') ALTER TABLE [Inventory].[Materials] ADD [CategoryId] uniqueidentifier NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'Unit') ALTER TABLE [Inventory].[Materials] ADD [Unit] nvarchar(50) NOT NULL DEFAULT 'Nos';",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'Description') ALTER TABLE [Inventory].[Materials] ADD [Description] nvarchar(500) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'Brand') ALTER TABLE [Inventory].[Materials] ADD [Brand] nvarchar(100) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'Specification') ALTER TABLE [Inventory].[Materials] ADD [Specification] nvarchar(100) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'CurrentStock') ALTER TABLE [Inventory].[Materials] ADD [CurrentStock] decimal(10,3) NOT NULL DEFAULT 0;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'ReorderLevel') ALTER TABLE [Inventory].[Materials] ADD [ReorderLevel] decimal(10,3) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'StandardCost') ALTER TABLE [Inventory].[Materials] ADD [StandardCost] decimal(18,2) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory.Materials') AND name = 'IsActive') ALTER TABLE [Inventory].[Materials] ADD [IsActive] bit NOT NULL DEFAULT 1;",

        // ── Resource.Resources: missing columns ──
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'Code') ALTER TABLE [Resource].[Resources] ADD [Code] nvarchar(50) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'ResourceTypeId') ALTER TABLE [Resource].[Resources] ADD [ResourceTypeId] uniqueidentifier NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'CalendarId') ALTER TABLE [Resource].[Resources] ADD [CalendarId] uniqueidentifier NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'Location') ALTER TABLE [Resource].[Resources] ADD [Location] nvarchar(100) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'CostPerHour') ALTER TABLE [Resource].[Resources] ADD [CostPerHour] decimal(18,2) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'CostPerDay') ALTER TABLE [Resource].[Resources] ADD [CostPerDay] decimal(18,2) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'Currency') ALTER TABLE [Resource].[Resources] ADD [Currency] nvarchar(10) NOT NULL DEFAULT 'USD';",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'Status') ALTER TABLE [Resource].[Resources] ADD [Status] nvarchar(50) NOT NULL DEFAULT 'Available';",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'Make') ALTER TABLE [Resource].[Resources] ADD [Make] nvarchar(100) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'Model') ALTER TABLE [Resource].[Resources] ADD [Model] nvarchar(100) NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Resource.Resources') AND name = 'UserId') ALTER TABLE [Resource].[Resources] ADD [UserId] uniqueidentifier NULL;",

        // ── ProjectTask: Baseline tracking & EngagementType ──
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Project.Tasks') AND name = 'BaselineStartDate') ALTER TABLE [Project].[Tasks] ADD [BaselineStartDate] datetime2 NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Project.Tasks') AND name = 'BaselineEndDate') ALTER TABLE [Project].[Tasks] ADD [BaselineEndDate] datetime2 NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Project.Tasks') AND name = 'ActualStartDate') ALTER TABLE [Project].[Tasks] ADD [ActualStartDate] datetime2 NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Project.Tasks') AND name = 'ActualEndDate') ALTER TABLE [Project].[Tasks] ADD [ActualEndDate] datetime2 NULL;",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Project.Tasks') AND name = 'EngagementType') ALTER TABLE [Project].[Tasks] ADD [EngagementType] nvarchar(50) NULL;",

        // ── Labour: engagement type ──
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Project.CrewAttendance') AND name = 'EngagementType') ALTER TABLE [Project].[CrewAttendance] ADD [EngagementType] nvarchar(50) NULL DEFAULT 'Departmental';",
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Project.CrewAttendance') AND name = 'OvertimeHours') ALTER TABLE [Project].[CrewAttendance] ADD [OvertimeHours] decimal(5,2) NULL;",

        // ── FileAttachments: ProjectTaskId shadow FK (EF auto-generates from ProjectTask.Attachments nav) ──
        "IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Auth.FileAttachments') AND name = 'ProjectTaskId') ALTER TABLE [Auth].[FileAttachments] ADD [ProjectTaskId] uniqueidentifier NULL;",

        // ── MPP Import Logs table ──
        @"IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'Project.MppImportLogs'))
          CREATE TABLE [Project].[MppImportLogs] (
            [Id]                  uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY,
            [ProjectId]           uniqueidentifier NOT NULL,
            [FileName]            nvarchar(500)    NOT NULL DEFAULT '',
            [FileSize]            bigint           NOT NULL DEFAULT 0,
            [ImportMode]          nvarchar(20)     NOT NULL DEFAULT 'replace',
            [TasksImported]       int              NOT NULL DEFAULT 0,
            [ResourcesImported]   int              NOT NULL DEFAULT 0,
            [AssignmentsImported] int              NOT NULL DEFAULT 0,
            [Status]              nvarchar(50)     NOT NULL DEFAULT 'Processing',
            [ErrorMessage]        nvarchar(1000)   NULL,
            [ImportedById]        uniqueidentifier NOT NULL,
            [CreatedAt]           datetime2        NOT NULL DEFAULT GETUTCDATE(),
            [UpdatedAt]           datetime2        NOT NULL DEFAULT GETUTCDATE(),
            [CreatedById]         uniqueidentifier NULL,
            [UpdatedById]         uniqueidentifier NULL,
            [IsDeleted]           bit              NOT NULL DEFAULT 0,
            [DeletedAt]           datetime2        NULL
          );",
    };
    foreach (var sql in schemaSql)
    {
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            await cmd.ExecuteNonQueryAsync();
        }
        catch { /* ignore if already exists or table missing */ }
    }
    await conn.CloseAsync();

    // ── Seed lookup data if tables are empty ──
    if (!db.Set<MMG.EPM.API.Domain.Entities.ResourceType>().Any())
    {
        db.Set<MMG.EPM.API.Domain.Entities.ResourceType>().AddRange(
            new MMG.EPM.API.Domain.Entities.ResourceType { Name = "Engineer",       Category = "Human",     IsActive = true },
            new MMG.EPM.API.Domain.Entities.ResourceType { Name = "Site Foreman",   Category = "Human",     IsActive = true },
            new MMG.EPM.API.Domain.Entities.ResourceType { Name = "Labour",         Category = "Human",     IsActive = true },
            new MMG.EPM.API.Domain.Entities.ResourceType { Name = "Excavator",      Category = "Equipment", IsActive = true },
            new MMG.EPM.API.Domain.Entities.ResourceType { Name = "Crane",          Category = "Equipment", IsActive = true },
            new MMG.EPM.API.Domain.Entities.ResourceType { Name = "Generator",      Category = "Equipment", IsActive = true },
            new MMG.EPM.API.Domain.Entities.ResourceType { Name = "Truck",          Category = "Equipment", IsActive = true }
        );
        await db.SaveChangesAsync();
    }

    if (!db.Set<MMG.EPM.API.Domain.Entities.MaterialCategory>().Any())
    {
        db.Set<MMG.EPM.API.Domain.Entities.MaterialCategory>().AddRange(
            new MMG.EPM.API.Domain.Entities.MaterialCategory { Name = "Civil Materials",       Code = "CIV" },
            new MMG.EPM.API.Domain.Entities.MaterialCategory { Name = "Electrical Materials",  Code = "ELE" },
            new MMG.EPM.API.Domain.Entities.MaterialCategory { Name = "Mechanical Materials",  Code = "MEC" },
            new MMG.EPM.API.Domain.Entities.MaterialCategory { Name = "Structural Steel",      Code = "STR" },
            new MMG.EPM.API.Domain.Entities.MaterialCategory { Name = "Plumbing & Sanitation", Code = "PLB" },
            new MMG.EPM.API.Domain.Entities.MaterialCategory { Name = "Finishing Materials",   Code = "FIN" },
            new MMG.EPM.API.Domain.Entities.MaterialCategory { Name = "General Consumables",   Code = "GEN" }
        );
        await db.SaveChangesAsync();
    }

    if (!db.Set<MMG.EPM.API.Domain.Entities.Calendar>().Any())
    {
        db.Set<MMG.EPM.API.Domain.Entities.Calendar>().Add(
            new MMG.EPM.API.Domain.Entities.Calendar
            {
                Name = "Standard 5-Day Week", Type = "Standard",
                WorkHoursPerDay = 8, WorkDays = "Mon,Tue,Wed,Thu,Fri", IsDefault = true
            }
        );
        await db.SaveChangesAsync();
    }

    // ── Update admin email to @mountmerugroup.com domain & standardize password ──
    var adminUser = await db.Users.FirstOrDefaultAsync(u =>
        u.Email == "admin@mmgepm.com" || u.Email == "admin@mountmerugroup.com");
    if (adminUser != null)
    {
        adminUser.Email               = "admin@mountmerugroup.com";
        adminUser.PasswordHash        = BCrypt.Net.BCrypt.HashPassword("Admin@1234");
        adminUser.UpdatedAt           = DateTime.UtcNow;
        adminUser.FailedLoginAttempts = 0;
        adminUser.LockedUntil         = null;
        adminUser.MustChangePassword  = false;
        await db.SaveChangesAsync();
    }

    // ── Unlock all locked accounts ──
    var lockedUsers = await db.Users.Where(u => u.FailedLoginAttempts > 0 || u.LockedUntil != null).ToListAsync();
    foreach (var lu in lockedUsers) { lu.FailedLoginAttempts = 0; lu.LockedUntil = null; }
    if (lockedUsers.Count > 0) await db.SaveChangesAsync();

    // ── Seed demo users for each RBAC role ──
    var demoUsers = new[]
    {
        ("Project Manager",      "pm@mountmerugroup.com",           "Ali",     "Hassan",    "Projects"),
        ("Planning Engineer",    "planning@mountmerugroup.com",     "Neha",    "Sharma",    "Engineering"),
        ("Site Engineer",        "siteeng@mountmerugroup.com",      "James",   "Mwangi",    "Site"),
        ("Procurement Manager",  "procurement@mountmerugroup.com",  "Sara",    "Okonkwo",   "Procurement"),
        ("Store Manager",        "store@mountmerugroup.com",        "David",   "Karanja",   "Stores"),
        ("Finance",              "finance@mountmerugroup.com",      "Priya",   "Nair",      "Finance"),
        ("Labour Manager",       "labour@mountmerugroup.com",       "Moses",   "Otieno",    "Labour"),
        ("Document Controller",  "doccontrol@mountmerugroup.com",   "Fatima",  "Al-Rashid", "Documents"),
        ("Risk Manager",         "risk@mountmerugroup.com",         "Raj",     "Patel",     "Risk"),
        ("Management",           "management@mountmerugroup.com",   "CEO",     "Office",    "Executive"),
        ("Viewer",               "viewer@mountmerugroup.com",       "Guest",   "User",      "General"),
    };

    foreach (var (roleName, email, firstName, lastName, dept) in demoUsers)
    {
        if (await db.Users.AnyAsync(u => u.Email == email)) continue;

        var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (role == null) continue;

        var demoUser = new MMG.EPM.API.Domain.Entities.User
        {
            FirstName          = firstName,
            LastName           = lastName,
            Email              = email,
            PasswordHash       = BCrypt.Net.BCrypt.HashPassword("MMG@2026"),
            Department         = dept,
            JobTitle           = roleName,
            IsActive           = true,
            MustChangePassword = false,
        };
        db.Users.Add(demoUser);
        await db.SaveChangesAsync();

        db.UserRoles.Add(new MMG.EPM.API.Domain.Entities.UserRole { UserId = demoUser.Id, RoleId = role.Id });
        await db.SaveChangesAsync();
    }
}

app.Run();
