# MMG EPM - IIS Deployment Script
# Run this as Administrator on the Windows Server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MMG EPM UAT - IIS Deployment Script" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$sourcePath = "C:\MMG\EPM"
$apiDeploy = "C:\inetpub\mmgepm-uat-api"
$frontendDeploy = "C:\inetpub\mmgepm-uat-frontend"
$uploadsPath = "C:\inetpub\mmgepm-uat-uploads"
$logsPath = "C:\Logs\mmgepm-uat"

# STEP 1 - Create folders
Write-Host "STEP 1 - Creating folders..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $apiDeploy | Out-Null
New-Item -ItemType Directory -Force -Path $frontendDeploy | Out-Null
New-Item -ItemType Directory -Force -Path $uploadsPath | Out-Null
New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
Write-Host "Folders created OK" -ForegroundColor Green

# STEP 2 - Build API
Write-Host ""
Write-Host "STEP 2 - Building API..." -ForegroundColor Yellow
Set-Location "$sourcePath\backend\MMG.EPM.API"
$buildResult = dotnet publish -c Release -o $apiDeploy 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "API Build succeeded!" -ForegroundColor Green
} else {
    Write-Host "API Build FAILED! Check errors above." -ForegroundColor Red
    exit 1
}

# STEP 3 - Build Frontend
Write-Host ""
Write-Host "STEP 3 - Building Frontend..." -ForegroundColor Yellow
Set-Location "$sourcePath\frontend"
npm install --legacy-peer-deps --silent
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "Frontend Build succeeded!" -ForegroundColor Green
} else {
    Write-Host "Frontend Build FAILED!" -ForegroundColor Red
    exit 1
}

# STEP 4 - Copy frontend to IIS
Write-Host ""
Write-Host "STEP 4 - Copying frontend files..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "$sourcePath\frontend\dist\*" $frontendDeploy
Write-Host "Frontend copied OK" -ForegroundColor Green

# STEP 5 - Create web.config for frontend
Write-Host ""
Write-Host "STEP 5 - Creating web.config..." -ForegroundColor Yellow
$webconfig = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="APIProxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:5001/api/{R:1}" />
        </rule>
        <rule name="SignalRProxy" stopProcessing="true">
          <match url="^hubs/(.*)" />
          <action type="Rewrite" url="http://localhost:5001/hubs/{R:1}" />
        </rule>
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
  </system.webServer>
</configuration>
'@
Set-Content "$frontendDeploy\web.config" $webconfig
Write-Host "web.config created OK" -ForegroundColor Green

# STEP 6 - Setup IIS
Write-Host ""
Write-Host "STEP 6 - Setting up IIS..." -ForegroundColor Yellow
Import-Module WebAdministration

Stop-WebSite -Name "Default Web Site" -ErrorAction SilentlyContinue

# API App Pool
if (!(Test-Path "IIS:\AppPools\MMGEPMUATApi")) {
    New-WebAppPool -Name "MMGEPMUATApi"
}
Set-ItemProperty IIS:\AppPools\MMGEPMUATApi -Name managedRuntimeVersion -Value ""
Set-ItemProperty IIS:\AppPools\MMGEPMUATApi -Name startMode -Value AlwaysRunning
Set-ItemProperty IIS:\AppPools\MMGEPMUATApi -Name processModel.identityType -Value ApplicationPoolIdentity

# API Website
if (!(Get-WebSite -Name "MMGEPMUATApi" -ErrorAction SilentlyContinue)) {
    New-WebSite -Name "MMGEPMUATApi" -Port 5001 -PhysicalPath $apiDeploy -ApplicationPool "MMGEPMUATApi"
} else {
    Set-ItemProperty "IIS:\Sites\MMGEPMUATApi" -Name physicalPath -Value $apiDeploy
}

# Frontend Website
if (!(Get-WebSite -Name "MMGEPMUATFrontend" -ErrorAction SilentlyContinue)) {
    New-WebSite -Name "MMGEPMUATFrontend" -Port 80 -PhysicalPath $frontendDeploy -ApplicationPool "DefaultAppPool"
} else {
    Set-ItemProperty "IIS:\Sites\MMGEPMUATFrontend" -Name physicalPath -Value $frontendDeploy
}

Write-Host "IIS setup OK" -ForegroundColor Green

# STEP 7 - Set Permissions
Write-Host ""
Write-Host "STEP 7 - Setting permissions..." -ForegroundColor Yellow
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\MMGEPMUATApi","FullControl","ContainerInherit,ObjectInherit","None","Allow")
foreach ($p in @($apiDeploy, $uploadsPath, $logsPath)) {
    $acl = Get-Acl $p
    $acl.SetAccessRule($rule)
    Set-Acl $p $acl
}
Write-Host "Permissions set OK" -ForegroundColor Green

# STEP 8 - Set Environment
[System.Environment]::SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT","Production","Machine")

# STEP 9 - Restart IIS
Write-Host ""
Write-Host "STEP 8 - Restarting IIS..." -ForegroundColor Yellow
iisreset | Out-Null
Start-Sleep -Seconds 3
Start-WebAppPool -Name "MMGEPMUATApi" -ErrorAction SilentlyContinue
Write-Host "IIS restarted OK" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "  Test: http://localhost" -ForegroundColor Cyan
Write-Host "  API:  http://localhost:5001/swagger" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
