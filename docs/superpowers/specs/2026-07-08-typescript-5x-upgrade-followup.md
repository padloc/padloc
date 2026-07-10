# TypeScript 5.x Upgrade — Deferred Follow-up Spec (stub)

**Date:** 2026-07-08
**Origin:** Task 3.5 spike in the Modernization Phases 0–3 plan
**Status:** Deferred — to be planned as its own epic (brainstorm → plan → execute)
**Decision:** Confirmed with project owner — defer TS 5.x out of Phase 3.

## Why deferred

The Phase 3 spike measured a TypeScript 4.4.3 → 5.9.3 upgrade. The fixes are
**mechanical, not structural**, but the volume and dependency coupling make it
too large for a Phase-3 side-task. It deserves its own focused cycle.

## Measured facts (TS 5.9.3 spike)

- **~131 distinct type errors** (222 raw, inflated by cross-package recompilation).
- **~84 project-source errors** + **47 environment (lib/@types) errors**.

### Source-error clusters

| Cluster | Count | Cause | Fix nature |
|---|---|---|---|
| `TS7053` index-access | ~45 | Removing `suppressImplicitAnyIndexErrors` (deleted in TS 5.5) | Mechanical — casts / index signatures. Concentrated in `core/src/config.ts` (11), scattered `this[prop]`/`obj[key]`. |
| `TS2769` / `TS2345` / `TS2322` `Uint8Array<ArrayBufferLike>` | ~55 | TS 5.7+ made `Uint8Array` generic; WebCrypto now wants `BufferSource` over concrete `ArrayBuffer` | Mechanical but tedious, in the **crypto layer**: `app/src/lib/crypto.ts` (34), `server/src/crypto/node.ts` (12). Entangled with the pinned old `@types/node@16`. |

### Environment cluster (47) — NOT fixable in our source

- Pinned `@types/node@16.11.7` `.d.ts` vs TS 5.9 built-in `lib.dom.d.ts` /
  `lib.webworker.d.ts` (`TS2403`/`TS2374`/`TS2717`/`TS2300`).
- Old `mongodb@4.1.0`, `maxmind@4.3.2`, `geolite2-redist@2.0.4` `.d.ts` under TS
  5.9 stricter generics (`TS2344`).
- These require bumping `@types/node` (→ 18) and `mongodb`, which are themselves
  blocked: `@types/node@18` fails against `mongodb@4.1.0`'s
  `GridFSBucketWriteStream.end(): void` vs Node 18's `Writable.end(): this`.

### Decorators / reflect-metadata — CLEAN

- **Zero** decorator/metadata errors under TS 5.9. `experimentalDecorators` +
  `emitDecoratorMetadata` honored identically to 4.4.3; standard (TC39)
  decorators did NOT activate. The heaviest structural risk is a non-issue.

## Suggested plan shape for the future epic

1. **Coordinate the dependency unpin first:** bump `mongodb` (resolve the
   `GridFSBucketWriteStream` conflict), then `@types/node@18`, then relax the
   `pnpm.overrides` `@types/node` pin. This clears the 47 environment errors.
2. **Mechanical TS7053 pass:** ~45 index-access fixes (casts / index signatures).
3. **Crypto `Uint8Array` pass:** ~55 fixes in `crypto.ts` / `node.ts`; review
   carefully because it is cryptographic code — prefer coordinating with the
   `@types/node` bump so `Buffer` types line up rather than blanket-casting.
4. Remove `suppressImplicitAnyIndexErrors` from `tsconfig.json` (required by TS 5.5+).
5. Re-attempt `aws-sdk` upgrade (its newer `@smithy` types need TS 4.5+ inline
   `import { type X }`), which was reverted in Phase 3 Task 3.3 due to the TS ceiling.

## Related deferred items (carried from Phase 3)

- `@types/node` 16 → 18 (Task 3.4): blocked by mongodb + TS ceiling.
- `@aws-sdk/client-s3` / `@aws-sdk/types` stuck at 3.25.0 (Task 3.3): needs TS 4.5+.

These three deferrals are mutually entangled and should be resolved together in
this follow-up epic.
