# Padloc Fork Backlog

Living backlog for work that is intentional but not yet scheduled into an
implementation plan. Items here are not commitments; they record intent and
scope boundaries so later planning does not lose context.

**Language:** English only (repo policy).

---

## Open

### B-001 — Browser extension UX for humans (MV3 + reliable autofill)

| Field | Value |
| --- | --- |
| **Status** | Open / not scheduled |
| **Priority** | Medium — product surface users feel daily; not blocking classic self-host |
| **Source** | Review of active forks (esp. `ch5me/padloc` extension parity work), 2026-07 |
| **Owner interest** | Human-facing Chrome extension that works reliably for normal password-manager use |

**In scope (desired outcome)**

- Manifest V3 Chrome extension (service worker; modern Chrome baseline)
- Reliable multi-field login fill (username + password + TOTP where present)
- Field detection that works on modern sites (labels, autocomplete, shadow DOM, React-friendly input events)
- Cold-start / unlock session that survives service-worker restarts without broken popup state
- Optional: save/update credential prompt after successful login form submit
- Unit tests + a small runtime smoke harness (extension load + content script ready)

**Explicitly out of scope for this item**

- Agentic autofill / native-messaging bridge for AI browser agents (Magic Browser, broker protocol, approval bundles for robots)
- Shipping the extension inside the Docker/Dokploy production stack (still local/CI build unless a later item says otherwise)
- Firefox packaging / store release automation (can follow after Chrome path is solid)

**Reference (external, not vendored)**

- `ch5me/padloc` packages: `packages/extension` (MV3, classifier, multi-fill, save prompt, cold-start, Playwright harness)
- Upstream / this fork today: MV2, primarily single-field `fillActive`

**Dependencies / notes**

- Extension is already in the active web-stack soft-focus list for build/CI
- Can proceed independently of Cloudflare Worker work (client talks to whatever `PL_SERVER_URL` is baked at build time)
- Prefer porting *ideas* and patterns from `ch5me`, not wholesale copy of CH5 branding or agentic stack

**Next step when scheduled**

1. Spike: MV2 → MV3 migration cost on this fork’s `packages/extension`
2. Spec + plan under `docs/superpowers/`
3. Implement in small vertical slices (manifest/runtime → multi-fill → save prompt → tests)

---

### B-002 — Cloudflare Worker backend as optional parallel runtime (explore)

| Field | Value |
| --- | --- |
| **Status** | Open / research interest |
| **Priority** | Low–medium — interesting architecture; classic Node/Docker remains primary for self-host |
| **Source** | Review of `ch5me/padloc` Cloudflare-native backend ADRs, 2026-07 |

**Question to answer**

Can a Cloudflare Workers backend (D1/R2/DO/Resend) live **alongside** the
classic `@padloc/server` Docker/Dokploy deploy without forcing a full cutover?

**Working answer (to validate in a later spike)**

- **Yes as two independent backends** sharing `@padloc/core` API contract: same
  monorepo, two packages (`packages/server` + new `packages/worker`), two
  deployments, two data stores, clients choose via `PL_SERVER_URL` at build time.
- **No as one shared live dataset** without an explicit migration/sync design:
  LevelDB/Postgres/Mongo vs D1/R2 are different storage models; accounts do not
  magically appear on both.
- **Not** a hybrid “edge proxy to Node for some routes” unless we deliberately
  design that (ch5me’s ADR-001 rejects hybrid for their fork).

**In scope for a future spike (not implementation yet)**

- Map classic server capabilities we rely on (LevelDB, FS attachments, SMTP,
  admin) to CF equivalents (D1, R2, Resend, DO locks)
- Confirm client/protocol compatibility (PWA/extension only need URL + API)
- Cost, ops model, and what we would drop (billing/SCIM/etc.) if we ever ship CF
- Decision: dual-track forever vs CF as optional “managed edge” profile later

**Out of scope until decided**

- Replacing Dokploy/nginx/LevelDB production path
- Deleting or freezing `@padloc/server`

**Reference (external)**

- `ch5me/padloc`: `packages/worker`, `docs/architecture/adr-001` … `adr-008`,
  `docs/fork-strategy.md` (keeps `packages/server` unused but present)

---

### B-003 — Harden Playwright e2e toward pure UI paths

| Field | Value |
| --- | --- |
| **Status** | Open / not scheduled |
| **Priority** | Medium — suite is green; remaining work is test quality, not coverage |
| **Source** | Playwright e2e bring-up on `test/playwright-e2e` (2026-07) |
| **Owner interest** | Real end-to-end journeys that exercise the UI the way a user would |

**Context**

Current Playwright helpers already drive signup/login/items through the browser
against a real server + maildev. A few pragmatic glue points remain because of
Lit + open shadow DOM + `pl-button` disabled binding:

- After `fill`, helpers still set `host.value` and dispatch composed `input` /
  `change` so parent `?disabled=${!input.value}` re-renders
- Occasional `force: true` clicks when headers/drawers intercept hit-testing
  (e.g. menu Lock)
- Session reset uses public `window.app.logout()` + `window.router.go("start",
  {}, true, true)` instead of a full Settings → Log Out click path (Router keeps
  query params unless an empty params object is passed)

These are intentional compromises, not silent skips of journeys.

**In scope (desired outcome)**

- Prefer pure Playwright actions: type into visible controls, click enabled
  buttons, no private component methods (`_editMasterPassword` etc. already
  avoided)
- Replace force-clicks where possible: open mobile menu explicitly, wait for
  stable layout, use roles/labels once a11y names are unique
- Replace `app.logout` / router force-go with a UI logout path (or a dedicated
  “signed-out start” fixture that still uses the product UI)
- Tighten fill so Lit parents update from native input events alone (app fix
  and/or helper only if still required)
- Optional: stable `data-testid`s on auth/items critical controls if a11y
  selectors stay ambiguous (duplicate “Email Address” fields)
- Keep CI strict: no flaky-green via retries without investigation
  (`--fail-on-flaky-tests` / fail if retry was needed)

**Explicitly out of scope for this item**

- Multi-browser matrix (Firefox/WebKit)
- Admin / extension / desktop e2e
- Large product refactors unrelated to testability
- Replacing Playwright or reintroducing Cypress

**Next step when scheduled**

1. Inventory remaining non-UI glue in `e2e/helpers/*` (list each call site)
2. For each: UI path, app fix, or keep with a short comment why
3. One vertical slice at a time (reset/logout → fill/disabled → lock menu)
4. Re-run `pnpm run test:e2e` until green without new force/API bypasses

---

## Done / parked

_(none yet — move items here when closed or explicitly dropped)_
