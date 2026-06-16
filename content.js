/**
 * HN Modern v2.1 — content.js
 *
 * Appearance and layout settings are centralized here so they can apply
 * dynamically in the page without requiring a reload.
 */
(function () {
  'use strict';

  if (window.__hnModernRan) return;
  window.__hnModernRan = true;

  const THEME_STYLE_ID = 'hn-modern-styles';
  const APPEARANCE_STYLE_ID = 'hn-modern-appearance';

  const DEFAULT_THEME = 'dark';
  const DEFAULT_APPEARANCE = {
    showFooter: true,
    showArticleNumbers: true,
    contentWidth: 900,
    fontFamily: 'system',
    fontSize: 14
  };

  const FONT_STACKS = {
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
    Inter: "'Inter', system-ui, sans-serif",
    'JetBrains Mono': "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
    'Fira Code': "'Fira Code', ui-monospace, 'SFMono-Regular', monospace",
    Georgia: "Georgia, 'Times New Roman', Times, serif",
    'Times New Roman': "'Times New Roman', Times, serif",
    Arial: "Arial, Helvetica, sans-serif"
  };

  const appearanceState = { ...DEFAULT_APPEARANCE };
  let currentTheme = DEFAULT_THEME;

  function getFontStack(fontFamily) {
    return FONT_STACKS[fontFamily] || FONT_STACKS.system;
  }

  function getAppearanceCSS(appearance) {
    return `:root {
  --content-width: ${Number(appearance.contentWidth) || DEFAULT_APPEARANCE.contentWidth}px;
  --font-size: ${Number(appearance.fontSize) || DEFAULT_APPEARANCE.fontSize}px;
  --font-sans: ${getFontStack(appearance.fontFamily)};
}

html[data-hn-show-rank="false"] td.title[align="right"],
html[data-hn-show-rank="false"] td.title span.rank {
  display: none !important;
}

html[data-hn-show-rank="false"] tr.athing > td.title[align="right"] {
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
}

html[data-hn-show-rank="false"] tr.athing > td:nth-child(3) {
  padding-left: 0 !important;
}

html #hnmain {
  max-width: min(var(--content-width), 100%) !important;
}

html .title,
html td.title {
  font-size: var(--font-size) !important;
}

html .titleline > a:first-child {
  font-size: calc(var(--font-size) + 2px) !important;
}

html .subtext,
html .subtext td,
html .subtext a,
html .comment,
html .comment a,
html .morelink {
  font-size: calc(var(--font-size) - 2px) !important;
}

html a.morelink:hover {
  color: inherit !important;
}
`;
  }

  async function fetchCSS(filename) {
    const url = chrome.runtime.getURL(filename);
    const res = await fetch(url);
    return res.text();
  }

  async function buildCSS(theme) {
    if (theme === 'default') return '';
    const [base, palette] = await Promise.all([
      fetchCSS('styles/base.css'),
      fetchCSS(`styles/${theme}.css`)
    ]);
    return palette + '\n' + base;
  }

  function ensureStyle(id) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      (document.head || document.documentElement).appendChild(el);
    }
    return el;
  }

  async function applyTheme(theme) {
    currentTheme = theme || DEFAULT_THEME;
    if (currentTheme === 'default') {
      document.documentElement.removeAttribute('data-hn-theme');
    } else {
      document.documentElement.setAttribute('data-hn-theme', currentTheme);
    }

    const css = await buildCSS(currentTheme);
    const themeStyle = ensureStyle(THEME_STYLE_ID);
    themeStyle.textContent = css;
  }

  function updateFooterVisibility(showFooter) {
    document.documentElement.setAttribute('data-hn-show-footer', String(showFooter));
    const links = Array.from(document.querySelectorAll('a.morelink'));
    links.forEach((link) => {
      const row = link.closest('tr');
      if (!row) return;
      row.style.display = showFooter ? '' : 'none';
      const sibling = row.nextElementSibling;
      if (sibling && sibling.tagName === 'TR' && sibling.querySelector('td') && !sibling.textContent.trim()) {
        sibling.style.display = showFooter ? '' : 'none';
      }
    });
  }

  function applyAppearance(appearance) {
    const root = document.documentElement;
    root.style.setProperty('--font-sans', getFontStack(appearance.fontFamily));
    root.style.setProperty('--font-size', `${appearance.fontSize}px`);
    root.style.setProperty('--content-width', `${appearance.contentWidth}px`);
    root.setAttribute('data-hn-show-rank', String(appearance.showArticleNumbers));
    updateFooterVisibility(appearance.showFooter);

    const appearanceStyle = ensureStyle(APPEARANCE_STYLE_ID);
    appearanceStyle.textContent = getAppearanceCSS(appearance);
  }

  function syncAppearance(values) {
    let changed = false;
    for (const key of Object.keys(DEFAULT_APPEARANCE)) {
      if (values[key] !== undefined && values[key] !== appearanceState[key]) {
        appearanceState[key] = values[key];
        changed = true;
      }
    }
    if (changed) {
      applyAppearance(appearanceState);
    }
  }

  chrome.storage.sync.get(
    {
      theme: DEFAULT_THEME,
      ...DEFAULT_APPEARANCE
    },
    ({ theme, ...appearance }) => {
      applyTheme(theme);
      syncAppearance(appearance);
    }
  );

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'HN_SET_THEME') {
      applyTheme(msg.theme);
    }

    if (msg.type === 'HN_UPDATE_APPEARANCE') {
      syncAppearance(msg.appearance || {});
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const next = {};
    if (changes.theme) {
      next.theme = changes.theme.newValue || DEFAULT_THEME;
      applyTheme(next.theme);
    }
    for (const key of Object.keys(DEFAULT_APPEARANCE)) {
      if (changes[key]) {
        next[key] = changes[key].newValue;
      }
    }
    if (Object.keys(next).length > 0) {
      syncAppearance(next);
    }
  });

  function colorPoints(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent.includes('points')) return;
      if (node.parentNode && node.parentNode.dataset && node.parentNode.dataset.hnColored) return;

      const span = document.createElement('span');
      span.dataset.hnColored = '1';
      span.innerHTML = node.textContent.replace(
        /\b(points)\b/g,
        '<span style="color:var(--text-tertiary,#8b949e);font-family:var(--font-sans,sans-serif)">$1</span>'
      );
      node.parentNode.replaceChild(span, node);
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.tagName !== 'SCRIPT' &&
      node.tagName !== 'STYLE' &&
      !node.dataset.hnColored
    ) {
      Array.from(node.childNodes).forEach(colorPoints);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => colorPoints(document.body), { once: true });
  } else {
    colorPoints(document.body);
  }
})();
