# Remaining Issues & Blockers (Stage 5)

1. **Pretrained IMDL Tampering Checkpoints Absent**: `IMDLBenCo` is not installed in the Python environment and no pretrained TruFor (`trufor.pth.tar`), CAT-Net (`CAT_full_v2.pth.tar`), or ManTra-Net (`ManTraNet_Ptrain.h5`) checkpoint is present in `models/`. Consequently, tampering localization reports `analysis_status="unavailable"` and `localization_available=False` rather than generating fake heatmaps.
2. **Checkpoint Licensing Verification Required Before Deployment**: External IMDL checkpoints (TruFor, ManTra-Net) carry research/non-commercial restrictions; verify license compatibility before enabling them in production.
3. **Dataset Evaluation Not Run**: Because no IMDL checkpoint is present locally, pixel-level benchmark metrics (IoU, F1, AUC on CASIA/Coverage/NIST) could not be legitimately measured and are not fabricated.
4. **OCR Extraction**: Screenshot OCR was not enabled by default to avoid introducing unverified text-parser dependencies; manual and metadata-derived timeline extraction are active.
5. **SQLite to PostgreSQL Migration**: Current implementation uses SQLite WAL with PostgreSQL-compatible SQL syntax; production PostgreSQL connection pooling remains a future deployment step.
