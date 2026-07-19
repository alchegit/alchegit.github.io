param(
  [string]$HostAlias = "EETNA_WEB_HOON",
  [int]$LocalPort = 6080,
  [int]$RemotePort = 6080
)

$ErrorActionPreference = "Stop"
$forward = "127.0.0.1:$LocalPort`:127.0.0.1:$RemotePort"

Write-Host "Opening SSH tunnel: $forward -> $HostAlias"
Write-Host "Keep this PowerShell window open while using the remote browser."
Write-Host "Then open: http://127.0.0.1:$LocalPort/vnc.html"

ssh -N -L $forward $HostAlias
