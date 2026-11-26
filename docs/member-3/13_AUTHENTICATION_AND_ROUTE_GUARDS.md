# 13 — Authentication & Route Guards

## Pages & Components
- `frontend/src/pages/auth/LoginPage.tsx` — Email/password form calling `useAuth().login()`
- `frontend/src/pages/auth/RegisterPage.tsx` — Name, email, password, and required consent acknowledgement (`consent_acknowledged`) calling `useAuth().register()`
- `frontend/src/components/auth/ProtectedRoute.tsx` — Wraps all authenticated `<Layout />` routes

---

## `ProtectedRoute` Behavior

1. While `isLoading` is `true`, displays a centered Midnight Aurora loading screen with `SafeHERLogo` and `"Verifying secure session..."`.
2. If `isAuthenticated` is `false`, redirects to `/login` with `state={{ from: location }}` (`replace`) so post-login navigation can return to the intended route.
3. Otherwise renders `<>{children}</>`.

---

## Testing
Covered by `frontend/src/tests/auth.test.tsx`.
