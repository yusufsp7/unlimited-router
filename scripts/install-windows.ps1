# Unlimited Router — Windows installer (run by Install-Windows.cmd)
# Installs dependencies, builds the app, sets up the `urouter` command,
# and registers autostart. Safe to re-run.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "   Unlimited Router - Installer Windows" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# ── 1. Node.js check ──────────────────────────────────────────────────────
try {
  $nodeVersion = (node -v) 2>$null
  $major = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
  if ($major -lt 20) { throw "old" }
  Write-Host "[OK] Node.js $nodeVersion terdeteksi" -ForegroundColor Green
} catch {
  Write-Host "[!!] Node.js belum terinstall atau versinya di bawah 20." -ForegroundColor Red
  Write-Host "     Unduh versi LTS dari https://nodejs.org lalu jalankan installer ini lagi." -ForegroundColor Yellow
  Read-Host "Tekan Enter untuk keluar"
  exit 1
}

# ── 2. Dependencies ───────────────────────────────────────────────────────
Write-Host "[1/4] Mengunduh dependensi (butuh beberapa menit)..." -ForegroundColor Cyan
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Write-Host "[!!] npm install gagal — cek koneksi internet." -ForegroundColor Red; Read-Host "Tekan Enter"; exit 1 }

# ── 3. Build ──────────────────────────────────────────────────────────────
Write-Host "[2/4] Membangun aplikasi (3-10 menit)..." -ForegroundColor Cyan
npm run build:turbo
if ($LASTEXITCODE -ne 0) { Write-Host "[!!] Build gagal." -ForegroundColor Red; Read-Host "Tekan Enter"; exit 1 }
node scripts/copy-standalone-assets.mjs

# ── 4. Bundle CLI app ─────────────────────────────────────────────────────
Write-Host "[3/4] Menyiapkan CLI..." -ForegroundColor Cyan
if (Test-Path "$root\cli\app") { Remove-Item -Recurse -Force "$root\cli\app" }
Copy-Item -Recurse "$root\.next\standalone" "$root\cli\app"

# ── 5. Start shortcut + autostart ─────────────────────────────────────────
Write-Host "[4/4] Menyiapkan launcher & startup otomatis..." -ForegroundColor Cyan
$runCmd = '"' + (Join-Path $root "Start Unlimited Router.cmd") + '"'
Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' `
  -Name 'UnlimitedRouter' -Value $runCmd

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Installation complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host " Cara mulai:  klik dua kali 'Start Unlimited Router.cmd'" -ForegroundColor White
Write-Host " Dashboard:   http://localhost:20128  (password: 123456)" -ForegroundColor White
Write-Host ""
Read-Host "Tekan Enter untuk keluar"
