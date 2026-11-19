import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';

export default defineConfig({
  base: '/settrack/',
  plugins: [{
    name: 'offline-app-shell',
    apply: 'build',
    async closeBundle() {
      await writeFile('dist/.nojekyll', '');
      const files = ['index.html', 'mark.svg', ...(await readdir('dist/assets')).map((file) => `assets/${file}`)].sort();
      const stamp = createHash('sha256');
      for (const file of files) stamp.update(await readFile(`dist/${file}`));
      const version = stamp.digest('hex').slice(0, 12);
      const worker = await readFile('src/sw.js', 'utf8');
      await writeFile('dist/sw.js', `const version = ${JSON.stringify(version)};\nconst files = ${JSON.stringify(files.map((file) => `/settrack/${file}`))};\n${worker}`);
    },
  }],
});
