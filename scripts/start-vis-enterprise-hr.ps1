$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root "frontend"
$BackendUrl = "http://127.0.0.1:3000"
$FrontendUrl = "http://127.0.0.1:5173/hr"

function Test-Command($Name) {
  $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-Http($Url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Wait-Http($Url, $Label) {
  Write-Host "Attendo $Label..."
  for ($i = 0; $i -lt 30; $i++) {
    if (Test-Http $Url) {
      Write-Host "$Label pronto: $Url"
      return
    }
    Start-Sleep -Seconds 1
  }

  Write-Warning "$Label non ha risposto entro 30 secondi: $Url"
}

if (-not (Test-Command "node")) {
  throw "Node.js non trovato. Installa Node.js prima di avviare VIS Enterprise HR."
}

if (-not (Test-Command "npm")) {
  throw "npm non trovato. Verifica l'installazione di Node.js."
}

if (-not (Test-Path (Join-Path $Root ".env"))) {
  Write-Warning "File .env non trovato nella root. Copia .env.example e configura DATABASE_URL prima dell'uso."
}

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
  Write-Host "Installazione dipendenze backend..."
  Push-Location $Root
  npm install
  Pop-Location
}

if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
  Write-Host "Installazione dipendenze frontend..."
  Push-Location $Frontend
  npm install
  Pop-Location
}

Write-Host "Avvio VIS Enterprise API..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "npm run dev" -WorkingDirectory $Root

Write-Host "Avvio VIS Enterprise HR frontend..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "npm run dev -- --host 0.0.0.0 --port 5173" -WorkingDirectory $Frontend

Wait-Http "$BackendUrl/" "Backend"
Wait-Http "http://127.0.0.1:5173/" "Frontend"

Write-Host "Apro VIS Enterprise HR..."
Start-Process $FrontendUrl

Write-Host ""
Write-Host "VIS Enterprise HR avviato."
Write-Host "Backend:  $BackendUrl"
Write-Host "Frontend: $FrontendUrl"
Write-Host "Chiudi le due finestre npm per fermare il sistema."
