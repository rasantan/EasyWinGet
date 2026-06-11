$env:EWG_SELF = 'C:\Users\SILIBRINA\Downloads\easywinget-install.cmd'
$ErrorActionPreference = 'Stop'
$t = [IO.File]::ReadAllText($env:EWG_SELF, [Text.UTF8Encoding]::new($false))
$mb = '::EWG' + '_PS1_BEGIN'
$me = '::EWG' + '_PS1_END'
$a = $t.IndexOf($mb)
$b = $t.IndexOf($me)
if ($a -lt 0 -or $b -le $a) { Write-Host 'FAIL: markers'; exit 1 }
$s = $t.Substring($a + $mb.Length, $b - $a - $mb.Length)
$null = [System.Management.Automation.PSParser]::Tokenize($s, [ref]$null)
$checks = @(
  $s.Contains('$EasyWinGetManifest'),
  $s.Contains('Git.Git'),
  $s.Contains('7zip.7zip'),
  $s.Contains('System.Windows.Forms'),
  $s.Contains('winget @wingetArgs')
)
if ($checks -contains $false) { Write-Host 'FAIL: content'; exit 1 }
Write-Host "OK extract len=$($s.Length) packages=2 parse=valid"
