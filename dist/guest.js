(() => {
  'use strict';
  const maxLength = 120;

  function normalizeName(value) {
    const name = String(value ?? '').normalize('NFC')
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
      .replace(/\s+/gu, ' ').trim();
    return Array.from(name).slice(0, maxLength).join('');
  }

  function nameFromURL(value) {
    return normalizeName(new URL(value).searchParams.get('to'));
  }

  function createLink(pageURL, value) {
    const url = new URL(pageURL);
    url.pathname = url.pathname.replace(/\/admin(?:\/(?:index\.html)?|\.html)?$/, '/');
    url.search = '';
    url.hash = '';
    const name = normalizeName(value);
    if (name) url.searchParams.set('to', name);
    return url.href;
  }

  window.WeddingGuest = Object.freeze({ maxLength, normalizeName, nameFromURL, createLink });
})();