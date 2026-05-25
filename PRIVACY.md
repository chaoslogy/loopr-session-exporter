# Privacy policy — Loopr Session Exporter

Last updated: April 30, 2026

## Summary

The Loopr Session Exporter reads cookies, localStorage, and sessionStorage from
the active browser tab when you click its icon. The captured data stays inside
the popup until you copy it to your clipboard or download it to a file. The
extension does not transmit captured data over the network and does not store
it anywhere outside the popup window.

## What is captured

When, and only when, you click the extension icon and then click "Capture
session", the extension reads:

- Cookies for the active tab's hostname (via `chrome.cookies.getAll`).
- `localStorage` and `sessionStorage` of the active tab (via
  `chrome.scripting.executeScript`).

## What is **not** captured

- Browsing history, page contents, or DOM outside the storage objects above.
- Activity on tabs you have not explicitly clicked the icon on.
- Anything from any tab when the popup is closed.

## Where the data goes

Nowhere, unless you take an action:

- **Copy to clipboard** places the captured JSON on your system clipboard.
- **Download .json** saves the JSON to a local file on your machine.
- The captured data is held in popup memory only and is discarded when the
  popup closes.

The extension does not include any analytics, telemetry, error reporting,
remote configuration, or "phone-home" mechanism.

## Permissions

- `cookies` — read cookies of the active tab.
- `scripting`, `activeTab` — snapshot the active tab's storage when you click.
- `storage` — UI-state-only (reserved; not currently used).
- `optional_host_permissions` for `<all_urls>` — granted per-domain at runtime
  when you first capture on a site. You can revoke per-domain access in
  `chrome://extensions`.

## Data retention

None. The extension does not retain captured data after the popup closes.

## Contact

Questions: support@loopr.studio
