# SafeHER Multilingual Digital Abuse & Threat Evaluation Dataset (`v1.0.0`)

## Overview
This directory contains the versioned, strictly synthetic, zero-PII multilingual evaluation benchmark created for **SafeHER Stage 4**. It is designed to measure digital abuse, blackmail, extortion, cyberstalking, and non-consensual intimate image threat detection across Indian languages and mixed-language communication.

## Language & Script Coverage
- `kn` (20 samples): Native Kannada Unicode (`U+0C80–U+0CFF`), formal & colloquial
- `kn-Latn` (20 samples): Transliterated Kannada in Latin script
- `kn-en` (20 samples): Kannada + English code-mixed (both Unicode+Latin and Latin+Latin)
- `hi` (20 samples): Native Hindi Devanagari (`U+0900–U+097F`)
- `hi-Latn` (20 samples): Hinglish (Hindi + English code-mixed in Latin script)
- `en` (20 samples): English (formal, informal, social-media)

**Total:** 120 locked held-out evaluation samples (`splits/test.jsonl` and `safeher_eval_v1.jsonl`).

## Threat Taxonomy (Multi-Label)
1. `BENIGN`
2. `INSULT`
3. `HARASSMENT`
4. `CYBERSTALKING`
5. `DIRECT_THREAT`
6. `BLACKMAIL`
7. `FINANCIAL_EXTORTION`
8. `SEXUAL_HARASSMENT`
9. `NON_CONSENSUAL_IMAGE_THREAT`
10. `COERCION`
11. `IMPERSONATION_OR_SOCIAL_ENGINEERING`
12. `OTHER_ABUSE`

## Governance & Provenance
- **Source:** `synthetic_safeher_v1` (authored specifically for evaluation; zero real survivor evidence).
- **License:** `CC0-1.0 (SafeHER Synthetic Evaluation Benchmark)`.
- **PII / Intimate Media:** None.
- **Public Dataset References Investigated:** HASOC 2019/2021 (academic research only), DravidianLangTech / EACL 2021 Kannada Offensive Language (academic research), TextDetox Multilingual Toxicity (`openrail++`). Because these public datasets either lack SafeHER's specific threat categories (blackmail, financial extortion, NCII, cyberstalking, digital arrest scams) or carry research-only restrictions, SafeHER's evaluation benchmark uses clean-room synthetic records.
