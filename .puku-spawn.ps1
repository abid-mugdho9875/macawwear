$dir = 'C:\Users\Admin\Downloads\Macaw'
$log = Join-Path $env:TEMP 'macaw_verify.log'
if (Test-Path $log) { Remove-Item $log }
Add-Content -Path $log -Value "=== spawn @ $(Get-Date -Format o) ==="

$jobs = @(
  @{ name = 'typecheck'; cmd = 'npm'; args = @('--no-color', 'run', 'typecheck') },
  @{ name = 'lint';      cmd = 'npm'; args = @('--no-color', 'run', 'lint') },
  @{ name = 'test';      cmd = 'npm'; args = @('--no-color', 'test') },
  @{ name = 'build';     cmd = 'npm'; args = @('--no-color', 'run', 'build') }
)

foreach ($j in $jobs) {
  Add-Content -Path $log -Value "`n===== $($j.name) ====="
  $p = Start-Process -FilePath $j.cmd -ArgumentList $j.args -WorkingDirectory $dir `
        -Wait -PassThru -NoNewWindow `
        -RedirectStandardOutput "$env:TEMP\macaw_$($j.name).out" `
        -RedirectStandardError  "$env:TEMP\macaw_$($j.name).err"
  Add-Content -Path $log -Value "exit=$($p.ExitCode)"
  if ($p.ExitCode -ne 0) {
    Add-Content -Path $log -Value "STOP on $($j.name) (exit=$($p.ExitCode))"
    break
  }
}
Add-Content -Path $log -Value "`n=== DONE @ $(Get-Date -Format o) ==="
exit 0