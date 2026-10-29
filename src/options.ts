document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load the current value
  chrome.storage.sync.get(['apiUrl'], (result: any) => {
    if (result.apiUrl) {
      apiUrlInput.value = result.apiUrl;
    }
  });

  // Save the new value
  saveButton.addEventListener('click', () => {
    const newValue = apiUrlInput.value.trim();
    chrome.storage.sync.set({ apiUrl: newValue }, () => {
      statusDiv.textContent = 'Settings saved!';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 2000);
    });
  });
});
