/**
 * HN Modern v2.1 — popup.js
 */
(function () {
  'use strict';

  const DEFAULT_THEME = 'dark';
  const DEFAULT_APPEARANCE = {
    showFooter: true,
    showArticleNumbers: true,
    contentWidth: 900,
    fontFamily: 'system',
    fontSize: 14
  };

  const themeOptions = document.querySelectorAll('.option');
  const showFooterInput = document.getElementById('showFooter');
  const showArticleNumbersInput = document.getElementById('showArticleNumbers');
  const contentWidthInput = document.getElementById('contentWidth');
  const fontFamilyInput = document.getElementById('fontFamily');
  const fontSizeInput = document.getElementById('fontSize');
  const fontSizeValue = document.getElementById('fontSizeValue');

  function setActive(theme) {
    themeOptions.forEach((btn) => {
      btn.setAttribute('aria-checked', String(btn.dataset.theme === theme));
    });
  }

  function broadcastMessage(message) {
    chrome.tabs.query({ url: 'https://news.ycombinator.com/*' }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, message, () => {
          if (chrome.runtime.lastError) {
            // If content script is not ready, ignore: it will initialize from storage when loaded.
          }
        });
      });
    });
  }

  function syncControlValues(values) {
    if (values.theme) {
      setActive(values.theme);
    }
    if (values.showFooter !== undefined) {
      showFooterInput.checked = values.showFooter;
    }
    if (values.showArticleNumbers !== undefined) {
      showArticleNumbersInput.checked = values.showArticleNumbers;
    }
    if (values.contentWidth !== undefined) {
      contentWidthInput.value = values.contentWidth;
    }
    if (values.fontFamily !== undefined) {
      fontFamilyInput.value = values.fontFamily;
    }
    if (values.fontSize !== undefined) {
      fontSizeInput.value = values.fontSize;
      fontSizeValue.textContent = `${values.fontSize}px`;
    }
  }

  function saveAppearance(updates) {
    chrome.storage.sync.set(updates, () => {
      if (chrome.runtime.lastError) return;
      broadcastMessage({ type: 'HN_UPDATE_APPEARANCE', appearance: updates });
    });
  }

  function saveTheme(theme) {
    chrome.storage.sync.set({ theme }, () => {
      if (chrome.runtime.lastError) return;
      setActive(theme);
      broadcastMessage({ type: 'HN_SET_THEME', theme });
    });
  }

  themeOptions.forEach((btn) => {
    btn.addEventListener('click', () => saveTheme(btn.dataset.theme));
  });

  showFooterInput.addEventListener('change', () => {
    saveAppearance({ showFooter: showFooterInput.checked });
  });

  showArticleNumbersInput.addEventListener('change', () => {
    saveAppearance({ showArticleNumbers: showArticleNumbersInput.checked });
  });

  contentWidthInput.addEventListener('change', () => {
    saveAppearance({ contentWidth: Number(contentWidthInput.value) });
  });

  fontFamilyInput.addEventListener('change', () => {
    saveAppearance({ fontFamily: fontFamilyInput.value });
  });

  fontSizeInput.addEventListener('input', () => {
    fontSizeValue.textContent = `${fontSizeInput.value}px`;
  });

  fontSizeInput.addEventListener('change', () => {
    saveAppearance({ fontSize: Number(fontSizeInput.value) });
  });

  chrome.storage.sync.get(
    {
      theme: DEFAULT_THEME,
      ...DEFAULT_APPEARANCE
    },
    (values) => {
      syncControlValues(values);
      if (values.theme) {
        setActive(values.theme);
      }
    }
  );
})();
