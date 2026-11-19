import { execFileSync } from 'node:child_process';
if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) {
  console.error('Deployment stopped: commit or stash all working-tree changes first.');
  process.exit(1);
}
