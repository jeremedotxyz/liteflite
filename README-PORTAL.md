# Lite Flite Client Portal

The public website retains its original logo, video, intro, and colors. Client Login in each header opens the separate authenticated delivery portal.

## Run locally

Requires Node 22.13 or later.

```sh
npm ci
npm run build
npm run demo
npm start
```

Open http://127.0.0.1:8787. The server reports another port if 8787 is occupied. `npm run demo` creates an illustrative warehouse and two local accounts, printing unique passwords once. Existing accounts are not overwritten. Demo data is not an actual survey.

## Accounts and deliveries

Create the initial studio administrator without demo data:

```sh
npm run client -- studio@example.com "Studio administrator" --admin
```

Administrators can add clients, create assigned projects, and upload models through the portal. Passwords are displayed once and must be shared privately; email delivery and self-service password recovery are not configured. Users can change their passwords under account settings.

Clients can only access assigned projects, inspect models, and download original files. Supported preview formats are self-contained GLB 2.0, untextured OBJ, PLY, and STL, up to 100 MB. External texture dependencies and compressed GLB extensions are not supported. E57, LAS, and LAZ require conversion before upload. Geometry units must be specified by the uploader; measurements are model-space distances, not certified survey results. Measurements are temporary and reset when switching models.

## Production boundary

This is a working local application, not a deployed production service. Static hosting alone, including GitHub Pages, cannot run private authentication or serve protected files. Run the Node service behind an HTTPS reverse proxy, with persistent private storage and backups. Configure `PUBLIC_ORIGIN=https://your-domain.example`, `NODE_ENV=production`, `HOST=127.0.0.1`, and the desired `PORT`. Do not expose the data directory through another static server. The proxy must preserve the host/origin and should apply its own login rate limits; the application currently limits attempts by direct socket IP.

`DATA_DIR` defaults to `portal/data`. It contains the SQLite database and models and must never be committed, included in public exports, or served directly. Passwords use scrypt; sessions use hashed random tokens and HttpOnly/SameSite cookies. HTTPS enables Secure cookies. Every project and file request checks client ownership. Password changes revoke existing sessions.

Before inviting real clients: configure hosting/TLS, backup and restore procedures, an account-recovery process, retention/deletion policies, monitoring, and a security review appropriate to the sensitivity of the data. Uploaded models are not malware-scanned. No reconstruction or model editing is provided.

## Development

Frontend source: `portal/web`. `npm run build` writes compiled assets to `outputs/portal`. Server: `portal/app.js`, `portal/server.js`. `npm test` exercises authentication, upload/download authorization, cross-client isolation, cross-origin rejection, logout, and password-session revocation.

Public page source remains in `outputs/index.html`, `outputs/about.html`, and `outputs/services.html`; `lite-flite-working.html` mirrors the homepage. The login/portal must be opened through the Node server, not a file:// preview.
