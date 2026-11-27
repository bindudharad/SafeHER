# SafeHER Stage 4 — Remaining Issues & Limitations

1. **Synthetic Evaluation Scope:** The 120-sample `safeher_eval_v1.jsonl` benchmark is synthetic. Out-of-distribution testing on natural, lawfully licensed Indic social-media / cyber-abuse corpora (with native speaker adjudication) is needed before claiming production generalization on regional dialects (e.g., North Karnataka vs. Coastal Kannada).
2. **MuRIL Fine-Tuning Deferred:** Custom fine-tuning of `google/muril-base-cased` on SafeHER's 12-category taxonomy was not performed because no large, lawfully licensed 12-label multilingual training corpus exists yet and the current host is CPU-only (`torch 2.5.1+cpu`).
3. **Unsupported Languages:** Tamil (`ta`), Telugu (`te`), Malayalam (`ml`), Bengali (`bn`), Marathi (`mr`), and non-Latin/non-Kannada/non-Devanagari scripts are currently returned as `unsupported_language` rather than fabricated.
4. **CPU Latency:** Running 3 transformer models sequentially on CPU averages `274.54 ms` per message (`deoffxlmr-mono-kannada` accounts for ~200+ ms when Kannada is routed).
5. **Pre-Existing Unrelated Test Issue:** `backend/test_backend_integration.py` failed pytest collection due to `No module named 'crypto_vault'` in an unrelated import path, and `pytest_asyncio` plugin throws `AttributeError: 'Package' object has no attribute 'obj'` unless `-p no:asyncio` is passed.
