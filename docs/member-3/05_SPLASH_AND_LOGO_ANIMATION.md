# 05 — Splash & Logo Animation (`SafeHERSplash.tsx` & `SplashContext.tsx`)

SafeHER features a coordinated 4-stage splash-to-header animation when the application boots.

---

## State Machine (`frontend/src/contexts/SplashContext.tsx`)

```text
entering  ──(220ms)──▶  loading  ──(assets + fonts + auth ready + min 750ms)──▶  travelling  ──(travel complete)──▶  done
   │                                                                                  │
   └────────────────────────(asset load error)────────────────────────────────────▶  error
```

### Exposed Context API (`useSplash()`)
- `splashPhase`: `'entering' | 'loading' | 'travelling' | 'done' | 'error'`
- `isSplashActive`: `boolean`
- `headerLogoHidden`: `boolean` — Hides the navbar's static logo while the splash emblem is flying into its exact bounding box
- `registerLogoTarget(el)`: Called by `Navbar.tsx` (and `LandingPage.tsx` header) to register the destination `HTMLElement`
- `getLogoTargetRect()`: Returns the destination `DOMRect` so `SafeHERSplash.tsx` can animate smoothly to the exact header coordinates
- `markTravelComplete()`: Transitions `travelling` -> `done` and reveals the header logo
- `retryInit()`: Re-runs asset preload if `'error'` occurs

---

## Testing
Verified in `frontend/src/tests/splash_animation.test.tsx`. When editing `Navbar.tsx` or `LandingPage.tsx`, always keep `registerLogoTarget` attached to the header brand emblem so the travel target rect remains valid.
