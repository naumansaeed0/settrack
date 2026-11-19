import { execFileSync } from 'node:child_process';
import { publish } from 'gh-pages';

const source = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const title = execFileSync('git', ['log', '-1', '--format=%s'], { encoding: 'utf8' }).trim();
const message = `Deploy SetTrack from ${source}: ${title}`;

await new Promise((resolve, reject) => {
  publish('dist', {
    branch: 'gh-pages',
    dotfiles: true,
    remove: '{**/*,.github/**,.gitignore}',
    message,
  }, error => error ? reject(error) : resolve());
});
console.log(`Published ${message}`);
