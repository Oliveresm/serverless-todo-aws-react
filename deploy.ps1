param(
    [Parameter(Mandatory = $true, HelpMessage = "Ingresa tu IP pública actual (ej. 203.0.113.25)")]
    [string]$AllowedIP
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Iniciando despliegue To-Do List AWS con OpenTofu" -ForegroundColor Cyan
Write-Host " IP Permitida: $AllowedIP" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Entrar a la carpeta de React, instalar dependencias (incluyendo react-router-dom) y ejecutar npm run build
Write-Host "`n[1/3] Compilando el Frontend (React + Vite + Bootstrap + React Router)..." -ForegroundColor Yellow
Push-Location (Join-Path $ProjectRoot "frontend")
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "Error al ejecutar npm install" }

    npm install react-router-dom
    if ($LASTEXITCODE -ne 0) { throw "Error al instalar react-router-dom" }

    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Error al ejecutar npm run build" }
}
finally {
    Pop-Location
}

# 2. Comprimir el archivo index.js de la Lambda en un archivo .zip
Write-Host "`n[2/3] Empaquetando función Lambda (backend/index.js -> backend/function.zip)..." -ForegroundColor Yellow
$LambdaSource = Join-Path $ProjectRoot "backend\index.js"
$LambdaZip    = Join-Path $ProjectRoot "backend\function.zip"

if (Test-Path $LambdaZip) {
    Remove-Item $LambdaZip -Force
}
Compress-Archive -Path $LambdaSource -DestinationPath $LambdaZip -Force

# 3. Ejecutar OpenTofu para desplegar la infraestructura
Write-Host "`n[3/3] Desplegando infraestructura en AWS con OpenTofu..." -ForegroundColor Yellow
Push-Location $ProjectRoot
try {
    tofu init
    if ($LASTEXITCODE -ne 0) { throw "Error al ejecutar tofu init" }

    tofu apply -var="allowed_ip=$AllowedIP" -auto-approve
    if ($LASTEXITCODE -ne 0) { throw "Error al ejecutar tofu apply" }
}
finally {
    Pop-Location
}

Write-Host "`n¡Despliegue completado exitosamente!" -ForegroundColor Green
