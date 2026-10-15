import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import worker from '../src/worker.mjs';

const origin = 'https://thiep-cuoi.example.workers.dev';

test('the mount URL redirects to a trailing slash and preserves its query', async () => {
  const response = await worker.fetch(new Request(origin + '/thiep-cuoi?guest=ban'), {
    ASSETS: { fetch() { assert.fail('A redirect must not read assets.'); } }
  });
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('Location'), origin + '/thiep-cuoi/?guest=ban');
});

test('the mounted page, scripts and photos resolve to existing asset paths', async () => {
  for (const file of ['', 'styles.css', 'config.js', 'app.js', 'assets/wedding-portrait.webp']) {
    let received;
    const response = await worker.fetch(new Request(origin + '/thiep-cuoi/' + file), {
      ASSETS: { fetch(request) { received = request; return new Response('asset'); } }
    });
    assert.equal(new URL(received.url).pathname, '/' + file);
    assert.equal(await response.text(), 'asset');
    assert.ok(fs.existsSync(new URL('../dist/' + (file || 'index.html'), import.meta.url)));
  }
});

test('asset requests preserve the method, headers and query string', async () => {
  let received;
  await worker.fetch(new Request(origin + '/thiep-cuoi/styles.css?v=2', {
    method: 'HEAD', headers: { 'If-None-Match': 'asset-tag' }
  }), {
    ASSETS: { fetch(request) { received = request; return new Response(null); } }
  });
  assert.equal(received.url, origin + '/styles.css?v=2');
  assert.equal(received.method, 'HEAD');
  assert.equal(received.headers.get('If-None-Match'), 'asset-tag');
});

test('workers.dev and preview can still serve the site at the root', async () => {
  for (const pathname of ['/', '/app.js', '/assets/wedding-garden.webp']) {
    await worker.fetch(new Request(origin + pathname), {
      ASSETS: { fetch(request) {
        assert.equal(request.url, origin + pathname);
        return new Response('asset');
      } }
    });
  }
});

test('missing assets keep their 404 response', async () => {
  const missing = new Response('Not found', { status: 404 });
  const response = await worker.fetch(new Request(origin + '/thiep-cuoi/missing.js'), {
    ASSETS: { fetch() { return missing; } }
  });
  assert.equal(response, missing);
});

test('asset redirects stay under /thiep-cuoi/ and retain response headers', async () => {
  for (const location of ['/?v=2', origin + '/?v=2']) {
    const response = await worker.fetch(new Request(origin + '/thiep-cuoi/index.html'), {
      ASSETS: { fetch() {
        return new Response(null, {
          status: 307, headers: { Location: location, 'Cache-Control': 'no-cache' }
        });
      } }
    });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('Location'), origin + '/thiep-cuoi/?v=2');
    assert.equal(response.headers.get('Cache-Control'), 'no-cache');
  }
});

test('external redirects are preserved', async () => {
  const redirect = Response.redirect('https://example.org/photo', 302);
  const response = await worker.fetch(new Request(origin + '/thiep-cuoi/photo'), {
    ASSETS: { fetch() { return redirect; } }
  });
  assert.equal(response, redirect);
});

test('production routes cover only the invitation path and preview has no domain routes', () => {
  const production = JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  const preview = JSON.parse(fs.readFileSync(new URL('../wrangler.preview.jsonc', import.meta.url), 'utf8'));
  assert.deepEqual(production.routes, [
    { pattern: 'truongparker.io.vn/thiep-cuoi', zone_name: 'truongparker.io.vn' },
    { pattern: 'truongparker.io.vn/thiep-cuoi/*', zone_name: 'truongparker.io.vn' }
  ]);
  assert.ok(!preview.routes?.length);
});
