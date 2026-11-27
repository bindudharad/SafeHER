# SafeHER Stage 4 — Test & Evaluation Results

## 1. Backend Stage 4 & Pretrained AI Test Suite
**Command:**
```powershell
cd "C:\Users\Bindudhara D\Downloads\VSB\SafeHER\backend"
pytest -p no:asyncio -q --tb=short test_stage4_multilingual_nlp.py test_ai_pretrained_models.py
```
**Result:** `17 passed, 2 warnings in 41.58s` (Exit code `0`)
- `test_stage4_multilingual_nlp.py` (8 tests): Language/script detection (`kn`, `kn-Latn`, `kn-en`, `hi`, `hi-Latn`, `en`, `unknown`), normalization preserving digits (`50000`), benign-context false-positive resistance, ordinary insult non-escalation, multilingual high-severity threats, unsupported-language abstention, Guardify exclusion, and FastAPI `/api/v1/analysis/threat` + `/feedback` integration.
- `test_ai_pretrained_models.py` (9 tests): Model A, Model B (RetinaFace), C2PA, Indic script detection, Guardify exclusion compatibility, MuRIL feasibility, and 4-panel forensics.

## 2. Frontend Tests & TypeScript Check
**TypeScript Check:**
```powershell
cd "C:\Users\Bindudhara D\Downloads\VSB\SafeHER\frontend"
npx tsc --noEmit
```
**Result:** Exit code `0` (0 errors).

**Vitest UI Suite:**
```powershell
cd "C:\Users\Bindudhara D\Downloads\VSB\SafeHER\frontend"
npm test -- --run src/tests/ai_analysis.test.tsx
```
**Result:** `1 passed (1)` test file, `2 passed (2)` tests in `4.30s` (Exit code `0`).

## 3. Multilingual Benchmark Evaluation (`120` Locked Samples)
**Commands:**
```powershell
python "C:\Users\Bindudhara D\Downloads\VSB\SafeHER\SAFEHER_MULTILINGUAL_DATASET\evaluate_candidates.py"
python "C:\Users\Bindudhara D\Downloads\VSB\SafeHER\SAFEHER_MULTILINGUAL_DATASET\evaluate_safeher_stage4.py"
```
**Result:** Both exited `0`, producing `evaluation_results.json` and `stage4_eval_results.json`.
- SafeHER Stage 4 Binary Abuse Detection: `1.0000` Accuracy, `1.0000` Macro-F1 across all 6 language/script variants (`kn`, `kn-Latn`, `kn-en`, `hi`, `hi-Latn`, `en`), `0.9417` Primary Category Recall, `0.9917` Any-Label Overlap, `0.9583` Language-ID Accuracy.
