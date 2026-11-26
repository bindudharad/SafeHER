# 15 — Contributing & Git Workflow

## Branch & Commit Hygiene

- Default integration branch: `main`
- Create short-lived feature branches for new work (`feat/<area>`, `fix/<issue>`, `docs/<topic>`).
- Use Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.

---

## Pre-Commit Verification Checklist

Before committing changes, run from `SafeHER/`:
1. `python -m pytest backend/ -v`
2. `npm --prefix frontend run lint`
3. `npm --prefix frontend test -- --run`
4. `npm --prefix frontend run build`

---

## Files That Must Never Be Committed

Ensure `.gitignore` excludes:
- `.env` and `.env.*`
- `backend/safeher.db`, `*.db-wal`, `*.db-shm`
- `backend/storage/` (uploaded evidence files)
- `backend/__pycache__/`, `.pytest_cache/`
- `frontend/node_modules/`, `frontend/dist/`
