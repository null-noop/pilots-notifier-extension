document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl') as HTMLInputElement;
  const pairCodeInput = document.getElementById('pairCode') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  chrome.storage.sync.get(
    { apiUrl: 'https://pilots-api.nullnoop.dev' },
    (result) => {
      apiUrlInput.value =
        typeof result.apiUrl === 'string'
          ? result.apiUrl
          : 'https://pilots-api.nullnoop.dev';
    },
  );
  chrome.storage.local.get(['pairCode'], (result) => {
    pairCodeInput.value =
      typeof result.pairCode === 'string' ? result.pairCode : '';
  });

  saveButton.addEventListener('click', () => {
    const rawUrl = apiUrlInput.value
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/webhook\/flight$/i, '');
    const pairCode = pairCodeInput.value
      .trim()
      .replace(/[\s-]/g, '')
      .toUpperCase();

    let apiUrl: URL;
    try {
      apiUrl = new URL(rawUrl);
    } catch {
      statusDiv.textContent = 'Enter a valid server URL.';
      return;
    }

    if (
      !['http:', 'https:'].includes(apiUrl.protocol) ||
      apiUrl.username ||
      apiUrl.password ||
      apiUrl.search ||
      apiUrl.hash
    ) {
      statusDiv.textContent =
        'Use an HTTP(S) server URL without credentials or query parameters.';
      return;
    }
    if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{16}$/.test(pairCode)) {
      statusDiv.textContent =
        'Enter the 16-character pairing code from the server.';
      return;
    }

    const normalizedUrl = apiUrl.toString().replace(/\/$/, '');
    chrome.storage.sync.set({ apiUrl: normalizedUrl }, () => {
      chrome.storage.local.set({ pairCode }, () => {
        statusDiv.textContent = 'Settings saved.';
        setTimeout(() => {
          statusDiv.textContent = '';
        }, 2500);
      });
    });
  });
});
