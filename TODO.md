# Violet Void Theme - Improvement TODO

> Auto-maintained by OpenClaw agents.

## 🔥 High Priority

- [x] **Modern CSS Feature Audit** ✅ 2026-02-27
  - Added @layer for cascade control (reset, variables, base, components, utilities)
  - Added @property for typed CSS custom properties (colors)
  - Implemented :has() selector enhancements for better UI targeting
  - Added scroll-snap for sidebar navigation
  - All wrapped in @css{} for Stylus compatibility

## 🟡 Medium Priority

- [x] **Accessibility Review** ✅ 2026-02-27
  - Added prefers-reduced-motion media query
  - Added prefers-reduced-transparency media query
  - Improved focus-visible indicators

- [x] **Code Quality** ✅ 2026-03-15
  - Checked for hardcoded colors - none found (code themes intentionally use specific colors)
  - Verified gradient consistency (vertical/horizontal gradients are intentional)
  - Fixed lint issues: trailing whitespace in modern.styl, added generic font families in ui.styl
  - Commit: 770be94

## 🔮 Future

- [x] **Relative color syntax** ✅ 2026-03-16
  - Added oklch-based color variants (lighter/darker) using `from` keyword
  - Added color-mix() variants for blending colors
  - Added alpha variants using color-mix
  - Added accent color variations (success, warning, info, error)
  - Commit: b860a04

- [ ] **View Transitions API**
- [ ] **CSS nesting migration path**

---

*Last updated: 2026-03-16*
