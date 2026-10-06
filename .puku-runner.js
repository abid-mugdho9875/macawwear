const { spawn } = require('node:child_process');

function run(label, cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: false, windowsHide: true });
    process.stdout.write(`\n===== ${label} =====\n`);
    child.stdout.on('data', (d) => process.stdout.write(d));
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('close', (code) => {
      process.stdout.write(`\n----- exit ${code} -----\n`);
      resolve(code);
    });
    child.on('error', (e) => {
      process.stderr.write(`spawn error: ${e}\n`);
      resolve(-1);
    });
  });
}

(async () => {
  const dir = 'C:\\Users\\Admin\\Downloads\\Macaw';
  const steps = [
    ['typecheck', 'cmd.exe', ['/c', `cd /d "${dir}" && npm --no-color run typecheck`]],
    ['lint', 'cmd.exe', ['/c', `cd /d "${dir}" && npm --no-color run lint`]],
    ['test', 'cmd.exe', ['/c', `cd /d "${dir}" && npm --no-color test`]],
    ['build', 'cmd.exe', ['/c', `cd /d "${dir}" && npm --no-color run build`]],
  ];
  for (const [label, cmd, args] of steps) {
    const code = await run(label, cmd, args);
    if (code !== 0) {
      process.stdout.write(`Step ${label} failed with ${code}\n`);
      process.exit(code);
    }
  }
  process.stdout.write(`\nALL OK\n`);
})();