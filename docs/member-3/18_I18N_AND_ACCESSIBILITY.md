# 18 — Internationalization (`i18n`) & Accessibility

## Supported Languages (`frontend/src/i18n/translations.ts`)
- `en` — English (default)
- `kn` — Kannada (`ಕನ್ನಡ`)
- `hi` — Hindi (`हिन्दी`)

Managed via `I18nContext.tsx` (`useI18n()`), persisted in `localStorage` (`safeher_preferred_language`), and switchable from both `Navbar.tsx` and `PrivacySettingsPage.tsx` (`/settings`).

---

## Accessibility & Trauma-Informed UX

- **Reduced Motion (`hooks/useReducedMotion.ts`)**: All Three.js, WebGPU, and GSAP animations check `prefers-reduced-motion: reduce`.
- **Quick Exit (`components/layout/QuickExitButton.tsx`)**: Always visible inside `Layout.tsx` to immediately replace history and exit to `https://www.google.com`.
- **Keyboard & Semantic Structure**: Forms use labeled inputs (`Input.tsx`), dialogs use `Modal.tsx`, and color-coded risk badges always pair color with explicit text labels (`SAFE`, `WARNING`, `SUSPICIOUS`, `BLOCKED`).
