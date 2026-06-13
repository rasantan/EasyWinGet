const PS1_BEGIN = "::EWG_PS1_BEGIN";
const PS1_END = "::EWG_PS1_END";

const EXTRACT_COMMAND = [
  "$ErrorActionPreference='Stop'",
  "try{",
  "$t=[IO.File]::ReadAllText($env:EWG_SELF,[Text.UTF8Encoding]::new($false))",
  "$mb='::EWG'+'_PS1_BEGIN'",
  "$me='::EWG'+'_PS1_END'",
  "$a=$t.IndexOf($mb)",
  "$b=$t.IndexOf($me)",
  "if($a -lt 0 -or $b -le $a){throw 'Embedded script not found.'}",
  "$s=$t.Substring($a+$mb.Length,$b-$a-$mb.Length)",
  "$f=Join-Path $env:TEMP ('ewg-'+[guid]::NewGuid().ToString('N')+'.ps1')",
  "[IO.File]::WriteAllText($f,$s,[Text.UTF8Encoding]::new($false))",
  "Unblock-File -LiteralPath $f -ErrorAction SilentlyContinue",
  "try{& $f}finally{Remove-Item $f -Force -ErrorAction SilentlyContinue}",
  "}catch{",
  "Add-Type -AssemblyName System.Windows.Forms",
  "[void][System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'WinStack')",
  "exit 1}",
].join(";");

export function generateCmdLauncher(ps1Script: string, hash: string): string {
  if (ps1Script.includes(PS1_BEGIN) || ps1Script.includes(PS1_END)) {
    throw new Error("PS1 script contains launcher marker");
  }

  const ps = `"%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"`;

  return `@echo off
REM WinStack Installer | SHA-256: ${hash}
REM Double-click to install. Admin (UAC) and PowerShell policy are handled automatically.
setlocal
set "EWG_SELF=%~f0"
net session >nul 2>&1
if errorlevel 1 (
  ${ps} -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
${ps} -NoProfile -STA -ExecutionPolicy Bypass -Command "${EXTRACT_COMMAND}"
exit /b %ERRORLEVEL%

${PS1_BEGIN}
${ps1Script}
${PS1_END}
`;
}

export const LAUNCHER_FILENAME = "winstack-install.cmd";
