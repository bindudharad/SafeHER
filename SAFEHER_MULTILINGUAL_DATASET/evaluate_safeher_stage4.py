"""
Evaluates the integrated SafeHER Stage 4 NLP service (analyze_multilingual_threat)
on the locked 120-sample multilingual benchmark and writes stage4_eval_results.json.
"""

from __future__ import annotations

import json
import sys
import time
from collections import defaultdict
from pathlib import Path

from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score

BACKEND_DIR = Path(r"C:\Users\Bindudhara D\Downloads\VSB\SafeHER\backend")
sys.path.insert(0, str(BACKEND_DIR))

from ai.nlp.inference_service import analyze_multilingual_threat  # noqa: E402

DATASET_PATH = Path(__file__).resolve().parent / "safeher_eval_v1.jsonl"
OUT_PATH = Path(__file__).resolve().parent / "stage4_eval_results.json"


def main() -> None:
    records = [json.loads(line) for line in DATASET_PATH.open("r", encoding="utf-8") if line.strip()]

    y_true, y_pred = [], []
    lang_match = 0
    primary_cat_hit = 0
    any_label_hit = 0
    latencies = []
    by_lang = defaultdict(lambda: {"yt": [], "yp": [], "cat_hit": 0, "lang_hit": 0, "n": 0})
    misses = []

    for rec in records:
        t0 = time.perf_counter()
        res = analyze_multilingual_threat(rec["text"])
        latencies.append((time.perf_counter() - t0) * 1000.0)

        truth = 1 if rec["is_abusive"] else 0
        pred = 0 if res["predicted_categories"] == ["BENIGN"] else 1
        y_true.append(truth)
        y_pred.append(pred)

        l_hit = res["language"] == rec["language"]
        if l_hit:
            lang_match += 1

        p_hit = rec["primary_category"] in res["predicted_categories"]
        if p_hit:
            primary_cat_hit += 1
        if set(rec["labels"]).intersection(set(res["predicted_categories"])):
            any_label_hit += 1

        if truth != pred or not p_hit:
            misses.append({
                "id": rec["message_id"],
                "lang": rec["language"],
                "det_lang": res["language"],
                "truth_cat": rec["primary_category"],
                "pred_cats": res["predicted_categories"],
                "truth_bin": truth,
                "pred_bin": pred,
            })

        bl = by_lang[rec["language"]]
        bl["yt"].append(truth)
        bl["yp"].append(pred)
        bl["n"] += 1
        bl["cat_hit"] += int(p_hit)
        bl["lang_hit"] += int(l_hit)

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    summary = {
        "total": len(records),
        "binary_metrics": {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
            "f1_macro": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
            "f1_weighted": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
            "fpr": round(float(fp / (fp + tn)), 4),
            "fnr": round(float(fn / (fn + tp)), 4),
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        },
        "taxonomy_metrics": {
            "primary_category_recall": round(primary_cat_hit / len(records), 4),
            "any_label_overlap": round(any_label_hit / len(records), 4),
            "language_id_accuracy": round(lang_match / len(records), 4),
        },
        "avg_latency_ms": round(sum(latencies) / len(latencies), 2),
        "by_language": {
            lang: {
                "n": d["n"],
                "accuracy": round(float(accuracy_score(d["yt"], d["yp"])), 4),
                "f1_macro": round(float(f1_score(d["yt"], d["yp"], average="macro", zero_division=0)), 4),
                "primary_category_recall": round(d["cat_hit"] / d["n"], 4),
                "language_id_accuracy": round(d["lang_hit"] / d["n"], 4),
            }
            for lang, d in by_lang.items()
        },
        "misses": misses,
    }

    OUT_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in summary.items() if k != "misses"}, indent=2))
    print(f"Misses count: {len(misses)}")
    for m in misses[:10]:
        print("  MISS:", m)


if __name__ == "__main__":
    main()
