# 04 — Local Setup & Running

## Prerequisites

- **Python**: 3.10+ (tested in workspace with Python + `pip`)
- **Node.js & npm**: Node 20+ recommended (`npm` available in PATH)
- **Browser**: Modern Chromium/Edge/Firefox (WebGPU optional; CSS/SVG fallback is automatic)

---

## 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

> **Note:** First-time HuggingFace inference downloads `unitary/toxic-bert` and `AdamCodd/vit-base-nsfw-detector` weights into the local HuggingFace cache unless offline/cached.

---

## 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## 3. Run the Application Locally

Open **two terminals** from the repository root (`SafeHER/`):

### Terminal 1 — FastAPI Backend (`127.0.0.1:8000`)
```bash
python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

Verify health:
```bash
curl http://127.0.0.1:8000/api/v1/health
```

### Terminal 2 — Vite Frontend (`localhost:5173`)
```bash
npm --prefix frontend run dev
```

Open `http://localhost:5173` in your browser.

---

## 4. Verification Commands

Run from the repository root (`SafeHER/`):

| Check | Command |
|---|---|
| Backend integration & security tests | `python -m pytest backend/ -v` |
| Frontend linter (`oxlint`) | `npm --prefix frontend run lint` |
| Frontend unit & component tests (`vitest`) | `npm --prefix frontend test -- --run` |
| Frontend TypeScript + Vite production build | `npm --prefix frontend run build` |
| Preview production build | `npm --prefix frontend run preview` |

---

## Related Documents

- [05_ENVIRONMENT_AND_CONFIGURATION.md](05_ENVIRONMENT_AND_CONFIGURATION.md)
- [11_TESTING_AND_QA_GUIDE.md](11_TESTING_AND_QA_GUIDE.md)
- [13_TROUBLESHOOTING_GUIDE.md](13_TROUBLESHOOTING_GUIDE.md)
