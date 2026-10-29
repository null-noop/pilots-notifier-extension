interface StorageUpdateDetail {
  key: string;
  value: string;
}

const originalSetItem = localStorage.setItem;

console.log('[NotifExtension] Setting up localstorage intercept...');

localStorage.setItem = function (key: string, value: string): void {
  originalSetItem.apply(this, [key, value]);

  window.postMessage({
    type: 'pocketPilotsStorageUpdate',
    detail: { key, value },
  }, '*');
};

console.log('[NotifExtension] Intercept setup complete.');
