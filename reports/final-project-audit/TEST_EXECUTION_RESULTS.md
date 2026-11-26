# Test Execution Results (Updated Final Regression)

## Commands & Results
1. `python -m pytest backend/ -v` (`EVIDENCE/backend_tests_final.log`) → **Exit 0**, **12 passed, 0 failed, 0 skipped** in `18.95s` (zero FastAPI `on_event` or `422` deprecation warnings).
2. `npm --prefix frontend run lint` (`EVIDENCE/frontend_lint_final.log`) → **Exit 0** (`oxlint`).
3. `npm --prefix frontend test -- --run` (`EVIDENCE/frontend_tests_final.log`) → **Exit 0**, **14 test files, 44 passed, 0 failed, 0 skipped** in `9.26s`.
4. `npm --prefix frontend run build` (`EVIDENCE/frontend_build_final.log`) → **Exit 0**, `tsc -b && vite build` succeeded in `4.44s`.
