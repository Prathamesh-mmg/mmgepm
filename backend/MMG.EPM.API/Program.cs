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
// (Add custom Hangfire jobs here when needed)
// RecurringJob.AddOrUpdate<INotificationService>("job-id", svc => svc.YourMethodAsync(), Cron.Daily(6));

// Apply pending EF migrations on startup (optional for dev)
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.Run();
