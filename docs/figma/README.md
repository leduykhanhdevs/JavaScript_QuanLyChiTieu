# Figma design — Ví Mình

**Figma file:** https://www.figma.com/design/vvXG33wbITaw5QZgGOKAgZ

## Pages

1. `01 · Desktop core` — dashboard, transactions, accounts and transfers, monthly budgets.
2. `02 · Planning & reports` — recurring transactions, savings goals, reports and categories.
3. `03 · Authentication` — sign in, registration, email verification and password recovery.
4. `04 · Design system` — Be Vietnam Pro, VND palette, controls, cards, charts, spacing and corner radii.
5. `05 · Responsive layouts` — tablet dashboard plus mobile dashboard, transactions, transaction form and goals.
6. `06 · Settings & profile` — profile, email status, password and display preferences.
7. `07 · Application states` — empty state, field validation, offline/cache state, failed save and delete confirmation.
8. `08 · Bank linking (local review draft)` — Settings overview, separate consent, bank selection, connected state, mobile layout and re-auth/error state.
9. `09 · AI Agent` — user-approved local compact review draft at `09-ai-agent-compact-review.svg`; the matching compact widget is implemented in the app. Figma frame remains pending because the connected Starter quota is exhausted.
10. `Admin Agent` — `admin-agent-review.svg` is the approved admin workspace layout. The implementation uses aggregate Admin API data and local rule-based responses; it does not read private transaction details or claim revenue figures that the API does not provide.
11. `14-smart-finance-review.svg` — approved local review layout for cashflow forecast, receipt scan, spending flags, Admin Agent and personal AI Coach. The five capabilities are implemented; this SVG is a local review artifact, not a Figma export or native Figma component.
12. `15-admin-expansion-analytics-health.svg` — local vector review draft for Admin Expansion Board 1 (Activity & Analytics A1/A2/A3/A5, Verification Queue & Purge A4/B7, Extended System Health & Migrations A6, and Enhanced User Drawer & Filterable Audit Logs A7/A8/B1/B8).
13. `16-admin-expansion-operations-security.svg` — local vector review draft for Admin Expansion Board 2 (Security Events Monitor B2, Support Tickets & Feedback B5, System Announcements B3, and Operational Settings & Default Category Templates B4/B6).

## Design decisions

- Friendly Vietnamese-first personal-finance interface; VND is the displayed currency.
- Royal Blue `#2563EB` is the primary color for actions, selection and positive income. Its contrast with white is 5.17:1.
- Deep blue `#1E3A8A` anchors balance cards; pale blue `#EFF6FF` marks selected and positive states; secondary blue `#60A5FA` supports charts.
- Coral `#F07D68` marks spending and errors; gold and purple distinguish categories. Cool slate neutrals replace the previous green-tinted surfaces and text.
- Be Vietnam Pro is used throughout. Desktop, tablet and mobile use the same color tokens and state meanings.
- Main application navigation is shared across the signed-in screens. Mobile layouts use a compact bottom navigation.
- The API/PostgreSQL remains the source of truth; LocalStorage is a per-user interface cache. The offline state explicitly says a failed API write was not saved.

The blue palette was selected after the user's Figma review. White text on the primary blue exceeds the 4.5:1 WCAG AA contrast target for normal-size text.

## Source and editability

The original boards `01`–`07` are the SVG sources used to place the approved layouts in the Figma canvas. Those boards were imported as frames with named screen groups and vector elements. This was a visual-first fallback through the Figma editor because canvas MCP calls were unavailable under the connected Starter quota. The imported contents are vector-based; they are not yet a native Auto Layout component library, and some text may need to be edited through its vector group or changed in the source SVG and reimported. The user reviewed and approved the blue design before product source implementation began.

- `generate-design.mjs` generates the desktop boards, authentication flows and design system.
- `generate-responsive.mjs` generates the tablet/mobile board.
- `01-desktop-core.svg` through `07-application-states.svg` are the importable design boards.
- `08-bank-link-settings.svg`, `08b-bank-link-consent.svg`, `08c-bank-link-connected.svg`, `08d-bank-link-mobile.svg`, `08e-bank-link-reauth.svg` and `08f-bank-link-bank-selection.svg` are editable SVG review drafts for the bank-link flow. The selection board now shows one Bank Hub bank picker and a locked CTA. Connected/error states are illustrative and are not evidence of a real bank connection.

The bank-link review drafts have **not** been imported into the Figma file. Figma MCP writes are currently unavailable because the connected Starter quota is exhausted, and both available team seats are View seats. The user approved the local SVG bank-link design on 2026-10-16, which authorized implementing the Settings overview in source. Approval of these drafts is distinct from importing them into Figma, selecting a provider, or approving a live connection flow.

PNG previews of the local SVG review drafts were rendered with CairoSVG for easier inspection; they are not Figma exports:

- `08-bank-link-settings-preview.png`
- `08b-bank-link-consent-preview.png`
- `08c-bank-link-connected-preview.png`
- `08d-bank-link-mobile-preview.png`
- `08e-bank-link-reauth-preview.png`
- `08f-bank-link-bank-selection-preview.png`

The existing P0/P1 product frontend and Node/PostgreSQL API have been implemented under `public/` and `server/`; their original Figma approval gate is complete. The bank-link P2 Settings screen now has a single selector for the 10 personal-account banks currently published by SePay Bank Hub, shows the selected bank's stated feed capability, and keeps its connect button locked. Vietcombank is omitted because it is not in the current published list. This static catalog is not a provider allowlist or live connection. SePay's public Link Token API does not document preselecting a bank, and onboarding/sandbox and a Hosted Link token security review are still missing. Provider-specific connection screens and live behavior remain unimplemented. Any future source work follows the vanilla JavaScript, LocalStorage, and database rules in `AGENTS.md`.

The implementation-to-design review, including the original sidebar mismatch, applied fixes, and verification limits, is documented in [`../UI_FIGMA_REVIEW.md`](../UI_FIGMA_REVIEW.md).

The AI Agent source UI follows the approved local compact SVG. Its Figma frame has not been written because the connected Starter quota is exhausted; this approval and implementation do not represent a Figma export or native Figma component.

The Admin Agent source UI follows `admin-agent-review.svg`. It uses the existing protected Admin overview endpoint for account counts, monthly signups, transaction counts and service status. Responses are generated with local rules; no external model is connected, and monetary transaction data is not exposed to the Agent.

## Historical login hero wallet concept (superseded)

The wallet illustration below was previously integrated into the login page. The current login hero uses the banner artwork documented in the next section; the old files remain as design history and are no longer referenced by the page.

- `10-auth-hero-animation-review.svg` is the editable SVG for the redesigned login hero. It keeps the existing headline and supporting copy, and redraws the lower illustration as vector layers: a copper-orange wallet, gold details, and green banknotes. The lid and notes have separate open/close motion, and the SVG honors `prefers-reduced-motion`.
- `10-auth-hero-animation-review.png` is a still preview captured with the wallet open so the green notes are visible.
- `10-auth-hero-animation-entry.gif` previews the staggered entrance, then the wallet motion. `10-auth-wallet-open-close.gif` previews the repeating open/close cycle.
- `12-auth-wallet-style-concept.png` is the ImageGen raster concept. Prompt brief: a standout warm copper wallet with a gold clasp and emerald-green banknotes against a transparent background. The earlier vector review above was a redraw, which the user found less faithful to this concept.
- On 2026-10-27 the existing authentication page was updated after the user asked to use the more detailed wallet shown in the ImageGen concept. The source images are `12-auth-wallet-style-concept.png`, `13-auth-wallet-transition-imagegen.png` and `13-auth-wallet-shut-imagegen.png`; the latter two are ImageGen edits for the empty and closed states. The app serves lossless WebP copies from `public/assets/`; their visible pixels were compared with the PNG sources. The generated originals also remain in the Codex image output folder.
- The application uses CSS to crossfade those image states and an SVG clip to move the original green notes. This is a layered 2D animation rather than a 3D wallet rig. Reduced-motion preferences show the open image without motion. `13-auth-wallet-implemented.jpg` is a browser screenshot of the local application.
- No external visual sources were used. The original SVG review draft remains in this folder as an earlier design exploration.

## Login hero brand banner (current)

- The login page keeps the approved wordmark, slogan “Tiền của bạn, bạn làm chủ.” and supporting copy. The wallet scene and its category chips have been removed.
- `11-auth-growth-ribbon-source.png` is the original transparent image generated with the built-in ImageGen tool, using the user's screenshot only as a royal-blue layout reference. `public/assets/auth-growth-ribbon.webp` is the optimized WebP used by the app (1536 × 1024, alpha preserved; about 155 KB).
- `public/js/features/auth-view.js` renders the banner; `public/css/app.css` and `public/css/responsive.css` animate the glass ribbon, glow, and orbit. `prefers-reduced-motion` shows a still illustration. This is a CSS animation around a generated raster image, not an animated GIF.
- ImageGen prompt: “Create a polished, memorable 3D abstract symbol for taking control of personal finances, with a confident upward flow and visual rhythm. Use elegant translucent glass ribbons sweeping upward around a small sequence of softly glowing glass bars that rise in height, suggesting clarity, progress, and financial confidence. Use a refined premium 3D glass style with crisp edges, tasteful luminous highlights, white and pale-cyan highlights compatible with a deep royal-blue background. Wide horizontal composition, centered subject, generous transparent negative space, legible at small sizes. No wallet, purse, banknotes, coins, currency symbols, cards, phone, people, text, logo, chart axes, clutter, or watermark.”

## Preview exports

PNG previews exported from the Figma file at 1×:

- `01-desktop-core-preview.png`
- `02-planning-reports-preview.png`
- `03-auth-flows-preview.png`
- `04-design-system-preview.png`
- `05-responsive-layouts-preview.png`
- `06-settings-preview.png`
- `07-application-states-preview.png`
