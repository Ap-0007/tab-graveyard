document.addEventListener('DOMContentLoaded', async () => {
  const daysInput = document.getElementById('daysInput');
  const whitelistInput = document.getElementById('whitelistInput');
  const saveBtn = document.getElementById('saveBtn');
  const statusMessage = document.getElementById('statusMessage');

  // Load current settings
  const storage = await chrome.storage.sync.get(['settings']);
  const settings = storage.settings || { timeoutDays: 3, whitelist: [] };
  
  daysInput.value = settings.timeoutDays;
  whitelistInput.value = settings.whitelist.join('\n');

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const newSettings = {
      timeoutDays: parseInt(daysInput.value) || 3,
      whitelist: whitelistInput.value.split('\n').map(s => s.trim()).filter(s => s)
    };

    await chrome.storage.sync.set({ settings: newSettings });

    statusMessage.classList.remove('hidden');
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 2000);
  });
});
