# Change Log

A brief record of the changes made to this project (auth, account linking, and
user profile work), newest work last.

---

## 1. Google Auth & Token Capture

- Added a secure Google OAuth login flow: signed `state` (HS256 JWT with a
  purpose claim and 10-minute TTL) plus a single-use, HttpOnly `oauthNonce`
  cookie (double-submit) to prevent CSRF/tampering.
- Tokens are **never** put in URLs or `localStorage`/`sessionStorage`. Instead,
  the callback issues a single-use **AuthCode** (new DB table) and redirects to
  the SPA, which exchanges it for tokens (`CaptureToken` page).
- New services: `oauth-state.service.ts`, `auth-code.service.ts`,
  `google-auth.service.ts`; Google section in `auth.controller.ts`
  (start → callback → exchange → refresh).
- Refresh responses return `{ accessToken, user }` so the client always has a
  fresh profile.

## 2. Auth Restoration & Refresh

- `AuthInitializer` restores the session on app load from the HttpOnly refresh
  cookie (no tokens stored client-side).
- `ProtectedRoute` + `lib/routes.ts` (`dashboardPathForRole`) drive
  role-based routing: Intern → `/intern/dashboard`, Group Manager →
  `/gpm/dashboard`, HR → `/hr/dashboard`, Admin → `/admin/dashboard`.
- Added a `/dashboard` redirect, `/login`, `/signup`, `/terms` aliases, and a
  catch-all route back to `/`.

## 3. Logout

- Added `useLogoutMutation` (POST `/auth/logout`): clears the Zustand store
  and `queryClient` on settle; wired into the Topbar, StatusPill, and
  InternDashboard.
- Removed dead "Active Sessions" / logout-all controls (server-side refresh
  revocation is not implemented — noted in comments).

## 4. Profile Backend APIs

- `users/me` endpoints: GET profile, PATCH profile (email/role excluded),
  POST change-password (requires current password, strength + no-reuse
  checks), all Zod-validated.
- `buildUserProfile` derives `providers.password` / `providers.google` from the
  DB — provider status is never trusted from the client.
- Mounted under `/api/v1/users` with tests
  (`user.routes.test.ts`, `user-validators.test.ts`).

## 5. Profile Frontend

- `ProfilePage.tsx` at `/profile`: identity card, editable personal details,
  sign-in methods card, change-password form — styled to match the existing
  dashboard design language (#F7F8FA canvas, white cards, shared `Button`).
- `hooks/useProfile.ts`: profile query, update/password mutations, and
  `useSyncAuthUser` to keep the auth store in sync after edits.
- "Your Profile" added to the sidebar menu.

## 6. Account Linking (Google)

- `POST /users/me/google/link/init` (authenticated): rejects if already
  linked, sets the nonce cookie, returns a signed link-mode `state` bound to
  the caller's userId. The account email travels **inside** the signed state,
  never in the URL.
- `linkGoogleAccount()` (transactional): Google email must be Google-verified
  **and** equal the account email (no auto-linking by email alone), refuses a
  `googleId` owned by another account, idempotent on re-link, with a unique
  index race guard. Only `googleId` (+ photo if missing) is written.
- ProfilePage → Sign-in methods: **"Link Google account"** outline button with
  the Google icon and helper text showing which email must match. Success →
  `/profile?link=success`; failures → `/profile?link_error=<safe code>` (no
  tokens in the URL), shown as dismissible banners.

## 7. Role-Based Dashboards & Placeholders

- Email/password login redirects by role to the correct dashboard.
- Placeholder dashboards for Group Manager, HR, and Admin (H1 + H2 only) so
  role routing lands somewhere real.

## 8. Bug Fixes & Cleanup

- Fixed health route hang (stray async handler); 404 message normalized.
- React 19 `JSX` → `ReactElement` in StatusPill; removed unused imports/dead
  icons; fixed test null-guard TypeScript error.
- Google OAuth now uses the configured callback URL; failure reasons mapped to
  safe, non-leaking codes (`AuthFailurePage`).
- **Approved, not yet applied:** `team.controller.ts` should use
  `getAuth(req)` instead of `req.user`.

## 9. Database Migration

- `20261114064052_create_auth_code_and_case_insensitive_username`:
  - `AuthCode` table for single-use exchange codes.
  - Case-insensitive username uniqueness via a raw-SQL
    `lower(username)` unique index (Prisma 7 can't express it), with a
    fail-loud collision pre-check. No colliding usernames found; drift check
    clean.

## 10. Tests & Verification

- New suites: `oauth-state`, `auth-validators`, `auth.routes`, `auth-code`,
  `google-link`, `user.routes`, `user-validators`.
- DB-backed tests are opt-in (`RUN_DB_TESTS=1`); google-link tests use
  throwaway users cleaned up afterwards.
- Final status: backend `typecheck` ✅, `pnpm test` **51 passed / 12
  skipped**, `RUN_DB_TESTS=1` **61 passed / 2 skipped**; frontend `build` ✅,
  `lint` **0 errors**.

## 11. Editable Username in User Profile

- `PATCH /api/v1/users/me` now accepts `{ username }` (authenticated identity
  only — always `getAuth(req)`, never a client-supplied user id). The strict
  Zod body rejects unknown/protected keys, so mass assignment (`role`,
  `email`, `activeStatus`, `password`, `googleId`, …) returns 400.
- Shared `usernameSchema` extracted to `validators/common.validator.ts` and
  reused by `signupSchema` and `updateProfileSchema` (3–30 chars,
  `[a-zA-Z0-9._-]`, trimmed) so signup and profile editing can't drift.
- **Availability = one atomic write.** No SELECT-then-UPDATE, no availability
  endpoint, no per-keystroke checks: the `User_username_key` and
  `User_username_lower_key` indexes are the sole authority. A `P2002` caused
  by a username index is mapped to **409** with `This username is already
  taken.` / `USERNAME_TAKEN` / field `username`; any other constraint error
  still reaches the generic handler (Prisma 7 + `@prisma/adapter-pg` reports
  the index under `meta.driverAdapterError.cause.constraint.index`, handled
  explicitly). Self case-only renames remain valid.
- ProfilePage: read-only → Edit → Save/Cancel with local validation only
  (`lib/username.ts`, also adopted by `SignupPage`), no request while typing,
  unchanged value sends nothing and shows no toast, 409 keeps edit mode +
  typed value and leaves the cache/auth store untouched, success writes the
  PATCH response into `["profile"]` (`setQueryData`, no refetch) and mirrors
  it through `useSyncAuthUser`. Synchronous ref guard prevents double submits.
- **No toast library.** Feedback is inline under the username field
  (`role="alert"` for errors, `role="status"` for the success confirmation),
  leaving `/profile` ready for a purpose-built toast system later. Sonner was
  added and then removed again (`main.tsx` is back to its original
  QueryClient + AuthInitializer mount; no toast dependency in
  `frontend/package.json`).
- `apiClient` now rejects a typed `ApiClientError { status, message, code,
  field }` so components branch on structured codes; the legacy
  `400 → OTP_INVALID` mapping is scoped to the two OTP endpoints only.
- Tests: `user-validators.test.ts` +13 username cases;
  `user.routes.test.ts` gains conflict/case-insensitive/protected-field/
  idempotent coverage. Status: backend `typecheck` ✅, `pnpm test` **61
  passed / 21 skipped**, `RUN_DB_TESTS=1` **80 passed / 2 skipped**,
  `pnpm run build` ✅; frontend `build` ✅, `lint` **0 errors** (4
  pre-existing warnings). Headless-Chrome E2E over CDP: **41/41** checks
  (no request while typing, exactly one PATCH per save, 409 inline copy,
  cache/Zustand untouched on 409, synced on success, double-click guard,
  persistence after reload) — rerun as **15/15** after the toast removal..
- No schema/migration changes; both username indexes verified intact.

## 12. Dark Mode Across the Entire Frontend

- **Goal:** whole-app light/dark theming with a toggle directly below the
  "Your Profile" action in the account menu, switching via a smooth fade
  rather than a snap.
- **Token architecture** (`frontend/src/index.css`): a single class flip on
  `<html class="dark">` re-themes everything. ~50 semantic CSS variables in
  `:root` (light = the exact pre-existing hex values, so light mode is
  pixel-identical) with `.dark` overrides, exposed to Tailwind v4 through
  `@theme inline` so utilities emit `var(--c-*)` and pick up the override at
  runtime. `@custom-variant dark` keeps `dark:` utilities working.
  Tokens: surfaces (`canvas`, `surface`, `grey-25/50/100`, `line-soft`,
  `line`, `line-mid`, `panel`), ink ramp (`ink`, `ink-800…400`), brand
  (`brand`, `brand-text/strong/link/alt/alt-solid/hover/active/soft`) and
  semantic `ok*` / `bad*` / `warn*`.
- **Color migration:** 23 files converted from hardcoded `bg-[#…]` /
  `text-[#…]` / `border-[#…]` / `ring-[#…]` to tokens by an exhaustive
  scripted map (then hand-fixed: SVG `fill`/`stroke` attributes, JS tone and
  state-color constants, `color-mix()` tints replacing the invalid
  `var(--c-x)1A` hex-suffix trick). Near-duplicate hexes were merged into
  shared tokens. Invariant brand panels (`bg-panel` = `#020407`), gradient
  fills, avatar gradients and `bg-white/NN` glass tints were deliberately
  left literal — they are correct in both themes.
- **Toggle** (`StatusPill.tsx`): inserted between "Your Profile" and
  "Log Out" behind a divider, as `role="menuitemcheckbox"` + `aria-checked`
  with a Sun/Moon icon and a switch. It intentionally does **not** close the
  menu — it is a view preference, not navigation, and staying open makes the
  cross-fade visible.
- **Smooth fade:** `store/theme.store.ts` adds `html.theme-fade` for
  `FADE_MS = 420`; `index.css` gives that class `!important` transitions on
  background/border/color/fill/stroke/box-shadow/outline/**transform**
  (400 ms, disabled under `prefers-reduced-motion`), so every token cross-
  fades together while the switch knob still slides. The class is removed
  afterwards so normal transitions are unaffected.
- **State & no-flash:** Zustand store (`ims-theme` localStorage key). With
  no stored choice the OS preference wins and is followed live via a
  `matchMedia` listener (`ThemeInitializer`); an explicit choice then beats
  the OS. `index.html` runs the same resolution inline in `<head>` before
  React mounts, so the first paint is already correct — no theme flash.
- Verification: `npm run build` ✅, `npm run lint` exit **0** (0 errors, the
  same 4 pre-existing warnings). Headless-Chrome CDP E2E: **32/32** (theme
  resolution incl. live OS-follow and stored-choice-beats-OS, menu placement,
  fade sampling through intermediate background values, full re-theme,
  persistence across reload, round-trip back to light) + **19/19** sweep of
  landing/login/signup/terms/sidebar (re-themed, zero un-migrated light
  surfaces). WCAG contrast audit: **dark mode 0 failures** vs. a light
  baseline of 7 (all 7 are pre-existing `text-ink-400` on white cards,
  unchanged from before this work). Screenshots reviewed for landing,
  login, dashboard, account menu and profile in both themes.
- Two issues found and fixed during verification: the dark
  `brand-alt-solid` badge (white text at 3.68:1 → back to `#2563eb`, 5.12:1)
  and the landing nav's `bg-white/80` glass, which stayed white while its
  text inverted (now `bg-surface/80` — identical in light, re-themes in
  dark).
- Known limitations: brand panels and gradients are theme-invariant by
  design; `theme-color` meta is still `#020407`; the toggle lives in the
  `StatusPill` account menu, which only mounts on the intern dashboard
  topbar (the sidebar is global, so the theme itself applies everywhere);
  `frontend/package-lock.json` carries a drift-repair diff from the earlier
  `sonner` uninstall.
