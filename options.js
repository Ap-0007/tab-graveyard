document.addEventListener('DOMContentLoaded', async () => {
  const daysInput = document.getElementById('daysInput');
  const whitelistInput = document.getElementById('whitelistInput');
  const saveBtn = document.getElementById('saveBtn');
  const statusMessage = document.getElementById('statusMessage');
  const exportBtn = document.getElementById('exportBtn');
  
  const statTotal = document.getElementById('statTotal');
  const statRAM = document.getElementById('statRAM');

  // Load current settings
  const storage = await chrome.storage.sync.get(null);
  const settings = storage.settings || { timeoutDays: 3, whitelist: [], totalArchived: 0 };
  
  daysInput.value = settings.timeoutDays || 3;
  whitelistInput.value = (settings.whitelist || []).join('\n');

  // Update Stats
  const total = settings.totalArchived || 0;
  statTotal.textContent = total;
  // Estimate 50MB per tab saved
  statRAM.textContent = (total * 50) + " MB";

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const newSettings = {
      ...settings,
      timeoutDays: parseInt(daysInput.value) || 3,
      whitelist: whitelistInput.value.split('\n').map(s => s.trim()).filter(s => s)
    };

    await chrome.storage.sync.set({ settings: newSettings });

    statusMessage.classList.remove('hidden');
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 2000);
  });

  // Export JSON
  exportBtn.addEventListener('click', () => {
    const archivedTabs = Object.keys(storage)
      .filter(key => key.startsWith('archived_') || key.startsWith('snoozed_'))
      .map(key => storage[key]);
      
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(archivedTabs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "tab_graveyard_backup.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  });
});
