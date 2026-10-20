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
