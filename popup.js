document.addEventListener('DOMContentLoaded', async () => {
  const tabsList = document.getElementById('tabsList');
  const searchInput = document.getElementById('searchInput');
  const emptyState = document.getElementById('emptyState');
  const sortSelect = document.getElementById('sortSelect');
  const deleteAllBtn = document.getElementById('deleteAllBtn');
  const settingsBtn = document.getElementById('settingsBtn');

  let archivedTabs = [];

  // Load tabs from storage.sync
  async function loadTabs() {
    const storage = await chrome.storage.sync.get(null);
    archivedTabs = Object.keys(storage)
      .filter(key => key.startsWith('archived_'))
      .map(key => storage[key]);
    renderTabs(filterTabs(searchInput.value));
  }

  function updateBadge(count) {
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }

  // Format date relative
  function formatTime(timestamp) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((timestamp - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference === 0) {
        const hours = Math.round((timestamp - Date.now()) / (1000 * 60 * 60));
        if (hours === 0) return 'Just now';
        return rtf.format(hours, 'hour');
    }
    
    return rtf.format(daysDifference, 'day');
  }

  // Get Favicon URL
  function getFaviconUrl(u) {
    const url = new URL(chrome.runtime.getURL("/_favicon/"));
    url.searchParams.set("pageUrl", u);
    url.searchParams.set("size", "32");
    return url.toString();
  }

  // Render tabs list
  function renderTabs(tabsToRender) {
    tabsList.innerHTML = '';

    if (tabsToRender.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    // Sorting Logic
    const sortVal = sortSelect.value;
    if (sortVal === 'dateDesc') {
      tabsToRender.sort((a, b) => b.archivedAt - a.archivedAt);
    } else if (sortVal === 'dateAsc') {
      tabsToRender.sort((a, b) => a.archivedAt - b.archivedAt);
    } else if (sortVal === 'alphaAsc') {
      tabsToRender.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortVal === 'domain') {
      tabsToRender.sort((a, b) => {
        let domainA = "", domainB = "";
        try { domainA = new URL(a.url).hostname; } catch(e){}
        try { domainB = new URL(b.url).hostname; } catch(e){}
        if (domainA === domainB) return b.archivedAt - a.archivedAt;
        return domainA.localeCompare(domainB);
      });
    }

    // Optional: Add visual domain headers when grouped by domain
    let currentDomain = null;

    tabsToRender.forEach(tab => {
      if (sortVal === 'domain') {
        let domain = "Other";
        try { domain = new URL(tab.url).hostname; } catch(e){}
        if (domain !== currentDomain) {
          const header = document.createElement('div');
          header.style.padding = "10px 4px 4px";
          header.style.fontSize = "11px";
          header.style.fontWeight = "bold";
          header.style.textTransform = "uppercase";
          header.style.color = "var(--text-secondary)";
          header.textContent = domain;
          tabsList.appendChild(header);
          currentDomain = domain;
        }
      }

      const item = document.createElement('div');
      item.className = 'tab-item';
      
      const header = document.createElement('div');
      header.className = 'tab-header';

      const favicon = document.createElement('img');
      favicon.className = 'tab-favicon';
      favicon.src = getFaviconUrl(tab.url);
      favicon.onerror = () => { favicon.style.display = 'none'; };

      const title = document.createElement('div');
      title.className = 'tab-title';
      title.textContent = tab.title;

      header.appendChild(favicon);
      header.appendChild(title);
      
      const url = document.createElement('div');
      url.className = 'tab-url';
      url.textContent = tab.url;

      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'tab-actions';

      const dateStr = document.createElement('span');
      dateStr.className = 'tab-date';
      dateStr.textContent = formatTime(tab.archivedAt);

      const btnsContainer = document.createElement('div');

      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn btn-restore';
      restoreBtn.textContent = 'Restore';
      restoreBtn.onclick = (e) => {
        e.stopPropagation();
        restoreTab(tab);
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-delete';
      deleteBtn.textContent = 'Drop';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        item.style.opacity = '0';
        setTimeout(() => deleteTab(tab.id), 200);
      };

      btnsContainer.appendChild(deleteBtn);
      btnsContainer.appendChild(restoreBtn);
      
      actionsContainer.appendChild(dateStr);
      actionsContainer.appendChild(btnsContainer);

      item.appendChild(header);
      item.appendChild(url);
      item.appendChild(actionsContainer);

      item.onclick = () => restoreTab(tab);

      tabsList.appendChild(item);
    });
  }

  // Restore a tab
  async function restoreTab(tab) {
    await chrome.tabs.create({ url: tab.url });
    await deleteTab(tab.id);
  }

  // Delete a tab from archive
  async function deleteTab(id) {
    archivedTabs = archivedTabs.filter(t => t.id !== id);
    await chrome.storage.sync.remove(id);
    updateBadge(archivedTabs.length);
    renderTabs(filterTabs(searchInput.value));
  }

  // Filter tabs
  function filterTabs(query) {
    if (!query) return archivedTabs;
    const lowerQuery = query.toLowerCase();
    return archivedTabs.filter(tab => 
      tab.title.toLowerCase().includes(lowerQuery) || 
      tab.url.toLowerCase().includes(lowerQuery)
    );
  }

  // Event Listeners
  searchInput.addEventListener('input', (e) => {
    renderTabs(filterTabs(e.target.value));
  });

  sortSelect.addEventListener('change', () => {
    renderTabs(filterTabs(searchInput.value));
  });

  deleteAllBtn.addEventListener('click', async () => {
    if (confirm("Are you sure you want to permanently delete all archived tabs?")) {
      const keysToRemove = archivedTabs.map(t => t.id);
      await chrome.storage.sync.remove(keysToRemove);
      archivedTabs = [];
      updateBadge(0);
      renderTabs([]);
    }
  });

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  loadTabs();
});
