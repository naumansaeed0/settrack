import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
test('predeploy rejects dirty trees and never builds after test failure',()=>{
 const cwd=mkdtempSync(join(tmpdir(),'settrack-deploy-'));mkdirSync(join(cwd,'scripts'));copyFileSync(resolve('scripts/check-clean.mjs'),join(cwd,'scripts/check-clean.mjs'));
 writeFileSync(join(cwd,'package.json'),JSON.stringify({scripts:{predeploy:'node scripts/check-clean.mjs && npm test && npm run build',test:'node -e "process.exit(1)"',build:'node -e "require(\'fs\').writeFileSync(\'built\',\'yes\')"'}}));
 const git=(...args:string[])=>spawnSync('git',args,{cwd,encoding:'utf8'});git('init');
 assert.notEqual(spawnSync('node',['scripts/check-clean.mjs'],{cwd}).status,0);
 git('add','.');git('-c','user.name=Test','-c','user.email=test@example.com','commit','-m','fixture');assert.equal(spawnSync('node',['scripts/check-clean.mjs'],{cwd}).status,0);
 assert.notEqual(spawnSync('npm',['run','predeploy'],{cwd,env:{...process.env,npm_config_cache:'/tmp/settrack-npm-cache'}}).status,0);assert.equal(existsSync(join(cwd,'built')),false);
});

test('publishing replaces generated files, names the source commit and preserves main', () => {
 const root = mkdtempSync(join(tmpdir(), 'settrack-publish-'));
 const remote = join(root, 'remote.git');
 const cwd = join(root, 'source');
 mkdirSync(cwd);
 function run(command: string, args: string[], directory = cwd) {
  const result = spawnSync(command, args, { cwd: directory, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
 }
 run('git', ['init', '--bare', remote]);
 run('git', ['init', '-b', 'main']);
 run('git', ['config', 'user.name', 'SetTrack test']);
 run('git', ['config', 'user.email', 'test@example.com']);
 run('git', ['remote', 'add', 'origin', remote]);
 writeFileSync(join(cwd, 'source.ts'), 'export const source = true;');
 writeFileSync(join(cwd, '.gitignore'), 'dist/\nnode_modules/\n');
 writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: 'settrack-deploy-fixture', private: true }));
 run('git', ['add', '.']);
 run('git', ['commit', '-m', 'Polish workout names']);
 run('git', ['push', 'origin', 'main']);
 const main = run('git', ['rev-parse', 'HEAD']);
 run('git', ['checkout', '-b', 'gh-pages']);
 mkdirSync(join(cwd, '.github', 'workflows'), { recursive: true });
 writeFileSync(join(cwd, '.github', 'workflows', 'pages.yml'), 'legacy workflow');
 writeFileSync(join(cwd, 'obsolete.js'), 'old build');
 run('git', ['add', '.']);
 run('git', ['commit', '-m', 'Legacy deployment']);
 run('git', ['push', 'origin', 'gh-pages']);
 run('git', ['checkout', 'main']);
 mkdirSync(join(cwd, 'dist', 'assets'), { recursive: true });
 writeFileSync(join(cwd, 'dist', '.nojekyll'), '');
 writeFileSync(join(cwd, 'dist', 'index.html'), '<script src="/settrack/assets/app.js"></script>');
 writeFileSync(join(cwd, 'dist', 'assets', 'app.js'), 'new build');
 run('node', [resolve('scripts/deploy.mjs')]);
 assert.equal(run('git', ['--git-dir', remote, 'rev-parse', 'main']), main);
 assert.equal(run('git', ['branch', '--show-current']), 'main');
 const files = run('git', ['--git-dir', remote, 'ls-tree', '-r', '--name-only', 'gh-pages']).split('\n');
 assert.deepEqual(files, ['.nojekyll', 'assets/app.js', 'index.html']);
 const message = run('git', ['--git-dir', remote, 'log', '-1', '--format=%s', 'gh-pages']);
 assert.match(message, /^Deploy SetTrack from [0-9a-f]+: Polish workout names$/);
});
