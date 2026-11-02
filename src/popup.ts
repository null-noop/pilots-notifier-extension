document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl') as HTMLInputElement;
  const pairCodeInput = document.getElementById('pairCode') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const defaultApiUrl = 'https://pilots-api.nullnoop.dev';
  let currentApiUrl = defaultApiUrl;

  chrome.storage.sync.get({ apiUrl: defaultApiUrl }, (result) => {
    currentApiUrl =
      typeof result.apiUrl === 'string' ? result.apiUrl : defaultApiUrl;
    apiUrlInput.value = currentApiUrl;
  });
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
    if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{18}$/.test(pairCode)) {
      statusDiv.textContent =
        'Enter the 18-character pairing code from the server.';
      return;
    }

    const normalizedUrl = apiUrl.toString().replace(/\/$/, '');
    const requestedOrigin = `${apiUrl.protocol}//${apiUrl.hostname}/*`;
    saveButton.disabled = true;
    chrome.permissions.request({ origins: [requestedOrigin] }, (granted) => {
      if (!granted) {
        saveButton.disabled = false;
        statusDiv.textContent = 'Permission for the notification server was not granted.';
        return;
      }
      chrome.storage.sync.set({ apiUrl: normalizedUrl }, () => {
        if (chrome.runtime.lastError) {
          saveButton.disabled = false;
          statusDiv.textContent = 'Could not save the server URL.';
          return;
        }
        chrome.storage.local.set({ pairCode }, () => {
          saveButton.disabled = false;
          if (chrome.runtime.lastError) {
            statusDiv.textContent = 'Could not save the pairing code.';
            return;
          }
          const previousUrl = new URL(currentApiUrl);
          const previousOrigin = `${previousUrl.protocol}//${previousUrl.hostname}/*`;
          if (previousOrigin !== requestedOrigin) {
            chrome.permissions.remove({ origins: [previousOrigin] });
          }
          currentApiUrl = normalizedUrl;
          statusDiv.textContent = 'Settings saved.';
          setTimeout(() => {
            statusDiv.textContent = '';
          }, 2500);
        });
      });
    });
  });
});
