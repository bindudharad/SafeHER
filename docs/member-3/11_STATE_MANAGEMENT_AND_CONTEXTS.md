# 11 — State Management & Contexts (`frontend/src/contexts/`)

SafeHER uses React Contexts rather than Redux/Zustand, keeping state clean and predictable.

---

## 1. `AuthContext.tsx` (`useAuth()`)
- **State:** `user`, `token`, `isAuthenticated`, `isLoading`
- **Actions:** `login(email, pass)`, `register(name, email, pass, consent)`, `logout()`
- **Bootstrapping (`initAuth`)**:
  - Checks `apiClient.getToken()` (`safeher_jwt_token` in `localStorage`).
  - If present, calls `apiClient.getCurrentUser()`.
  - If absent, automatically signs into the demo account (`ananya.sharma@safeher.protect`) for frictionless first-time evaluation unless the user explicitly logs out.

## 2. `I18nContext.tsx` (`useI18n()`)
- **State:** `language` (`'en' | 'kn' | 'hi'`), `t` (`TranslationDictionary`)
- **Persistence:** `localStorage` key `safeher_preferred_language`; also updates `document.documentElement.lang`.

## 3. `ToastContext.tsx` (`useToast()`)
- Provides transient notification toasts (`success`, `error`, `info`, `warning`) for upload confirmations, API errors, and copy-to-clipboard feedback.

## 4. `SplashContext.tsx` (`useSplash()`)
- Coordinates the 4-stage splash screen (`entering` -> `loading` -> `travelling` -> `done` | `error`) and navbar logo target registration (`registerLogoTarget`, `getLogoTargetRect`).
