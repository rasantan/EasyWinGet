import { createHash } from "crypto";

import { generateCmdLauncher } from "./launcher";
import { getGuiStrings } from "./strings";
import type {
  GenerateScriptInput,
  GenerateScriptResult,
  ScriptManifest,
} from "./types";

const HASH_PLACEHOLDER = "0".repeat(64);

function psSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildGuiStringsBlock(locale: GenerateScriptInput["locale"]): string {
  const strings = getGuiStrings(locale);
  const entries = Object.entries(strings).map(
    ([key, value]) => `  ${key} = ${psSingleQuote(value)}`,
  );
  return `$GuiStrings = @{\n${entries.join("\n")}\n}`;
}

function buildManifest(input: GenerateScriptInput): ScriptManifest {
  return {
    version: "1.0",
    locale: input.locale,
    generated_at: new Date().toISOString(),
    bundle_name: input.bundle_name ?? null,
    packages: input.packages.map((pkg) => ({
      id: pkg.package_id,
      name: pkg.name,
      version: pkg.version,
    })),
  };
}

function buildPowerShellBody(
  manifestJson: string,
  guiStringsBlock: string,
  packageCount: number,
  locale: string,
  bundleLabel: string,
  generatedAt: string,
): string {
  const escapedBundle = bundleLabel.replace(/"/g, '\\"');

  return `# ============================================================
# WinStack Install Script
# Generated: ${generatedAt} | Stack: "${escapedBundle}" | Locale: ${locale}
# Packages: ${packageCount} | SHA-256: ${HASH_PLACEHOLDER}
# ============================================================
# AUDIT: Complete package list below. No hidden operations.
# Commands: winget install --id <id> -e --accept-source-agreements --accept-package-agreements
# ============================================================

$WinStackManifest = @'
${manifestJson}
'@ | ConvertFrom-Json

${guiStringsBlock}

Unblock-File -Path $MyInvocation.MyCommand.Path -ErrorAction SilentlyContinue

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Add-Type -AssemblyName System.Windows.Forms
  [void][System.Windows.Forms.MessageBox]::Show(
    $GuiStrings.wingetMissing,
    $GuiStrings.title,
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  )
  exit 1
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

$script:Cancelled = $false
$script:LogEntries = New-Object System.Collections.Generic.List[string]
$script:WingetAlreadyInstalledCodes = @(-1978335189, -1978335135)

function ConvertTo-ByteSize {
  param([double]$Value, [string]$Unit)
  switch ($Unit.ToUpper()) {
    'KB' { return $Value * 1024 }
    'MB' { return $Value * 1048576 }
    'GB' { return $Value * 1073741824 }
    default { return $Value }
  }
}

function Format-ByteSize {
  param([double]$Bytes)
  if ($Bytes -ge 1073741824) { return ("{0:N1} GB" -f ($Bytes / 1073741824)) }
  if ($Bytes -ge 1048576) { return ("{0:N1} MB" -f ($Bytes / 1048576)) }
  if ($Bytes -ge 1024) { return ("{0:N0} KB" -f ($Bytes / 1024)) }
  return ("{0:N0} B" -f $Bytes)
}

function Get-WingetInstallOutcome {
  param([int]$ExitCode)
  if ($ExitCode -eq 0) { return 'success' }
  if ($script:WingetAlreadyInstalledCodes -contains $ExitCode) { return 'alreadyInstalled' }
  return 'failed'
}

function Invoke-WingetWithProgress {
  param(
    [string[]]$Arguments,
    [int]$ListIndex,
    [string]$PkgName,
    [string]$PkgVersion,
    [string]$PkgId
  )

  $progressPattern = '(\\d+(?:\\.\\d+)?)\\s*(KB|MB|GB|B)\\s*/\\s*(\\d+(?:\\.\\d+)?)\\s*(KB|MB|GB|B)'
  $spinnerPattern = '^\\s+[-/|\\\\]\\s+$'
  $logLines = New-Object System.Collections.Generic.List[string]
  $tempLog = Join-Path $env:TEMP ('ewg-winget-' + [guid]::NewGuid().ToString('N') + '.log')
  New-Item -Path $tempLog -ItemType File -Force | Out-Null

  $state = @{
    LastRead = 0
    TotalLabel = ''
    SpeedLabel = '-'
    FinalSizeLabel = ''
    LastBytes = 0.0
    LastTime = [DateTime]::UtcNow
  }
  $startTime = $state.LastTime

  function Update-WingetLine {
    param([string]$Line)
    if ($Line -match $spinnerPattern) { return }
    $cleanLine = ($Line -replace '[^\\x20-\\x7E\\u00C0-\\u024F]', '').Trim()
    if ([string]::IsNullOrWhiteSpace($cleanLine)) { return }
    [void]$logLines.Add($cleanLine)
    if ($Line -match $progressPattern) {
      $curBytes = ConvertTo-ByteSize ([double]$Matches[1]) $Matches[2]
      $totBytes = ConvertTo-ByteSize ([double]$Matches[3]) $Matches[4]
      $now = [DateTime]::UtcNow
      $elapsed = ($now - $state.LastTime).TotalSeconds
      if ($elapsed -gt 0.1 -and $curBytes -gt $state.LastBytes) {
        $state.SpeedLabel = (Format-ByteSize (($curBytes - $state.LastBytes) / $elapsed)) + '/s'
        $state.LastBytes = $curBytes
        $state.LastTime = $now
      }
      $currentLabel = Format-ByteSize $curBytes
      $state.TotalLabel = Format-ByteSize $totBytes
      $state.FinalSizeLabel = $state.TotalLabel
      $metricsLabel.Text = ($GuiStrings.downloadMetrics -f $currentLabel, $state.TotalLabel, $state.SpeedLabel)
      $listBox.Items[$ListIndex] = ("{0} - {1} (v{2}) [{3}] · {4}/{5}" -f $GuiStrings.installing, $PkgName, $PkgVersion, $PkgId, $currentLabel, $state.TotalLabel)
    }
  }

  function Read-NewWingetLogLines {
    if (-not (Test-Path -LiteralPath $tempLog)) { return }
    $content = Get-Content -LiteralPath $tempLog -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($null -eq $content) { return }
    if ($content -is [string]) { $content = @($content) }
    for ($i = $state.LastRead; $i -lt $content.Count; $i++) {
      Update-WingetLine $content[$i]
    }
    $state.LastRead = $content.Count
  }

  $job = Start-Job -ArgumentList (,$Arguments), $tempLog -ScriptBlock {
    param($WingetArgs, $LogPath)
    try {
      & winget @WingetArgs 2>&1 | ForEach-Object {
        Add-Content -LiteralPath $LogPath -Value $_.ToString() -Encoding UTF8
      }
      return $LASTEXITCODE
    }
    catch {
      Add-Content -LiteralPath $LogPath -Value $_.Exception.Message -Encoding UTF8
      return 1
    }
  }

  try {
    while ($job.State -eq 'Running') {
      Read-NewWingetLogLines
      if ([string]::IsNullOrWhiteSpace($state.TotalLabel)) {
        $elapsedSec = [int](([DateTime]::UtcNow - $startTime).TotalSeconds)
        $metricsLabel.Text = ($GuiStrings.elapsedTime -f $elapsedSec)
      }
      [void][System.Windows.Forms.Application]::DoEvents()
      Start-Sleep -Milliseconds 100
    }

    $exitCode = Receive-Job -Job $job -ErrorAction SilentlyContinue
    if ($null -eq $exitCode) { $exitCode = 1 }
    Read-NewWingetLogLines
  }
  finally {
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tempLog -Force -ErrorAction SilentlyContinue
  }

  if ([string]::IsNullOrWhiteSpace($state.TotalLabel)) {
    $elapsedSec = [int](([DateTime]::UtcNow - $startTime).TotalSeconds)
    $metricsLabel.Text = ($GuiStrings.elapsedTime -f $elapsedSec)
  }

  return @{
    ExitCode = [int]$exitCode
    Output = ($logLines -join [Environment]::NewLine)
    FinalSize = $state.FinalSizeLabel
  }
}

$form = New-Object System.Windows.Forms.Form
$form.Text = $GuiStrings.title
$form.Size = New-Object System.Drawing.Size(640, 560)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

$labelPackages = New-Object System.Windows.Forms.Label
$labelPackages.Text = $GuiStrings.packageList
$labelPackages.Location = New-Object System.Drawing.Point(12, 12)
$labelPackages.Size = New-Object System.Drawing.Size(600, 20)
$labelPackages.Font = $form.Font
$form.Controls.Add($labelPackages)

$listBox = New-Object System.Windows.Forms.ListBox
$listBox.Location = New-Object System.Drawing.Point(12, 36)
$listBox.Size = New-Object System.Drawing.Size(600, 248)
$listBox.SelectionMode = [System.Windows.Forms.SelectionMode]::None
$listBox.Font = $form.Font
foreach ($pkg in $WinStackManifest.packages) {
  [void]$listBox.Items.Add(("{0} - {1} (v{2}) [{3}]" -f $GuiStrings.pending, $pkg.name, $pkg.version, $pkg.id))
}
$form.Controls.Add($listBox)

$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(12, 296)
$progressBar.Size = New-Object System.Drawing.Size(600, 24)
$progressBar.Minimum = 0
$progressBar.Maximum = 100
$form.Controls.Add($progressBar)

$metricsLabel = New-Object System.Windows.Forms.Label
$metricsLabel.Location = New-Object System.Drawing.Point(12, 328)
$metricsLabel.Size = New-Object System.Drawing.Size(600, 20)
$metricsLabel.Text = ''
$metricsLabel.Font = $form.Font
$form.Controls.Add($metricsLabel)

$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text = $GuiStrings.installAll
$btnInstall.Location = New-Object System.Drawing.Point(12, 356)
$btnInstall.Size = New-Object System.Drawing.Size(140, 32)
$form.Controls.Add($btnInstall)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = $GuiStrings.cancel
$btnCancel.Location = New-Object System.Drawing.Point(160, 356)
$btnCancel.Size = New-Object System.Drawing.Size(120, 32)
$form.Controls.Add($btnCancel)

$btnLog = New-Object System.Windows.Forms.Button
$btnLog.Text = $GuiStrings.viewLog
$btnLog.Location = New-Object System.Drawing.Point(288, 356)
$btnLog.Size = New-Object System.Drawing.Size(120, 32)
$form.Controls.Add($btnLog)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Location = New-Object System.Drawing.Point(12, 400)
$statusLabel.Size = New-Object System.Drawing.Size(600, 48)
$statusLabel.Text = ''
$statusLabel.Font = $form.Font
$form.Controls.Add($statusLabel)

function Show-InstallLog {
  $logText = ($script:LogEntries -join [Environment]::NewLine)
  if ([string]::IsNullOrWhiteSpace($logText)) {
    $logText = $GuiStrings.pending
  }
  [void][System.Windows.Forms.MessageBox]::Show(
    $logText,
    $GuiStrings.logTitle,
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
  )
}

$btnLog.Add_Click({ Show-InstallLog })

$btnCancel.Add_Click({
  $script:Cancelled = $true
  $form.Close()
})

$btnInstall.Add_Click({
  $count = @($WinStackManifest.packages).Count
  $answer = [System.Windows.Forms.MessageBox]::Show(
    ($GuiStrings.confirm -f $count),
    $GuiStrings.title,
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Question
  )
  if ($answer -ne [System.Windows.Forms.DialogResult]::Yes) {
    return
  }

  $btnInstall.Enabled = $false
  $btnCancel.Enabled = $false
  $total = @($WinStackManifest.packages).Count
  $index = 0
  $okCount = 0
  $failCount = 0

  foreach ($pkg in $WinStackManifest.packages) {
    if ($script:Cancelled) {
      break
    }

    $index++
    $progressBar.Value = [int](([math]::Max(0, $index - 1)) / $total * 100)
    $statusLabel.Text = ("{0} | {1}" -f ($GuiStrings.packageProgress -f $index, $total), ($GuiStrings.installing + ' ' + $pkg.name + '...'))
    $metricsLabel.Text = ''
    [void]$form.Refresh()

    $listBox.Items[$index - 1] = ("{0} - {1} (v{2}) [{3}]" -f $GuiStrings.installing, $pkg.name, $pkg.version, $pkg.id)
    [void]$script:LogEntries.Add(("{0} {1} ({2})" -f $GuiStrings.installing, $pkg.name, $pkg.id))

    $wingetArgs = @(
      'install',
      '--id', $pkg.id,
      '-e',
      '--accept-source-agreements',
      '--accept-package-agreements'
    )

    $result = Invoke-WingetWithProgress -Arguments $wingetArgs -ListIndex ($index - 1) -PkgName $pkg.name -PkgVersion $pkg.version -PkgId $pkg.id
    $outcome = Get-WingetInstallOutcome $result.ExitCode
    $sizeSuffix = ''
    if (-not [string]::IsNullOrWhiteSpace($result.FinalSize)) {
      $sizeSuffix = ' · ' + $result.FinalSize
    }

    switch ($outcome) {
      'success' {
        $okCount++
        $listBox.Items[$index - 1] = ("{0} - {1} (v{2}) [{3}]{4}" -f $GuiStrings.success, $pkg.name, $pkg.version, $pkg.id, $sizeSuffix)
        [void]$script:LogEntries.Add(("{0}: {1}{2}" -f $GuiStrings.success, $pkg.name, $sizeSuffix))
      }
      'alreadyInstalled' {
        $okCount++
        $listBox.Items[$index - 1] = ("{0} - {1} (v{2}) [{3}]" -f $GuiStrings.alreadyInstalled, $pkg.name, $pkg.version, $pkg.id)
        [void]$script:LogEntries.Add(("{0}: {1} (exit {2}){3}{4}" -f $GuiStrings.alreadyInstalled, $pkg.name, $result.ExitCode, [Environment]::NewLine, $result.Output.Trim()))
      }
      default {
        $failCount++
        $listBox.Items[$index - 1] = ("{0} - {1} (v{2}) [{3}]" -f $GuiStrings.failed, $pkg.name, $pkg.version, $pkg.id)
        [void]$script:LogEntries.Add(("{0}: {1} (exit {2}){3}{4}" -f $GuiStrings.failed, $pkg.name, $result.ExitCode, [Environment]::NewLine, $result.Output.Trim()))
      }
    }

    [void]$form.Refresh()
  }

  $progressBar.Value = 100
  $metricsLabel.Text = ''
  $statusLabel.Text = ("{0} {1}" -f $GuiStrings.completed, ($GuiStrings.summary -f $okCount, $failCount))
  $btnCancel.Enabled = $true
  $btnCancel.Text = $GuiStrings.close
  $form.AcceptButton = $btnCancel
})

[void]$form.ShowDialog()
`;
}

export function generateScript(input: GenerateScriptInput): GenerateScriptResult {
  const generatedAt = new Date().toISOString();
  const manifest = buildManifest(input);
  manifest.generated_at = generatedAt;

  const manifestJson = JSON.stringify(manifest, null, 2);
  const guiStringsBlock = buildGuiStringsBlock(input.locale);
  const bundleLabel = input.bundle_name ?? "";

  const scriptWithPlaceholder = buildPowerShellBody(
    manifestJson,
    guiStringsBlock,
    input.packages.length,
    input.locale,
    bundleLabel,
    generatedAt,
  );

  const hash = createHash("sha256")
    .update(scriptWithPlaceholder, "utf8")
    .digest("hex");

  const script = scriptWithPlaceholder.replace(HASH_PLACEHOLDER, hash);
  const launcher = generateCmdLauncher(script, hash).replace(/\n/g, "\r\n");

  return { script, launcher, hash };
}
