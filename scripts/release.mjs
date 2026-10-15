import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkSite, projectRoot } from './check-site.mjs';

try {
  checkSite();
  const cli = path.join(projectRoot, 'node_modules/wrangler/bin/wrangler.js');
  if (!fs.existsSync(cli)) throw new Error('Chạy npm.cmd ci trước khi release.');
  const args = ['deploy'];
  if (process.argv.includes('--preview')) args.push('--config', 'wrangler.preview.jsonc');
  console.log(process.argv.includes('--preview')
    ? 'Đang triển khai Worker xem thử riêng…'
    : 'Đang triển khai bản chính lên Cloudflare…');
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: projectRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error('Chưa release: ' + error.message);
  process.exitCode = 1;
}
