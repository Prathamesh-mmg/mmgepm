# MMG EPM — Production Deployment Guide
# Windows Server 2022 + IIS + SQL Server + React
# ══════════════════════════════════════════════════════════════════

## PRE-REQUISITES
────────────────
- Windows Server 2022 (Standard or Datacenter)
- SQL Server 2019 / 2022 (Developer / Standard / Enterprise)
- .NET 8 Runtime + ASP.NET Core Hosting Bundle
- Node.js 20 LTS (for building React frontend)
- IIS with URL Rewrite Module 2.1
- IIS Application Request Routing (ARR) 3.0
- Git (optional, for CI/CD)


## STEP 1 — SQL SERVER SETUP
────────────────────────────

1. Open SQL Server Management Studio (SSMS)
2. Run scripts in order:
   > 01_Schema_Core.sql
   > 02_Schema_Project.sql
   > 03_Schema_Modules.sql
   > 04_SeedData.sql

3. Create a dedicated SQL login:

```sql
CREATE LOGIN mmgepm_app WITH PASSWORD = 'YourStrongP@ssword123!';
USE MMGEPM;
CREATE USER mmgepm_app FOR LOGIN mmgepm_app;
ALTER ROLE db_datareader ADD MEMBER mmgepm_app;
ALTER ROLE db_datawriter ADD MEMBER mmgepm_app;
GRANT EXECUTE TO mmgepm_app;
```

4. Update the connection string in appsettings.Production.json:
```
Server=localhost;Database=MMGEPM;User Id=mmgepm_app;Password=YourStrongP@ssword123!;
TrustServerCertificate=True;MultipleActiveResultSets=True;
```


## STEP 2 — BACKEND (ASP.NET CORE) DEPLOYMENT
────────────────────────────────────────────────

### 2a. Install .NET 8 Hosting Bundle
Download from: https://dotnet.microsoft.com/download/dotnet/8.0
Run: dotnet-hosting-8.x.x-win.exe
Restart IIS after installation: iisreset

### 2b. Publish the API
```powershell
cd C:\Projects\mmg-epm\backend\MMG.EPM.API

dotnet publish -c Release -r win-x64 --self-contained false -o C:\inetpub\mmgepm-api

# Verify
ls C:\inetpub\mmgepm-api
```

### 2c. Configure appsettings.Production.json
Create: C:\inetpub\mmgepm-api\appsettings.Production.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=MMGEPM;User Id=mmgepm_app;Password=YourStrongP@ssword123!;TrustServerCertificate=True;MultipleActiveResultSets=True;"
  },
  "JwtSettings": {
    "Secret":         "MMG_EPM_SUPER_SECRET_KEY_MIN_32_CHARS_CHANGE_THIS_NOW",
    "Issuer":         "mmgepm.mountmerugroup.com",
    "Audience":       "mmgepm.mountmerugroup.com",
    "ExpiryMinutes":  "60"
  },
  "FileStorage": {
    "BasePath": "C:\\inetpub\\mmgepm-uploads"
  },
  "Smtp": {
    "Host":        "smtp.yourprovider.com",
    "Port":        "587",
    "Username":    "noreply@mountmerugroup.com",
    "Password":    "YourEmailPassword",
    "SenderName":  "MMG EPM",
    "SenderEmail": "noreply@mountmerugroup.com"
  },
  "AllowedOrigins": [
    "https://epm.mountmerugroup.com",
    "http://localhost:5173"
  ],
  "Serilog": {
    "MinimumLevel": { "Default": "Information" },
    "WriteTo": [
      { "Name": "File", "Args": { "path": "C:\\Logs\\mmgepm\\api-.log", "rollingInterval": "Day" }}
    ]
  }
}
```

### 2d. Create IIS Application Pool
```powershell
Import-Module WebAdministration

# Create App Pool
New-WebAppPool -Name "MMGEPMApiPool"
Set-ItemProperty IIS:\AppPools\MMGEPMApiPool -Name processModel.identityType -Value ApplicationPoolIdentity
Set-ItemProperty IIS:\AppPools\MMGEPMApiPool -Name managedRuntimeVersion -Value ""  # No managed code (ASP.NET Core)
Set-ItemProperty IIS:\AppPools\MMGEPMApiPool -Name startMode -Value AlwaysRunning
Set-ItemProperty IIS:\AppPools\MMGEPMApiPool -Name recycling.periodicRestart.time -Value "00:00:00"
```

### 2e. Create IIS Website for API
```powershell
New-WebSite -Name "MMGEPMApi" `
            -Port 5000 `
            -PhysicalPath "C:\inetpub\mmgepm-api" `
            -ApplicationPool "MMGEPMApiPool"

# OR bind to a subdomain:
# New-WebSite -Name "MMGEPMApi" -Port 443 -PhysicalPath "..." -ApplicationPool "..."
# Then configure SSL certificate binding
```

### 2f. Create web.config in API publish folder
The publish output includes web.config automatically. Verify it has:
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <aspNetCore processPath="dotnet"
                  arguments=".\MMG.EPM.API.dll"
                  stdoutLogEnabled="true"
                  stdoutLogFile="C:\Logs\mmgepm\api-stdout"
                  hostingModel="inprocess">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
        </environmentVariables>
      </aspNetCore>
    </system.webServer>
  </location>
</configuration>
```

### 2g. Set folder permissions
```powershell
# Grant IIS AppPool identity access
$acl = Get-Acl "C:\inetpub\mmgepm-api"
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\MMGEPMApiPool", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl "C:\inetpub\mmgepm-api" $acl

# Do the same for uploads folder
New-Item -ItemType Directory -Path "C:\inetpub\mmgepm-uploads" -Force
$acl2 = Get-Acl "C:\inetpub\mmgepm-uploads"
$acl2.SetAccessRule($rule)
Set-Acl "C:\inetpub\mmgepm-uploads" $acl2

# Logs folder
New-Item -ItemType Directory -Path "C:\Logs\mmgepm" -Force
$acl3 = Get-Acl "C:\Logs\mmgepm"
$acl3.SetAccessRule($rule)
Set-Acl "C:\Logs\mmgepm" $acl3
```

### 2h. Test API
Open browser: http://localhost:5000/swagger
Should see the Swagger UI with all endpoints.


## STEP 3 — FRONTEND (REACT) BUILD & DEPLOY
────────────────────────────────────────────

### 3a. Create .env.production
Create: C:\Projects\mmg-epm\frontend\.env.production

```env
VITE_API_URL=https://api.epm.mountmerugroup.com/api
VITE_WS_URL=https://api.epm.mountmerugroup.com
```

### 3b. Build React app
```powershell
cd C:\Projects\mmg-epm\frontend

npm install
npm run build

# Output is in: dist/
# Copy to IIS webroot:
Copy-Item -Recurse -Force .\dist\* "C:\inetpub\mmgepm-frontend\"
```

### 3c. Create IIS Website for Frontend
```powershell
New-Item -ItemType Directory -Path "C:\inetpub\mmgepm-frontend" -Force

New-WebSite -Name "MMGEPMFrontend" `
            -Port 80 `
            -PhysicalPath "C:\inetpub\mmgepm-frontend" `
            -ApplicationPool "DefaultAppPool"
```

### 3d. Create web.config for React SPA (URL Rewrite)
Create: C:\inetpub\mmgepm-frontend\web.config

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Serve static files and directories as-is -->
        <rule name="StaticFiles" stopProcessing="true">
          <match url="(assets|favicon|manifest|robots|sw\.js)" />
          <action type="None" />
        </rule>
        <!-- Route all other requests to index.html (React Router) -->
        <rule name="ReactRouter" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff"  mimeType="font/woff"       />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2"      />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options"    value="nosniff"     />
        <add name="X-Frame-Options"           value="DENY"        />
        <add name="X-XSS-Protection"          value="1; mode=block" />
        <add name="Referrer-Policy"           value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>
    <!-- Cache static assets for 1 year -->
    <outboundRules>
      <rule name="Cache Assets">
        <match serverVariable="RESPONSE_Cache_Control" pattern=".*" />
        <conditions>
          <add input="{REQUEST_URI}" pattern="\.(js|css|png|jpg|svg|woff2)$" />
        </conditions>
        <action type="Rewrite" value="public, max-age=31536000, immutable" />
      </rule>
    </outboundRules>
  </system.webServer>
</configuration>
```


## STEP 4 — IIS REVERSE PROXY (API → Frontend)
────────────────────────────────────────────────
If hosting both on same server with different subdomains, use ARR:

```xml
<!-- In the MMGEPMFrontend site's web.config, add reverse proxy for /api: -->
<rule name="API Proxy" stopProcessing="true">
  <match url="^api/(.*)" />
  <action type="Rewrite" url="http://localhost:5000/api/{R:1}" />
</rule>
```

OR use separate bindings with SSL certificates (recommended for production).


## STEP 5 — SSL CERTIFICATE
────────────────────────────
Use Let's Encrypt (win-acme) or an organizational certificate:

```powershell
# Download win-acme from https://www.win-acme.com/
# Run:
wacs.exe --target iis --siteid <your-site-id> --installation iis
```


## STEP 6 — WINDOWS SERVICE / PROCESS MONITORING
──────────────────────────────────────────────────
IIS handles process lifecycle via the hosting bundle.
For extra resilience, configure:

```powershell
# Enable rapid fail protection reset
Set-ItemProperty IIS:\AppPools\MMGEPMApiPool `
  -Name failure.rapidFailProtectionInterval -Value "00:05:00"

# Auto-restart on failure
Set-ItemProperty IIS:\AppPools\MMGEPMApiPool `
  -Name failure.autoShutdownExe -Value ""
```


## STEP 7 — ENVIRONMENT VARIABLES (optional alternative to appsettings)
──────────────────────────────────────────────────────────────────────────
Set via IIS Manager > Site > Configuration Editor > system.webServer/aspNetCore/environmentVariables
OR via PowerShell:

```powershell
[System.Environment]::SetEnvironmentVariable(
  "ConnectionStrings__DefaultConnection",
  "Server=...;Database=MMGEPM;...",
  "Machine"
)
[System.Environment]::SetEnvironmentVariable(
  "JwtSettings__Secret",
  "YourLongSecretKeyHere",
  "Machine"
)
```


## STEP 8 — HANGFIRE BACKGROUND JOBS
──────────────────────────────────────
Hangfire runs inside the same API process. Access dashboard at:
https://api.epm.mountmerugroup.com/hangfire

Restrict in production by implementing HangfireAuthFilter:
```csharp
public class HangfireAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        return httpContext.User.IsInRole("ADMIN");
    }
}
```


## STEP 9 — SMOKE TESTS
──────────────────────────
1. API health:   GET https://api.epm.mountmerugroup.com/swagger
2. Login:        POST https://api.epm.mountmerugroup.com/api/auth/login
                 Body: { "email": "admin@mmgepm.com", "password": "Admin@123" }
3. Frontend:     https://epm.mountmerugroup.com
4. Notifications: Create a task and verify email notification is received


## STEP 10 — FIRST LOGIN & SETUP
──────────────────────────────────
1. Navigate to https://epm.mountmerugroup.com/login
2. Login with: admin@mmgepm.com / Admin@123
3. IMMEDIATELY change the admin password:
   Profile → Change Password
4. Go to Admin → Users → Create users for your team
5. Assign appropriate roles from the role matrix
6. Create first Project to begin

## MAINTENANCE
──────────────
- Logs location:     C:\Logs\mmgepm\
- Uploads location:  C:\inetpub\mmgepm-uploads\
- Backup SQL DB:     Schedule SSMS maintenance plan or SQL Agent job
- Update app:        Re-publish backend, rebuild frontend, replace files

## TROUBLESHOOTING
────────────────────
| Issue                  | Check                                              |
|------------------------|----------------------------------------------------|
| 502 Bad Gateway        | API app pool not running / .NET Hosting Bundle missing |
| 404 on page refresh    | URL Rewrite module not installed / web.config missing |
| JWT errors             | JwtSettings__Secret must be 32+ chars             |
| Email not sending      | SMTP settings in appsettings.Production.json       |
| Files not uploading    | IIS AppPool identity needs write access to uploads folder |
| SignalR not connecting | Ensure WebSockets enabled in IIS Features          |
