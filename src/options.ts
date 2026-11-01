document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl') as HTMLInputElement;
  const pairCodeInput = document.getElementById('pairCode') as HTMLInputElement;
  const settingsForm = document.getElementById(
    'settingsForm',
  ) as HTMLFormElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const togglePairCode = document.getElementById(
    'togglePairCode',
  ) as HTMLButtonElement;
  const defaultApiUrl = 'https://pilots-api.nullnoop.dev';

  const showStatus = (message: string, state: 'success' | 'error') => {
    statusDiv.textContent = message;
    statusDiv.dataset.state = state;
  };

  const formatPairCode = (code: string) =>
    code
      .replace(/[\s-]/g, '')
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-') ?? '';

  chrome.storage.sync.get({ apiUrl: defaultApiUrl }, (result) => {
    apiUrlInput.value =
      typeof result.apiUrl === 'string' ? result.apiUrl : defaultApiUrl;
  });
  chrome.storage.local.get(['pairCode'], (result) => {
    pairCodeInput.value =
      typeof result.pairCode === 'string'
        ? formatPairCode(result.pairCode)
        : '';
  });

  togglePairCode.addEventListener('click', () => {
    const reveal = pairCodeInput.type === 'password';
    pairCodeInput.type = reveal ? 'text' : 'password';
    togglePairCode.textContent = reveal ? 'Hide code' : 'Show code';
    togglePairCode.setAttribute('aria-pressed', String(reveal));
  });

  pairCodeInput.addEventListener('blur', () => {
    pairCodeInput.value = formatPairCode(pairCodeInput.value);
  });

  settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
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
      showStatus('Enter a valid server URL.', 'error');
      apiUrlInput.focus();
      return;
    }

    if (
      !['http:', 'https:'].includes(apiUrl.protocol) ||
      apiUrl.username ||
      apiUrl.password ||
      apiUrl.search ||
      apiUrl.hash
    ) {
      showStatus(
        'Use an HTTP(S) server URL without credentials or query parameters.',
        'error',
      );
      apiUrlInput.focus();
      return;
    }
    if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{18}$/.test(pairCode)) {
      showStatus(
        'Enter the 18-character pairing code from the server.',
        'error',
      );
      pairCodeInput.focus();
      return;
    }

    const normalizedUrl = apiUrl.toString().replace(/\/$/, '');
    saveButton.disabled = true;
    statusDiv.textContent = 'Saving your settings…';
    delete statusDiv.dataset.state;
    chrome.storage.sync.set({ apiUrl: normalizedUrl }, () => {
      if (chrome.runtime.lastError) {
        saveButton.disabled = false;
        showStatus('Could not save the server URL. Try again.', 'error');
        return;
      }
      chrome.storage.local.set({ pairCode }, () => {
        saveButton.disabled = false;
        if (chrome.runtime.lastError) {
          showStatus('Could not save the pairing code. Try again.', 'error');
          return;
        }
        pairCodeInput.value = formatPairCode(pairCode);
        showStatus(
          'Settings saved. You’re ready for your next flight.',
          'success',
        );
      });
    });
  });
});
