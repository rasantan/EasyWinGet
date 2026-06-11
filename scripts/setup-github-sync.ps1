#Requires -Version 5.1
<#
.SYNOPSIS
  Configura secrets do GitHub Actions e dispara sync completo do catálogo WinGet.

.PARAMETER ServiceRoleKey
  Chave service_role do Supabase (Project Settings → API).

.EXAMPLE
  .\scripts\setup-github-sync.ps1 -ServiceRoleKey "eyJ..."
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$ServiceRoleKey
)

$ErrorActionPreference = "Stop"

$Gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $Gh)) {
  $ghCmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($ghCmd) {
    $Gh = $ghCmd.Source
  }
}
if (-not $Gh) {
  throw "GitHub CLI (gh) não encontrado. Instale: winget install GitHub.cli"
}

$Repo = "rasantan/EasyWinGet"
$SupabaseUrl = "https://yqhjscguprljiiajwncw.supabase.co"

Write-Host "Configurando SUPABASE_URL..."
$SupabaseUrl | & $Gh secret set SUPABASE_URL -R $Repo

Write-Host "Configurando SUPABASE_SERVICE_ROLE_KEY..."
$ServiceRoleKey | & $Gh secret set SUPABASE_SERVICE_ROLE_KEY -R $Repo

Write-Host "Disparando workflow Sync WinGet Catalog (full_sync=true)..."
& $Gh workflow run "sync-winget-catalog.yml" -R $Repo -f full_sync=true

Write-Host ""
Write-Host "Workflow disparado. Acompanhe em:"
Write-Host "  https://github.com/$Repo/actions/workflows/sync-winget-catalog.yml"
Write-Host ""
Write-Host "Após concluir, valide no Supabase SQL Editor:"
Write-Host "  select count(*) from public.packages;"
