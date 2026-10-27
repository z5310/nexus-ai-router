# Docs page design QA

## Target

- Modular documentation workspace based on the supplied NestJS layout reference.
- Floating frosted header and left navigation with consistent spacing, rounded borders, and a restrained green corner glow.
- Open reading canvas in the center.
- Lightweight on-page navigation based on the supplied ModelGo reference: one vertical guide, a short green active marker, and no enclosing card.
- Dark green theme by default with a complete light theme. The light theme uses a white canvas, subtle borders, and no bottom drop shadows.

## Verification

- Desktop at 1280 × 720: header, sidebar, article, and on-page navigation do not overlap.
- Mobile at 447 × 708: content collapses to one column and has no horizontal overflow.
- Dark and light themes preserve readable contrast and use the same component hierarchy.
- Header, sidebar, and code surfaces have no bottom drop shadows.
- Scrolled content is masked from the top page gutter while remaining softly visible through the translucent, blurred header surface.
- Document width matches viewport width; no horizontal scrollbar is generated.
- Typecheck and production build pass.

## Result

Passed. The implemented layout matches the selected modular structure and the revised linear on-page navigation direction.

# Identity and user admin design QA

## Target

- Increase login form labels, input text, secondary actions, and demo credentials from 7–10px to a readable 12–16px scale.
- Preserve the existing black and green glass visual language.
- Add a dedicated `/admin` workspace with a fixed navigation rail, identity metrics, filters, user table, and a focused edit dialog.
- Keep the admin information density high without reducing essential text below the shared caption token.

## Verification

- Login labels, inputs, options, buttons, and credentials render with the new type scale.
- Admin login routes to `/admin`; manager login routes to `/console`.
- The admin overview loads database-backed totals and four seeded users.
- Search, role/status filters, pagination controls, and edit dialog render without overlap at desktop width.
- Access token, refresh session, `/me`, admin list, and summary endpoints return expected authorization states.
- Typecheck and production build pass.

## Result

Passed after browser review at the active desktop viewport. The login hierarchy is legible and the new administration surface follows the selected product style.


# Billing analytics design QA

- Source visual truth: `/var/folders/wl/1scr3c_928xbcgn59r17fzb40000gn/T/codex-clipboard-7f451d18-34f7-43c5-901b-b5e8bade882c.png`
- Saved source: `/Users/apple/.codex/visualizations/2026/10/26/01a17749-a756-7fc2-9233-71672749ce64/billing-analytics/01-reference.png`
- Implementation: `http://localhost:5173/console/billing`
- Desktop evidence: `/Users/apple/.codex/visualizations/2026/10/26/01a17749-a756-7fc2-9233-71672749ce64/billing-analytics/05-desktop-single-day.jpg`
- Mobile evidence: `/Users/apple/.codex/visualizations/2026/10/26/01a17749-a756-7fc2-9233-71672749ce64/billing-analytics/03-mobile-390.jpg`
- Side-by-side comparison: `/Users/apple/.codex/visualizations/2026/10/26/01a17749-a756-7fc2-9233-71672749ce64/billing-analytics/04-comparison.jpg`
- Viewports: desktop 1269px wide; mobile override 390 × 844 CSS px.
- Pixel dimensions: source 1924 × 1170; desktop 1269 × 1970; mobile 379 × 3460 page content. Browser capture density was 1×. The comparison normalizes each desktop image to a maximum 1100 × 1600 region and places both on a shared canvas.
- State: single-day range with settled usage. Additional checks covered default-today empty state, near-seven-day populated state, and custom date inputs.

## Full-view comparison evidence

The implementation preserves the reference hierarchy: time controls first, high-level amount/request/token metrics next, then a large time-series chart. It extends the source with current balance, frozen funds, model attribution, pending reservations, and the immutable ledger because those are required by the existing Nexus billing product. The light reference palette was intentionally mapped to the existing Nexus dark surfaces and green semantic accent rather than copied literally.

## Focused region comparison evidence

The controls, metrics, chart, legend and model breakdown were inspected at readable scale in the desktop capture. The 390px capture was inspected separately for filter stacking, chart labels, model metadata and responsive ledger cards. No image assets appear in the source or implementation, so asset crop and raster quality do not apply.

## Required fidelity surfaces

- Fonts and typography: existing Nexus system sans stack, weights and hierarchy are consistent with the rest of Console. Metric values remain prominent and small metadata remains readable on desktop and mobile.
- Spacing and layout rhythm: the source's filter → metrics → chart rhythm is retained. Existing Console radii and surface spacing are used. Responsive layout moves filters, metrics, model detail and ledger rows into a single column without horizontal clipping.
- Colors and visual tokens: the source's neutral cards and blue data accent are translated to established dark surfaces and Nexus green. Semantic enabled state and chart series have sufficient visible contrast in the inspected screenshots.
- Image quality and asset fidelity: no raster imagery or custom artwork is required. The chart uses ECharts canvas rendering and existing interface icons use the project's icon library.
- Copy and content: labels distinguish current balance from period consumption, explain that frozen funds are not consumption, identify settled-only statistics, and state that aggregation uses settlement time.

## Findings

No actionable P0, P1 or P2 findings remain.

The reference includes API-key filtering and export controls, but those were outside the requested time/model analysis scope and the current billing reservation schema does not yet retain API-key attribution. They are future capabilities rather than visual omissions in this delivery.

## Comparison history

1. First desktop pass found a P2 metric-card wrap: the full selected date plus “已结算” broke awkwardly in the consumption card at the default desktop width.
2. The card subtitle was shortened to “所选时段 · 已结算”; the exact range remains visible in the filter and chart heading.
3. The revised desktop capture at the same width shows the four metric cards aligned without the earlier wrap. The 390px layout remains readable and free of horizontal overflow.

## Primary interactions and runtime checks

- Default today range loaded automatically from the browser's local date.
- Near-seven-day preset updated summary, chart, model detail and ledger together.
- Custom single-day start/end inputs returned the matching settled DeepSeek usage.
- Empty today state and populated historical state rendered correctly.
- Browser console was checked. The only retained error was an earlier Vite hot-reload event created while the Vue file was temporarily replaced; final reloads rendered successfully with no current runtime failure.

## Follow-up polish

- P3: add API-key attribution and CSV export only after the billing evidence model stores an immutable key identity for each reservation.

final result: passed
