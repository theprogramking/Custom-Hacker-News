/**
 * HN Modern v2.1 — content.js
 *
 * KEY FIX: Instead of injecting separate <link> tags (which race),
 * we fetch all CSS text at startup and inject a single <style> element.
 * Swapping themes is instant: just replace the <style> innerHTML.
 */
(function () {
  'use strict';

  if (window.__hnModernRan) return;
  window.__hnModernRan = true;

  const STYLE_ID = 'hn-modern-styles';

  /* ── Fetch CSS text from extension bundle ─────────────── */
  async function fetchCSS(filename) {
    const url = chrome.runtime.getURL(filename);
    const res = await fetch(url);
    return res.text();
  }

  /* ── Build combined CSS for a theme ─────────────────── */
  async function buildCSS(theme) {
    if (theme === 'default') return '';
    const [base, palette] = await Promise.all([
      fetchCSS('styles/base.css'),
      fetchCSS(`styles/${theme}.css`)
    ]);
    // Palette first so its :root vars are defined before base rules use them
    return palette + '\n' + base;
  }

  /* ── Inject or update the <style> tag ───────────────── */
  async function applyTheme(theme) {
    // Set attribute immediately for any selectors that key off it
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-hn-theme');
    } else {
      document.documentElement.setAttribute('data-hn-theme', theme);
    }

    const css = await buildCSS(theme);

    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      // Append to <head> if ready, else <html>
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  }

  /* ── Boot: read saved theme and apply ────────────────── */
  chrome.storage.sync.get('theme', ({ theme }) => {
    applyTheme(theme || 'dark');
  });

  /* ── Live switching: listen for popup messages ───────── */
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'HN_SET_THEME') {
      applyTheme(msg.theme);
    }
  });

  /* ── "points" colorizer (runs after DOM ready) ───────── */
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
