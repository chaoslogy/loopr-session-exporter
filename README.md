# Loopr Session Exporter

Capture the active tab's cookies + localStorage + sessionStorage as JSON, then
paste into [Loopr Studio](https://app.loopr.studio) to put a logged-in URL on
a TV without re-typing your password on the remote.

## What it does

When you click the icon on any `https://` site:

1. Asks for one-time permission to read cookies for that domain.
2. Captures cookies, localStorage, sessionStorage.
3. Shows you a count and gives you **Copy** or **Download .json**.
4. You paste the JSON into Loopr Studio's "Add from Extension" box — done.

## What it does **not** do

- Never reads anything until you click the icon.
- Never sends data anywhere — no POSTs, no analytics, no servers.
- Never stores the captured payload — it lives in the popup until you copy or
  close it, then it's gone.
- Never asks for permission to a domain you haven't asked it to.

## Permissions, line by line

| Permission | Why |
|---|---|
| `cookies` | Read the cookies of the tab you click on. |
| `scripting` | Snapshot localStorage + sessionStorage from the active tab. |
| `activeTab` | Know which tab you clicked on. |
| `storage` | Remember the popup's UI state (none yet, reserved). |
| `optional_host_permissions: <all_urls>` | Cookies API needs host permission per domain. We use **optional** so install asks for nothing — you grant per-site at first capture. |

## Installation (developer / sideload)

1. `chrome://extensions/` → toggle **Developer mode**
2. **Load unpacked** → select this folder
3. Pin the icon (puzzle-piece menu)

## Captured JSON shape

```json
{
  "capturedAt": "2026-04-30T16:42:11.300Z",
  "exporter": { "name": "Loopr Session Exporter", "version": "1.0.0" },
  "tab": { "url": "https://amazon.com/orders", "title": "Your Orders", "host": "amazon.com" },
  "cookies": [
    {
      "name": "session-id",
      "value": "...",
      "domain": ".amazon.com",
      "path": "/",
      "secure": true,
      "httpOnly": true,
      "sameSite": "lax",
      "expirationDate": 1812345678
    }
  ],
  "localStorage": { "ubid-main": "..." },
  "sessionStorage": {}
}
```

Loopr Studio's URL Sessions page accepts this exact shape.

## License

MIT — see `LICENSE`.
