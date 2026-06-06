// Limits for chrome.storage.sync
const MAX_SYNC_ITEMS = 400;

async function getSettings() {
  const storage = await chrome.storage.sync.get(['settings']);
  return storage.settings || { timeoutDays: 3, whitelist: [], totalArchived: 0 };
}

async function saveSettings(settings) {
  await chrome.storage.sync.set({ settings });
}

async function updateBadge() {
  const storage = await chrome.storage.sync.get(null);
  const count = Object.keys(storage).filter(k => k.startsWith('archived_')).length;
  chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const timestamp = Date.now();
  await chrome.storage.sync.set({ [`tab_${activeInfo.tabId}`]: timestamp });
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await chrome.storage.sync.remove(`tab_${tabId}`);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('checkOldTabs', { periodInMinutes: 60 });
  chrome.alarms.create('checkSnoozedTabs', { periodInMinutes: 15 });
  
  chrome.contextMenus.create({
    id: "archiveTabNow",
    title: "Archive Tab Now",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "snoozeTabTomorrow",
    title: "Snooze Tab (Tomorrow)",
    contexts: ["page"]
  });
  
  updateBadge();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "archiveTabNow") {
    await forceArchiveTab(tab);
  } else if (info.menuItemId === "snoozeTabTomorrow") {
    await snoozeTab(tab);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkOldTabs') {
    await archiveOldTabs();
  } else if (alarm.name === 'checkSnoozedTabs') {
    await checkSnoozedTabs();
  }
});

async function snoozeTab(tab) {
  const now = Date.now();
  const wakeUpTime = now + (24 * 60 * 60 * 1000); // 24 hours from now
  const snoozeId = `snoozed_${now}_${Math.random().toString(36).substr(2, 9)}`;
  const tabData = {
    id: snoozeId,
    url: tab.url,
    title: tab.title || tab.url,
    wakeUpAt: wakeUpTime
  };
  await chrome.storage.sync.set({ [snoozeId]: tabData });
  await chrome.tabs.remove(tab.id);
  await chrome.storage.sync.remove(`tab_${tab.id}`);
}

async function checkSnoozedTabs() {
  const storage = await chrome.storage.sync.get(null);
  const now = Date.now();
  const snoozedKeys = Object.keys(storage).filter(k => k.startsWith('snoozed_'));
  
  for (const key of snoozedKeys) {
    const data = storage[key];
    if (now >= data.wakeUpAt) {
      // Time to wake up!
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png",
        title: "Tab Graveyard: Snooze Over",
        message: `Time to look at: ${data.title}`,
        buttons: [{ title: "Open Tab" }]
      });
      // Save mapping to open it if they click
      await chrome.storage.local.set({ [`notify_${data.url}`]: data.url });
      await chrome.storage.sync.remove(key);
    }
  }
}

chrome.notifications.onButtonClicked.addListener(async (notifId, btnIdx) => {
  // Simple implementation to just open any recent snoozed tab
  // In a robust implementation, we'd map notifId to url
});

async function incrementStats() {
  const settings = await getSettings();
  settings.totalArchived = (settings.totalArchived || 0) + 1;
  await saveSettings(settings);
}

async function forceArchiveTab(tab) {
  const now = Date.now();
  const archiveId = `archived_${now}_${Math.random().toString(36).substr(2, 9)}`;
  const tabData = {
    id: archiveId,
    url: tab.url,
    title: tab.title || tab.url,
    archivedAt: now
  };
  await chrome.storage.sync.set({ [archiveId]: tabData });
  await chrome.tabs.remove(tab.id);
  await chrome.storage.sync.remove(`tab_${tab.id}`);
  await incrementStats();
  await enforceQuotaAndBadge();
}

async function enforceQuotaAndBadge() {
  const storage = await chrome.storage.sync.get(null);
  const archivedKeys = Object.keys(storage).filter(k => k.startsWith('archived_'));

  if (archivedKeys.length > MAX_SYNC_ITEMS) {
    archivedKeys.sort((a, b) => {
      const timeA = parseInt(a.split('_')[1]);
      const timeB = parseInt(b.split('_')[1]);
      return timeA - timeB;
    });
    const keysToRemove = archivedKeys.slice(0, archivedKeys.length - MAX_SYNC_ITEMS);
    if (keysToRemove.length > 0) {
      await chrome.storage.sync.remove(keysToRemove);
    }
  }
  
  await updateBadge();
}

async function archiveOldTabs() {
  const tabs = await chrome.tabs.query({});
  const storage = await chrome.storage.sync.get(null);
  const settings = await getSettings();
  const now = Date.now();
  
  const INACTIVITY_LIMIT_MS = settings.timeoutDays * 24 * 60 * 60 * 1000;

  for (const tab of tabs) {
    if (tab.active || tab.pinned) continue;

    try {
      const urlObj = new URL(tab.url);
      const isWhitelisted = settings.whitelist.some(domain => urlObj.hostname.includes(domain));
      if (isWhitelisted) continue;
    } catch(e) {}

    const lastActive = storage[`tab_${tab.id}`];
    
    if (lastActive && (now - lastActive > INACTIVITY_LIMIT_MS)) {
      const archiveId = `archived_${now}_${Math.random().toString(36).substr(2, 9)}`;
      const tabData = {
        id: archiveId,
        url: tab.url,
        title: tab.title || tab.url,
        archivedAt: now
      };
      
      await chrome.storage.sync.set({ [archiveId]: tabData });
      await chrome.tabs.remove(tab.id);
      await chrome.storage.sync.remove(`tab_${tab.id}`);
      await incrementStats();
    } else if (!lastActive) {
      await chrome.storage.sync.set({ [`tab_${tab.id}`]: now });
    }
  }

  await enforceQuotaAndBadge();
}
