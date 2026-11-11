# Build APK RILIS bertanda tangan untuk SPLV app (Windows PowerShell).
# Pakai:  powershell -ExecutionPolicy Bypass -File app\scripts\build-apk.ps1
# Hasil:  apk\SPLV-app-<versi>.apk
$ErrorActionPreference = 'Stop'

$appDir = Split-Path -Parent $PSScriptRoot
$repo = Split-Path -Parent $appDir
$android = Join-Path $appDir 'android'
$tools = Join-Path $env:LOCALAPPDATA 'android-build'

# Node.js: pakai yang terpasang di sistem, atau versi portable.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  $portable = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'node-portable') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $portable) { throw 'Node.js tidak ditemukan. Pasang Node.js 20+ dari nodejs.org.' }
  $env:Path = "$($portable.FullName);$env:Path"
}
# JDK 17 + Android SDK: pakai JAVA_HOME/ANDROID_HOME bila ada, jika tidak pakai versi portable.
if (-not $env:JAVA_HOME) {
  $jdk = Get-ChildItem (Join-Path $tools 'jdk') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $jdk) { throw 'JDK 17 tidak ditemukan. Set JAVA_HOME atau pasang Android Studio.' }
  $env:JAVA_HOME = $jdk.FullName
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $tools 'sdk' }
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

if (-not (Test-Path (Join-Path $android 'keystore.properties'))) {
  throw 'keystore.properties tidak ada. Kunci rilis hilang. Pulihkan dari cadangan (lihat panduan-uji-coba.md bagian G).'
}
$ca = Join-Path $appDir 'certs\splv_ca.pem'
if (-not (Test-Path $ca)) { throw 'app\certs\splv_ca.pem tidak ada. Jalankan di folder server: python -m scripts.make_certs' }

Set-Location $appDir
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version

Write-Host '1/4 Uji...'
npx vitest run
if ($LASTEXITCODE -ne 0) { throw 'Uji gagal, APK tidak dibuat.' }

Write-Host '2/4 Build web + sinkron ke Android...'
npx vite build
if ($LASTEXITCODE -ne 0) { throw 'Build web gagal.' }
npx cap sync android
New-Item -ItemType Directory -Force (Join-Path $android 'app\src\main\res\raw') | Out-Null
Copy-Item $ca (Join-Path $android 'app\src\main\res\raw\splv_ca.pem') -Force

Write-Host '3/4 Build APK rilis...'
Set-Location $android
"sdk.dir=$($env:ANDROID_HOME -replace '\\','/')" | Set-Content local.properties -Encoding ascii
.\gradlew.bat assembleRelease --no-daemon -q
if ($LASTEXITCODE -ne 0) { throw 'Build Gradle gagal.' }

Write-Host '4/4 Verifikasi tanda tangan...'
$built = Join-Path $android 'app\build\outputs\apk\release\app-release.apk'
$apksigner = Get-ChildItem (Join-Path $env:ANDROID_HOME 'build-tools') -Directory | Sort-Object Name -Descending | Select-Object -First 1
& (Join-Path $apksigner.FullName 'apksigner.bat') verify --print-certs $built
if ($LASTEXITCODE -ne 0) { throw 'Tanda tangan APK tidak valid.' }

$out = Join-Path $repo 'apk'
New-Item -ItemType Directory -Force $out | Out-Null
$dest = Join-Path $out "SPLV-app-$version.apk"
Copy-Item $built $dest -Force
Write-Host "Selesai: $dest"
