# NetMap UX/Functionality Test Findings

Session: 2026-06-19. Tester: Claude (acting as UI/UX tester + network developer), via Claude-in-Chrome browser automation against https://netmap.packnation.org.

Goal: build a realistic university network (4 schools, each with routers/switches/hosts, connected to each other and to the internet where appropriate) using only the production UI, and log bugs/issues/UX friction encountered along the way.

## Network design (for reference)

- Core: `INET-EDGE` (router, ISP demarcation) -> `CORE-FW` (firewall) -> `CORE-RTR` (router) -> one border router per school. Decorative `Internet` cloud node placed near INET-EDGE (see Bug #1 — cloud nodes cannot actually be wired in).
- 4 schools: Engineering (ENG), Business (BUS), Arts & Sciences (AS), Medicine (MED). Each (except MED specifics below) has: border router (BR) -> internal router (IR) -> 2 switches -> 6 hosts each, plus 1 server off the admin switch.
- MED has an additional fully isolated, air-gapped research switch+hosts segment (no router uplink, no route to core/internet at all) to demonstrate a network that intentionally lacks internet access (e.g. compliance/research-isolation requirement).
- Addressing: core backbone 10.0.0.0/24; ISP-facing link 203.0.113.0/30; school blocks 10.10.0.0/16-style per school (10.10=ENG, 10.20=BUS, 10.30=AS, 10.40=MED); isolated MED research segment intentionally uses an out-of-block 10.99.99.0/24 to visually signal it's not part of the routed campus network.
- Auto-link (the app's "Re-link" feature) is used to wire most links by giving devices matching subnet addresses, rather than manually dragging every edge.

## Bugs / Issues Found

### Bug #1 — "Cloud / Internet" device type cannot be connected to anything
**Where:** `src/components/nodes/DeviceNode.tsx` — the whole interfaces block (which renders the connection `Handle`s) is gated on `data.type !== 'cloud'`. `defaultInterfacesFor('cloud')` in `src/lib/device.ts` also returns `[]`, and the Inspector panel hides the interfaces editor for cloud devices too.
**Impact:** A device whose entire purpose is to represent "the Internet" in a network diagram has zero connection points — it cannot be wired to anything via drag-and-drop, and it's excluded from subnet auto-linking (`computeSubnetBuckets` explicitly skips `type === 'cloud'`). So you can never actually show "connectivity to the internet" using the dedicated Internet node type; you have to fake it with a Router/Firewall node labeled "Internet" instead.
**Severity:** Medium-high — this is a core named feature (the palette literally has a "Cloud / Internet" button) that doesn't do the one thing its name implies.
**Suggested fix:** Give cloud nodes at least one interface/handle (even a single unnamed uplink handle) so they can be a real edge endpoint, or special-case them in `onConnect`/auto-link to allow exactly one link.
**Status: FIXED (2026-06-19).** `defaultInterfacesFor('cloud')` now returns a single `uplink` interface; `DeviceNode.tsx` and `InspectorPanel.tsx` no longer special-case `type === 'cloud'` for rendering handles/the interfaces editor; `computeSubnetBuckets` in `subnet.ts` no longer skips cloud nodes. Verified locally: a Cloud/Internet node with an address now shows up in auto-link (`Re-link`) and renders connection handles like any other device.

### Bug #2 — "Clear" uses a native `window.confirm()` dialog instead of the app's own modal styling
**Where:** `src/components/Toolbar.tsx` `handleClear()` — `window.confirm('Clear the entire map? This cannot be undone.')`.
**Impact:** Inconsistent with the rest of the app, which uses custom-styled modals (e.g. `ImportModal`, `ShareModal`) for everything else. Native confirm dialogs are also unstyleable, block all other page interaction/automation while open, and are easy to blow past by reflex-clicking.
**Severity:** Low-medium (UX consistency / destructive-action safety).
**Suggested fix:** Replace with an in-app confirmation modal matching the rest of the design system.

### Bug #3 — "Tidy" (auto-layout) doesn't re-fit the viewport
**Where:** `src/hooks/useNetMapState.ts` `runTidy()` calls `runDagreLayout` and `setNodes`, but never triggers React Flow's `fitView`.
**Impact:** After running Tidy on a non-trivial map, the new layout can land entirely outside the current pan/zoom, leaving the canvas looking empty until the user manually clicks the "fit view" control. On a 72-device map this looked exactly like Tidy had silently deleted everything, which is alarming.
**Severity:** Low-medium (confusing, but recoverable with one extra click).
**Suggested fix:** Call `fitView()` (or pass a `shouldFitView` flag) right after a tidy/layout pass.
**Status: FIXED (2026-06-19).** `Toolbar.tsx` now calls `useReactFlow()` and, after `onTidy()`, schedules `fitView({ padding: 0.2 })` on the next animation frame (so it runs after the new node positions have committed). Verified locally: clicking Tidy on a multi-node map now keeps everything in view automatically.

### Bug #4 — Only one saved map could exist; share code lived in localStorage, not the URL
**Where:** `src/hooks/useNetMapState.ts` kept a single `shareCode` in `localStorage` (`netmap.sharecode.v1`). Once any save happened, the Share dialog only offered "Update Saved Code" — there was no way to deliberately start a second, independent saved map without manually clearing browser storage.
**Impact:** Reported by the user directly: "I can't have more than one [saved layout]." The backend (`server/index.js`) already supports unlimited distinct 4-char codes — this was purely a client-side limitation.
**Status: FIXED (2026-06-19).**
- The share code now lives in the URL (`netmap.packnation.org/<code>`), not localStorage. `src/lib/share.ts` adds `codeFromUrl()`/`setUrlCode()`; `useNetMapState.ts` reads the code from the URL on mount and auto-loads that saved map, and pushes the URL (via `history.pushState`) on every save/load so the address bar is always a real permalink to what's open.
- The Share dialog (`ShareModal.tsx`) now offers two actions once a code is open: **"Update This Link (code)"** (overwrites the currently-open save) and **"Save as New Link"** (always requests a brand-new code, leaving the old one's saved document untouched on the server) — this is the direct fix for "can't have more than one."
- `Clear` now also detaches you from the current link (resets the URL to `/`) so your next save doesn't silently overwrite whatever you were viewing.
- Confirmed Vite's dev server (which is what actually serves `netmap.packnation.org` here — no nginx/static build in front of it) already serves `index.html` for arbitrary unmatched paths like `/ab3d` by default, so no server-side routing change was needed for direct/bookmarked links to work.
- Typecheck, lint, and `vite build` all pass. Live browser verification against the running instance was attempted but blocked by a Chrome-extension permission prompt that couldn't be resolved this session — **please manually verify** the checklist below on netmap.packnation.org before considering this fully closed:
  1. Save a map → confirm the URL changes to `/<code>` and the modal shows "Update This Link (`<code>`)".
  2. Make an edit, click "Save as New Link" → confirm a *different* code appears and the URL updates to it.
  3. Reload the page at that new URL directly → confirm it auto-loads the same map (not a blank canvas).
  4. Manually visit the *original* code's URL again → confirm it's unchanged from step 1 (proving the two saves didn't clobber each other).
  5. Click Clear → confirm the URL resets to `/`.

## Verification of the built network (via exported document state)

Final result: **72 devices, 69 links, 0 subnet mismatches.**
- Core: `INET-EDGE` (router, ISP stand-in) → `CORE-FW` (firewall) → `CORE-RTR` (router) → one border router per school. 5 routers/1 firewall in the core/backbone, plus the decorative `Internet` cloud (0 connections — see Bug #1, confirmed live: it has exactly 0 edges in the final document).
- Each of ENG/BUS/AS: BR → IR → 2 switches (staff LAN + student/lab LAN), 6 hosts per switch, 1 file server on the staff switch. 17 devices, 16 links each, auto-linked correctly as star topologies hubbed on the switch (not the router), exactly as intended.
- MED: same BR/IR/admin-switch/6-hosts/server pattern (internet-reachable), **plus** `MED-SW-RESEARCH` — a switch with 6 hosts on `10.99.99.0/24` that has **no uplink interface connected to anything** (confirmed: exactly 6 edges, all to its own hosts, zero path to MED-IR/core/internet). This demonstrates a network segment that intentionally has no internet (or even campus) connectivity, e.g. for an air-gapped research/compliance requirement.
- No orphaned devices (every non-cloud device has at least one link) and no auto-link subnet mismatches anywhere in the build.

Share code for the saved network: **0gvs** (saved via the app's own Share & Save feature, expires 2026-06-25 ~22:01 per the app's stated 7-day TTL). Load it from the Share dialog's "Load by Code" field on https://netmap.packnation.org.
