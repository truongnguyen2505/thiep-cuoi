import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const context = { window: {}, URL };
vm.runInNewContext(fs.readFileSync(new URL('../dist/guest.js', import.meta.url), 'utf8'), context);
const { normalizeName, nameFromURL, createLink, maxLength } = context.window.WeddingGuest;

test('recipient names keep Vietnamese accents and normalize whitespace', () => {
  assert.equal(normalizeName('  Anh  Nguyễn Văn Minh \n và\tgia đình  '), 'Anh Nguyễn Văn Minh và gia đình');
  assert.equal(normalizeName('Thu\u0300y Quy\u0300nh'), 'Thùy Quỳnh');
  assert.equal(normalizeName('Anh\u0000Minh'), 'Anh Minh');
});

test('empty names remain empty and long names are bounded without splitting characters', () => {
  assert.equal(normalizeName(null), '');
  assert.equal(normalizeName(' \t\n '), '');
  assert.equal(Array.from(normalizeName('🌸'.repeat(maxLength + 1))).length, maxLength);
});

test('generated invitation links preserve the host, port and wedding mount', () => {
  for (const admin of [
    'http://127.0.0.1:8787/thiep-cuoi/admin',
    'http://127.0.0.1:8787/thiep-cuoi/admin/',
    'http://127.0.0.1:8787/thiep-cuoi/admin/index.html'
  ]) {
    const link = new URL(createLink(admin + '?old=1#form', 'Anh Minh'));
    assert.equal(link.origin, 'http://127.0.0.1:8787');
    assert.equal(link.pathname, '/thiep-cuoi/');
    assert.equal(link.searchParams.get('to'), 'Anh Minh');
    assert.equal(link.searchParams.has('old'), false);
    assert.equal(link.hash, '');
  }
});

test('preview hosts can generate invitations from the root admin page', () => {
  for (const path of ['/admin', '/admin/', '/admin/index.html']) {
    assert.equal(new URL(createLink('https://example.workers.dev' + path, 'Bạn An')).pathname, '/');
  }
});

test('Vietnamese names and URL separators survive a generated-link round trip', () => {
  const name = 'Gia đình anh Nguyễn & chị Hà + bé An / #1?';
  const link = createLink('https://truongparker.io.vn/thiep-cuoi/admin/', name);
  assert.equal(nameFromURL(link), name);
  assert.equal(new URL(link).searchParams.size, 1);
  assert.equal(new URL(link).hash, '');
});

test('each URL supplies its own recipient and a missing name has no stale value', () => {
  assert.equal(nameFromURL('https://example.com/?to=Anh+Minh'), 'Anh Minh');
  assert.equal(nameFromURL('https://example.com/?to=Ch%E1%BB%8B+H%C3%A0'), 'Chị Hà');
  assert.equal(nameFromURL('https://example.com/'), '');
  assert.equal(nameFromURL('https://example.com/?to=%20%20'), '');
});

test('markup-like names are kept as plain strings and cannot add URL parameters', () => {
  const name = '<img src=x onerror=alert(1)> & admin=true';
  const link = createLink('https://example.com/admin/', name);
  assert.equal(nameFromURL(link), name);
  assert.equal(new URL(link).searchParams.has('admin'), false);
});