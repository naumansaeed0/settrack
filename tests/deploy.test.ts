import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
test('predeploy rejects dirty trees and never builds after test failure',()=>{
 const cwd=mkdtempSync(join(tmpdir(),'settrack-deploy-'));mkdirSync(join(cwd,'scripts'));copyFileSync(resolve('scripts/check-clean.mjs'),join(cwd,'scripts/check-clean.mjs'));
 writeFileSync(join(cwd,'package.json'),JSON.stringify({scripts:{predeploy:'node scripts/check-clean.mjs && npm test && npm run build',test:'node -e "process.exit(1)"',build:'node -e "require(\'fs\').writeFileSync(\'built\',\'yes\')"'}}));
 const git=(...args:string[])=>spawnSync('git',args,{cwd,encoding:'utf8'});git('init');
 assert.notEqual(spawnSync('node',['scripts/check-clean.mjs'],{cwd}).status,0);
 git('add','.');git('-c','user.name=Test','-c','user.email=test@example.com','commit','-m','fixture');assert.equal(spawnSync('node',['scripts/check-clean.mjs'],{cwd}).status,0);
 assert.notEqual(spawnSync('npm',['run','predeploy'],{cwd,env:{...process.env,npm_config_cache:'/tmp/settrack-npm-cache'}}).status,0);assert.equal(existsSync(join(cwd,'built')),false);
});
