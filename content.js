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
      showUpvotes: true,
    contentWidth: 900,
    articleLineWidth: 700,
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
  --font-size-base: var(--font-size);
  --font-size-title: calc(var(--font-size-base) + 2px);
  --font-size-meta: calc(var(--font-size-base) - 2px);
  --font-size-small: calc(var(--font-size-base) - 3px);
  --article-line-width: ${Number(appearance.articleLineWidth) || DEFAULT_APPEARANCE.articleLineWidth}px;
  --font-sans: ${getFontStack(appearance.fontFamily)};
}

html[data-hn-show-footer="false"] .yclinks {
  display: none !important;

html[data-hn-show-footer="false"] input[type="text"],
html[data-hn-show-footer="false"] .pagetop {
  display: none !important;
}

html[data-hn-show-upvotes="false"] .votearrow,
html[data-hn-show-upvotes="false"] .score {
  visibility: hidden !important;
  width: 0 !important;
  margin: 0 !important;
}
}

html[data-hn-show-rank="false"] td.title span.rank {
  visibility: hidden !important;
  color: transparent !important;
}

html #hnmain {
  max-width: min(var(--content-width), 100%) !important;
}

html .title,
html td.title {
  font-size: var(--font-size-base) !important;
}

html .titleline > a:first-child,
html .title a {
  font-size: var(--font-size-title) !important;
  max-width: var(--article-line-width) !important;
  display: inline-block !important;
  white-space: normal !important;
  word-break: break-word !important;

html[data-hn-theme] .title a,
html[data-hn-theme] .titleline a,
html[data-hn-theme] .title a:link,
html[data-hn-theme] .titleline > a:first-child {
  font-size: var(--font-size-title) !important;
}
}

html .subtext,
html .subtext td,
html .subtext a,
html .comment,
html .comment a,
html .comhead,
html .morelink,
html .pagetop a,
html .sitebit a,
html .sitebit span,
html span.sitestr {
  font-size: var(--font-size-meta) !important;
}

html .comment {
  font-size: var(--font-size-meta) !important;
}

html .yclinks,
html .yclinks a,
html .yclinks a:visited {
  font-size: var(--font-size-meta) !important;
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
  }

  function applyAppearance(appearance) {
    const root = document.documentElement;
    root.style.setProperty('--font-sans', getFontStack(appearance.fontFamily));
    root.style.setProperty('--font-size', `${appearance.fontSize}px`);
    root.style.setProperty('--content-width', `${appearance.contentWidth}px`);
    root.style.setProperty('--article-line-width', `${appearance.articleLineWidth}px`);
    root.setAttribute('data-hn-show-rank', String(appearance.showArticleNumbers));
    updateFooterVisibility(appearance.showFooter);
  root.setAttribute('data-hn-show-upvotes', String(appearance.showUpvotes));

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
