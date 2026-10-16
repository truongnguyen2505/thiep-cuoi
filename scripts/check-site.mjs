import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function checkSite(root = projectRoot) {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
  const preview = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.preview.jsonc'), 'utf8'));
  for (const config of [cfg, preview]) {
    assert(config.assets?.directory === './dist', 'assets.directory cần là ./dist.');
    assert(config.main === 'src/worker.mjs', 'main cần là src/worker.mjs.');
    assert(fs.existsSync(path.join(root, config.main)), 'Thiếu tệp Worker định tuyến.');
    assert(config.assets.binding === 'ASSETS', 'Thiếu binding ASSETS.');
    assert(config.assets.run_worker_first === true, 'Cần chạy Worker trước khi phục vụ assets.');
  }
  assert(preview.name !== cfg.name, 'Tên Worker xem thử phải khác Worker chính.');
  const dist = path.resolve(root, cfg.assets.directory);
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filename = path.join(dir, entry.name);
      assert(!entry.isSymbolicLink(), 'Không dùng liên kết tệp trong dist: ' + filename);
      if (entry.isDirectory()) walk(filename);
      else if (entry.isFile()) files.push(filename);
    }
  }
  walk(dist);
  assert(files.length <= 20000, 'Số tệp vượt ngưỡng 20.000 của gói Free.');
  for (const filename of files) {
    assert(fs.statSync(filename).size <= 25 * 1024 * 1024, 'Tệp lớn hơn 25 MiB: ' + filename);
  }
  function localFile(ref) {
    if (/^(https?:|data:|#)/i.test(ref)) return;
    assert(!/^(blob:|file:|[a-z]:[\\/])/i.test(ref), 'Đường dẫn chưa dùng được trên Internet: ' + ref);
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]).replace(/^\//, '');
    const parts = clean.split('/');
    assert(!parts.includes('..'), 'Đường dẫn vượt khỏi dist: ' + ref);
    let current = dist;
    for (const part of parts) {
      assert(fs.readdirSync(current).includes(part), 'Thiếu tệp hoặc sai chữ hoa/thường: ' + ref);
      current = path.join(current, part);
    }
    assert(fs.statSync(current).isFile(), 'Không phải tệp: ' + ref);
  }
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert(/<body\s+class="invitation-locked">/.test(html), 'Trang cần được khóa trước khi khách mở thiệp.');
  assert(/id="invitation-gate"/.test(html), 'Thiếu màn hình phong thư mở thiệp.');
  assert(/id="invitation-open"/.test(html), 'Thiếu nút mở thiệp.');
  for (const match of html.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)="([^"]+)"/gi)) localFile(match[1]);
  const css = fs.readFileSync(path.join(dist, 'styles.css'), 'utf8');
  for (const match of css.matchAll(/url\(\s*['"]?(assets\/fonts\/[^'")\s]+)['"]?\s*\)/g)) localFile(match[1]);
  for (const name of ['app.js', 'config.js']) {
    new vm.Script(fs.readFileSync(path.join(dist, name), 'utf8'), { filename: name });
  }
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(dist, 'config.js'), 'utf8'), context, { timeout: 1000 });
  const info = context.window.WEDDING_CONFIG;
  assert(info?.groom && info?.bride, 'Thiếu tên cô dâu hoặc chú rể.');
  assert(Array.isArray(info.photos) && info.photos.length, 'Cần ít nhất một ảnh cưới.');
  info.photos.forEach(localFile);
  for (const key of ['date', 'receptionDate']) {
    const value = info[key];
    assert(/^\d{4}-\d{2}-\d{2}$/.test(value), 'Sai định dạng ' + key);
    const d = new Date(value + 'T12:00:00Z');
    assert(!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value, 'Ngày không hợp lệ: ' + key);
  }
  for (const key of ['ceremonyTime', 'receptionTime']) {
    assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(info[key]), 'Giờ không hợp lệ: ' + key);
  }
  assert(info.editorEnabled === false, 'Bản gửi khách cần editorEnabled: false.');
  assert(info.personalized === true, 'Bản release cần personalized: true để dùng dữ liệu từ source.');
  assert(!/id="wishes"/.test(html), 'Phần lời chúc đã được yêu cầu bỏ.');
  const bytes = files.reduce((n, file) => n + fs.statSync(file).size, 0);
  console.log(`PASS: ${files.length} tệp, ${(bytes / 1024 / 1024).toFixed(2)} MiB; mã JavaScript, ảnh và ngày giờ hợp lệ.`);
  return { files: files.length, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { checkSite(); } catch (error) { console.error('LỖI: ' + error.message); process.exitCode = 1; }
}
