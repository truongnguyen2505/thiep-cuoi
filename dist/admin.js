(() => {
  'use strict';
  const { normalizeName, createLink, maxLength } = window.WeddingGuest;
  const form = document.querySelector('#guest-link-form');
  const nameInput = document.querySelector('#guest-name');
  const linkOutput = document.querySelector('#guest-link');
  const greeting = document.querySelector('#guest-preview');
  const copyButton = document.querySelector('#copy-guest-link');
  const previewLink = document.querySelector('#preview-guest-link');
  const status = document.querySelector('#copy-status');
  nameInput.maxLength = maxLength;

  function update() {
    const name = normalizeName(nameInput.value);
    greeting.textContent = name || 'Quý khách';
    linkOutput.value = name ? createLink(window.location.href, name) : '';
    copyButton.disabled = !name;
    previewLink.setAttribute('aria-disabled', String(!name));
    if (name) previewLink.href = linkOutput.value;
    else previewLink.removeAttribute('href');
    status.textContent = '';
    status.removeAttribute('data-state');
  }

  function copySelection(value) {
    linkOutput.focus();
    linkOutput.select();
    linkOutput.setSelectionRange(0, value.length);
    return document.execCommand('copy');
  }

  nameInput.addEventListener('input', update);
  window.addEventListener('pageshow', update);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    update();
    if (!linkOutput.value) {
      nameInput.focus();
      return;
    }
    const value = linkOutput.value;
    const name = normalizeName(nameInput.value);
    copyButton.disabled = true;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value);
          copied = true;
        } catch {
          copied = copySelection(value);
        }
      } else {
        copied = copySelection(value);
      }
    } catch {
      copied = false;
    }
    copyButton.disabled = !normalizeName(nameInput.value);
    status.dataset.state = copied ? 'success' : 'error';
    status.textContent = copied
      ? 'Đã sao chép link mời ' + name + '. Bạn có thể dán và gửi ngay.'
      : 'Chưa sao chép tự động được. Hãy chọn link bên trên và sao chép thủ công.';
  });
  update();
})();