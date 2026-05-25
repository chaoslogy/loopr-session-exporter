/* Loopr Session Exporter — popup.
 *
 * Captures cookies + localStorage + sessionStorage from the active tab and
 * delivers it to Loopr Studio in one click. Three flavours of hand-off:
 *
 *   1. Send to Loopr Studio (primary): opens app-staging.loopr.studio with
 *      the captured payload encoded in the URL hash. Loopr Studio reads the
 *      hash, opens its "Add from Extension" modal pre-filled, and the user
 *      just clicks Save & encrypt. No copy/paste anywhere.
 *   2. Copy to clipboard: legacy fallback for power users who want to paste
 *      manually.
 *   3. Download .json: save as file.
 *
 * The payload is held in the popup only and is destroyed when the popup
 * closes. We never POST anywhere directly from this build.
 */

const $main = document.getElementById('main');
const $version = document.getElementById('version');
const VERSION = chrome.runtime.getManifest().version;
$version.textContent = `v${VERSION}`;

// Where to deep-link the payload into. When we ship the prod build, this
// hardcodes to https://app.loopr.studio (see manifest.prod.json).
const STUDIO_URL = 'https://app-staging.loopr.studio/url-sessions';
const STUDIO_DEEP_LINK_BASE = STUDIO_URL + '#from-extension=';

main();

async function main() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
      renderError(
        "This page can't be exported",
        "Loopr can capture sessions on https:// and http:// pages only — not chrome://, file://, or the new-tab page.",
      );
      return;
    }
    const url = new URL(tab.url);
    const granted = await chrome.permissions.contains({ origins: [`${url.protocol}//${url.hostname}/*`] });
    if (granted) {
      renderReady(tab, url);
    } else {
      renderPermissionGate(tab, url);
    }
  } catch (e) {
    renderError("Couldn't read this tab", String(e && e.message || e));
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function siteCard(tab, url) {
  const fav = tab.favIconUrl ? `style="background-image:url('${tab.favIconUrl.replace(/'/g,"%27")}')"` : '';
  return `
    <div class="site">
      <div class="favicon" ${fav}></div>
      <div class="site-text">
        <div class="site-host">${escapeHtml(url.hostname)}</div>
        <div class="site-title">${escapeHtml(tab.title || url.pathname)}</div>
      </div>
    </div>`;
}

function renderPermissionGate(tab, url) {
  $main.innerHTML = `
    ${siteCard(tab, url)}
    <div class="gate">
      <p><strong>One-time permission:</strong> Loopr needs to read cookies for
      <strong>${escapeHtml(url.hostname)}</strong> to capture your session.
      Permission is per-domain and you can revoke it any time in
      <code>chrome://extensions</code>.</p>
      <button class="btn btn-primary btn-block" id="grant">Allow access to ${escapeHtml(url.hostname)}</button>
    </div>
  `;
  document.getElementById('grant').addEventListener('click', async () => {
    const origin = `${url.protocol}//${url.hostname}/*`;
    let granted = false;
    try { granted = await chrome.permissions.request({ origins: [origin] }); }
    catch (e) { renderError("Permission request failed", String(e && e.message || e)); return; }
    if (granted) renderReady(tab, url);
    else renderError("Permission denied", "Without access to this site's cookies we can't capture the session. Click the icon again to retry.");
  });
}

function renderReady(tab, url) {
  $main.innerHTML = `
    ${siteCard(tab, url)}
    <div class="actions">
      <button class="btn btn-primary btn-block" id="capture">
        <span>Capture session</span>
      </button>
      <p class="tiny" style="text-align:center; margin: 4px 0 0;">
        Reads cookies + storage from <strong>${escapeHtml(url.hostname)}</strong> only when you click.
      </p>
    </div>
  `;
  document.getElementById('capture').addEventListener('click', () => doCapture(tab, url));
}

async function doCapture(tab, url) {
  $main.innerHTML = `
    ${siteCard(tab, url)}
    <div class="loading"><div class="spinner"></div><p class="muted">Capturing session…</p></div>
  `;
  let payload;
  try { payload = await capture(tab, url); }
  catch (e) { renderError("Capture failed", String(e && e.message || e)); return; }
  renderResult(tab, url, payload);
}

async function capture(tab, url) {
  // Use `url:` (not `domain:`) so Chrome walks the cookie store and returns
  // every cookie this URL would actually send — including ones set on the
  // parent domain (.youtube.com vs www.youtube.com). The `domain:` filter
  // only matches the literal host + its sub-domains, so it silently dropped
  // the session cookies for sites like youtube.com / notion.so / google.com.
  const cookies = await chrome.cookies.getAll({ url: tab.url });
  let localStorageData = {}, sessionStorageData = {};
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const dump = (s) => {
          const out = {};
          for (let i = 0; i < s.length; i++) {
            const k = s.key(i); if (k) out[k] = s.getItem(k);
          }
          return out;
        };
        return { local: dump(localStorage), session: dump(sessionStorage) };
      },
    });
    if (results && results[0] && results[0].result) {
      localStorageData = results[0].result.local || {};
      sessionStorageData = results[0].result.session || {};
    }
  } catch { /* ignore — chrome:// banners etc */ }

  return {
    capturedAt: new Date().toISOString(),
    exporter: { name: "Loopr Session Exporter", version: VERSION },
    tab: { url: tab.url, title: tab.title || "", host: url.hostname },
    cookies, localStorage: localStorageData, sessionStorage: sessionStorageData,
  };
}

function renderResult(tab, url, payload) {
  const cookieCount = payload.cookies.length;
  const lsCount = Object.keys(payload.localStorage).length;
  const ssCount = Object.keys(payload.sessionStorage).length;
  $main.innerHTML = `
    ${siteCard(tab, url)}
    <div class="result ok">
      <h3>Captured ${escapeHtml(url.hostname)}</h3>
      <p>One click sends it straight to Loopr Studio.</p>
      <div class="stat-grid">
        <div class="stat"><div class="stat-num">${cookieCount}</div><div class="stat-label">cookies</div></div>
        <div class="stat"><div class="stat-num">${lsCount}</div><div class="stat-label">localStorage</div></div>
        <div class="stat"><div class="stat-num">${ssCount}</div><div class="stat-label">sessionStorage</div></div>
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-primary btn-block" id="send-to-loopr">→ Send to Loopr Studio</button>
      <div class="btn-row">
        <button class="btn btn-secondary" id="copy">Copy to clipboard</button>
        <button class="btn btn-secondary" id="download">Download .json</button>
      </div>
      <button class="btn btn-secondary btn-block" id="recapture" style="margin-top: 4px;">Recapture</button>
    </div>
  `;

  document.getElementById('send-to-loopr').addEventListener('click', async () => {
    const json = JSON.stringify(payload);
    // Bytes-safe base64 (handles unicode in cookie values)
    const b64 = bytesToBase64(new TextEncoder().encode(json));
    const url = STUDIO_DEEP_LINK_BASE + b64;
    await chrome.tabs.create({ url });
    window.close(); // close popup; the new tab takes over
  });

  document.getElementById('copy').addEventListener('click', async (ev) => {
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); flashButton(ev.currentTarget, 'Copied ✓'); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = txt; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      flashButton(ev.currentTarget, 'Copied ✓');
    }
  });

  document.getElementById('download').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const fname = `loopr-${url.hostname}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    a.href = URL.createObjectURL(blob); a.download = fname;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });

  document.getElementById('recapture').addEventListener('click', () => doCapture(tab, url));
}

function bytesToBase64(bytes) {
  // Convert Uint8Array → base64 string in chunks (large arrays trip the apply() arg limit)
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function renderError(title, body) {
  $main.innerHTML = `<div class="result error"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>`;
}

function flashButton(btn, text) {
  const orig = btn.innerHTML;
  btn.innerHTML = text; btn.disabled = true;
  setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1100);
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
