# NetMap

A network topology mapping tool. Paste CLI output from network devices (VyOS `show int`, Linux `ip a`) or add devices manually, lay them out on a canvas, link interfaces, and export the diagram.

## Prerequisites

- Node.js 22+ (uses the built-in `node:sqlite` module)

## Setup

```bash
npm install
```

## Running it

NetMap has two parts that both need to be running:

1. **Frontend (Vite dev server)**

   ```bash
   npm run dev
   ```

   Opens at `http://localhost:5173`. The port is pinned (`strictPort` in `vite.config.ts`), so if something else is already using 5173 the dev server will fail to start rather than silently picking a different port — stop whatever's holding it and re-run.

2. **Backend (share-code API)** — required for the "Share" feature (save/load a map by a 4-character code)

   ```bash
   npm run server
   ```

   Runs an Express + SQLite API on `http://localhost:3001`. Vite proxies `/api/*` requests to it, so as long as both are running you don't need to configure anything else. Saved codes expire after 7 days; re-saving with the same code refreshes the expiry.

   If you skip this, everything except Save/Share will still work (the map auto-saves to your browser's `localStorage`).

## Using the app

1. **Add devices.** Click (or drag) a device type from the left palette — Router, Switch, Host, Server, Firewall, or Cloud / Internet — to drop it onto the canvas. Each click adds one device in a grid; the newly added device is auto-selected.
2. **Configure it.** With a device selected, the Inspector panel on the right lets you edit its name, type, interfaces, and notes. Click **+ Interface** to add more ports. For each interface you can set an address (e.g. `10.0.0.1/24`), status, and a description.
3. **Connect devices.** Two ways:
   - **Auto-link by subnet** — give two interfaces addresses in the same subnet and click **Re-link**; NetMap wires them together automatically. This is the fastest way to build out a topology (e.g. give a switch and all its hosts addresses on the same `/24` and they'll all link to the switch).
   - **Manual drag** — drag from one interface's connection dot to another's directly on the canvas.
4. **Clean up the layout.** Click **Tidy** to auto-arrange the whole map (Dagre layout); the view re-fits automatically afterward.
5. **Save your work.** Click **Save** in the toolbar for a dropdown with three options:
   - **Save** — persists immediately to whichever link is currently open, or creates a new one if you haven't saved yet. The map's 4-character code becomes part of the URL (e.g. `netmap.packnation.org/ab3d`).
   - **Save as New Link** — always creates a brand-new, independent code, leaving whatever was previously saved under the old code untouched — this is how you keep multiple separate saved maps without one overwriting another.
   - **Load by Code** — opens any previously saved map by its 4-character code.

   Visiting the bare root URL (no code) always starts a fresh, unsaved canvas. Saved maps expire after 7 days. Once something's saved, click **Share** to copy the current link to your clipboard.
6. **Export.** Use **PNG**/**SVG** for an image of the diagram, or **Export**/**Import** for the raw JSON document (handy for backups or editing outside the app).

## Building for production

```bash
npm run build
npm run preview   # serve the production build locally
```

The build only produces the static frontend. To use Share in production you still need `server/index.js` running somewhere reachable at `/api`, e.g. behind the same reverse proxy/tunnel as the frontend.

## Other scripts

```bash
npm run lint   # ESLint
```

## Exposing it externally

If you're tunneling the dev server (e.g. via Cloudflare Tunnel) under a custom hostname, add that hostname to `server.allowedHosts` in `vite.config.ts` — it's already set up for `netmap.packnation.org` as an example.

## Features

- **Paste Import** — paste VyOS `show int` or Linux `ip a` output (one or more devices at once) to auto-create devices and interfaces.
- **Manual devices** — click or drag devices from the palette onto the canvas, including Cloud / Internet nodes (these now have a real interface and can be wired in like any other device).
- **Auto-link by subnet** — interfaces on a shared subnet are automatically linked; re-run with "Re-link".
- **Tidy** — auto-layout via Dagre; the viewport re-fits automatically afterward.
- **Export** — PNG, SVG, or JSON.
- **Import JSON** — reload a previously exported `.json` map.
- **Save** — toolbar dropdown for Save, Save as New Link, and Load by Code; the active code lives in the URL (`netmap.packnation.org/<code>`) (see backend setup above).
- **Share** — one click to copy the current map's link to your clipboard.
