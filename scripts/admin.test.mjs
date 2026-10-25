import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const guestSource = fs.readFileSync(new URL('../dist/guest.js', import.meta.url), 'utf8');
const adminSource = fs.readFileSync(new URL('../dist/admin.js', import.meta.url), 'utf8');

function openAdmin({ writeText, legacyCopy = false } = {}) {
  const elements = {};
  let selection = '';
  for (const id of ['guest-link-form', 'guest-name', 'guest-link', 'guest-preview',
    'copy-guest-link', 'preview-guest-link', 'copy-status']) {
    elements[id] = {
      value: '', textContent: '', disabled: false, dataset: {}, attributes: {}, handlers: {},
      addEventListener(name, handler) { this.handlers[name] = handler; },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      focus() {},
      select() { selection = this.value; },
      setSelectionRange() {},
      reportValidity() { return true; }
    };
  }
  const context = {
    URL,
    navigator: writeText ? { clipboard: { writeText } } : {},
    window: {
      location: { href: 'http://127.0.0.1:8787/thiep-cuoi/admin/' },
      addEventListener() {}
    },
    document: {
      querySelector(selector) {
        assert.ok(elements[selector.slice(1)], 'Unknown form element: ' + selector);
        return elements[selector.slice(1)];
      },
      execCommand(command) { assert.equal(command, 'copy'); return legacyCopy; }
    }
  };
  vm.runInNewContext(guestSource, context);
  vm.runInNewContext(adminSource, context);
  return {
    elements,
    enterName(value) {
      elements['guest-name'].value = value;
      elements['guest-name'].handlers.input();
    },
    submit() { return elements['guest-link-form'].handlers.submit({ preventDefault() {} }); },
    selectedText() { return selection; }
  };
}

test('admin generates a live invitation link and clears it when the name is removed', () => {
  const page = openAdmin();
  assert.equal(page.elements['copy-guest-link'].disabled, true);
  page.enterName('  Anh Nguyễn & chị Hà  ');
  assert.equal(page.elements['guest-preview'].textContent, 'Anh Nguyễn & chị Hà');
  const link = new URL(page.elements['guest-link'].value);
  assert.equal(link.pathname, '/thiep-cuoi/');
  assert.equal(link.searchParams.get('to'), 'Anh Nguyễn & chị Hà');
  assert.equal(page.elements['preview-guest-link'].href, link.href);
  assert.equal(page.elements['copy-guest-link'].disabled, false);
  page.enterName('   ');
  assert.equal(page.elements['guest-link'].value, '');
  assert.equal(page.elements['guest-preview'].textContent, 'Quý khách');
  assert.equal(page.elements['preview-guest-link'].attributes['aria-disabled'], 'true');
  assert.equal(page.elements['copy-guest-link'].disabled, true);
});

test('copy sends the generated link to the clipboard and reports success', async () => {
  let clipboard;
  const page = openAdmin({ async writeText(value) { clipboard = value; } });
  page.enterName('Gia đình anh Minh');
  await page.submit();
  assert.equal(clipboard, page.elements['guest-link'].value);
  assert.equal(page.elements['copy-status'].dataset.state, 'success');
  assert.equal(page.elements['copy-guest-link'].disabled, false);
});

test('copy falls back to selecting the link when the clipboard API is unavailable', async () => {
  const page = openAdmin({ legacyCopy: true });
  page.enterName('Chị Hà');
  await page.submit();
  assert.equal(page.selectedText(), page.elements['guest-link'].value);
  assert.equal(page.elements['copy-status'].dataset.state, 'success');
});

test('denied clipboard access leaves the link available for manual copying', async () => {
  const page = openAdmin({ async writeText() { throw new Error('Permission denied'); } });
  page.enterName('Bạn An');
  await page.submit();
  assert.equal(page.elements['copy-status'].dataset.state, 'error');
  assert.equal(page.selectedText(), page.elements['guest-link'].value);
  assert.equal(page.elements['copy-guest-link'].disabled, false);
});
