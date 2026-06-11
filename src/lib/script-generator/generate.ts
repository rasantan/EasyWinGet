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
# EasyWinGet Install Script
# Generated: ${generatedAt} | Bundle: "${escapedBundle}" | Locale: ${locale}
# Packages: ${packageCount} | SHA-256: ${HASH_PLACEHOLDER}
# ============================================================
# AUDIT: Complete package list below. No hidden operations.
# Commands: winget install --id <id> -e --accept-source-agreements --accept-package-agreements
# ============================================================

$EasyWinGetManifest = @'
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

$script:Cancelled = $false
$script:LogEntries = New-Object System.Collections.Generic.List[string]

$form = New-Object System.Windows.Forms.Form
$form.Text = $GuiStrings.title
$form.Size = New-Object System.Drawing.Size(640, 520)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$form.MaximizeBox = $false
$form.MinimizeBox = $false

$labelPackages = New-Object System.Windows.Forms.Label
$labelPackages.Text = $GuiStrings.packageList
$labelPackages.Location = New-Object System.Drawing.Point(12, 12)
$labelPackages.Size = New-Object System.Drawing.Size(600, 20)
$form.Controls.Add($labelPackages)

$listBox = New-Object System.Windows.Forms.ListBox
$listBox.Location = New-Object System.Drawing.Point(12, 36)
$listBox.Size = New-Object System.Drawing.Size(600, 260)
$listBox.SelectionMode = [System.Windows.Forms.SelectionMode]::None
foreach ($pkg in $EasyWinGetManifest.packages) {
  [void]$listBox.Items.Add(("{0} - {1} (v{2}) [{3}]" -f $GuiStrings.pending, $pkg.name, $pkg.version, $pkg.id))
}
$form.Controls.Add($listBox)

$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(12, 308)
$progressBar.Size = New-Object System.Drawing.Size(600, 24)
$progressBar.Minimum = 0
$progressBar.Maximum = 100
$form.Controls.Add($progressBar)

$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text = $GuiStrings.installAll
$btnInstall.Location = New-Object System.Drawing.Point(12, 348)
$btnInstall.Size = New-Object System.Drawing.Size(140, 32)
$form.Controls.Add($btnInstall)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = $GuiStrings.cancel
$btnCancel.Location = New-Object System.Drawing.Point(160, 348)
$btnCancel.Size = New-Object System.Drawing.Size(120, 32)
$form.Controls.Add($btnCancel)

$btnLog = New-Object System.Windows.Forms.Button
$btnLog.Text = $GuiStrings.viewLog
$btnLog.Location = New-Object System.Drawing.Point(288, 348)
$btnLog.Size = New-Object System.Drawing.Size(120, 32)
$form.Controls.Add($btnLog)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Location = New-Object System.Drawing.Point(12, 392)
$statusLabel.Size = New-Object System.Drawing.Size(600, 40)
$statusLabel.Text = ""
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
  $count = @($EasyWinGetManifest.packages).Count
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
  $total = @($EasyWinGetManifest.packages).Count
  $index = 0

  foreach ($pkg in $EasyWinGetManifest.packages) {
    if ($script:Cancelled) {
      break
    }

    $index++
    $progressBar.Value = [int](([math]::Max(0, $index - 1)) / $total * 100)
    $statusLabel.Text = ("{0} {1}..." -f $GuiStrings.installing, $pkg.name)
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

    $output = & winget @wingetArgs 2>&1 | Out-String
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
      $listBox.Items[$index - 1] = ("{0} - {1} (v{2}) [{3}]" -f $GuiStrings.success, $pkg.name, $pkg.version, $pkg.id)
      [void]$script:LogEntries.Add(("{0}: {1}" -f $GuiStrings.success, $pkg.name))
    }
    else {
      $listBox.Items[$index - 1] = ("{0} - {1} (v{2}) [{3}]" -f $GuiStrings.failed, $pkg.name, $pkg.version, $pkg.id)
      [void]$script:LogEntries.Add(("{0}: {1} (exit {2}){3}{4}" -f $GuiStrings.failed, $pkg.name, $exitCode, [Environment]::NewLine, $output.Trim()))
    }

    [void]$form.Refresh()
  }

  $progressBar.Value = 100
  $statusLabel.Text = $GuiStrings.completed
  $btnCancel.Enabled = $true
  $btnCancel.Text = $GuiStrings.cancel
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
