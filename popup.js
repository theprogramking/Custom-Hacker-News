/**
 * HN Modern v2.1 — popup.js
 */
(function () {
  'use strict';

  const DEFAULT_THEME = 'dark';

  // Read saved theme, mark active button
  chrome.storage.sync.get('theme', ({ theme }) => {
    setActive(theme || DEFAULT_THEME);
  });

  document.querySelectorAll('.option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;

      chrome.storage.sync.set({ theme });
      setActive(theme);

      // Send to all open HN tabs
      chrome.tabs.query({ url: 'https://news.ycombinator.com/*' }, (tabs) => {
        tabs.forEach((tab) => {
          // Try message first (content script already running)
          chrome.tabs.sendMessage(tab.id, { type: 'HN_SET_THEME', theme }, () => {
            if (chrome.runtime.lastError) {
              // Content script not ready — inject it
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (t) => {
                  if (window.__hnModernRan) {
                    // Re-use existing applyTheme if available
                    chrome.runtime.sendMessage({ type: 'HN_SET_THEME', theme: t });
                  }
                },
                args: [theme]
              }).catch(() => {});
            }
          });
        });
      });
    });
  });

  function setActive(theme) {
    document.querySelectorAll('.option').forEach((btn) => {
      btn.setAttribute('aria-checked', String(btn.dataset.theme === theme));
    });
  }
})();
