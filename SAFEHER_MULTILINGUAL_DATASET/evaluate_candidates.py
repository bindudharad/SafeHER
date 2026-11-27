"""
SafeHER Stage 4 Candidate Classifier Evaluation Script
======================================================
Runs genuine inference on the locked 120-sample evaluation benchmark
(safeher_eval_v1.jsonl) across:
1. unitary/toxic-bert (Existing SafeHER English model)
2. Guardify Baseline LinearSVC (Evaluation-only; unlicensed artifact)
3. Hate-speech-CNERG/indic-abusive-allInOne-MuRIL (AFL-3.0, MuRIL fine-tuned)
4. Hate-speech-CNERG/deoffxlmr-mono-kannada (Apache-2.0, XLM-R Kannada)

Computes binary abuse detection metrics (BENIGN vs ABUSIVE) overall and per
language/script variant (kn, kn-Latn, kn-en, hi, hi-Latn, en), plus latency.
"""

from __future__ import annotations

import os
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"

import json
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline

DATASET_PATH = Path(__file__).resolve().parent / "safeher_eval_v1.jsonl"
OUT_PATH = Path(__file__).resolve().parent / "evaluation_results.json"
GUARDIFY_JOBLIB = Path(r"C:\Projects\SafeHER\SafeHER-Research\Guardify\artifacts\baseline\sample-baseline\estimator.joblib")


def load_eval_data() -> List[Dict[str, Any]]:
    records = []
    with DATASET_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
    return records


def compute_metrics(y_true: List[int], y_pred: List[int]) -> Dict[str, Any]:
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1_macro = f1_score(y_true, y_pred, average="macro", zero_division=0)
    f1_weighted = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    f1_pos = f1_score(y_true, y_pred, pos_label=1, zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
    return {
        "n": len(y_true),
        "accuracy": round(float(acc), 4),
        "precision_abusive": round(float(prec), 4),
        "recall_abusive": round(float(rec), 4),
        "f1_abusive": round(float(f1_pos), 4),
        "f1_macro": round(float(f1_macro), 4),
        "f1_weighted": round(float(f1_weighted), 4),
        "fpr": round(float(fpr), 4),
        "fnr": round(float(fnr), 4),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def eval_hf_model(
    model_id: str,
    records: List[Dict[str, Any]],
    positive_labels: set[str],
    use_top_k: bool = True,
) -> Dict[str, Any]:
    print(f"\n--- Evaluating {model_id} ---")
    t0 = time.perf_counter()
    try:
        tok = AutoTokenizer.from_pretrained(model_id)
    except Exception as tok_exc:
        print(f"Tokenizer load warning for {model_id}: {tok_exc}. Falling back to xlm-roberta-base tokenizer.")
        tok = AutoTokenizer.from_pretrained("xlm-roberta-base")
    mdl = AutoModelForSequenceClassification.from_pretrained(model_id)
    mdl.eval()
    load_time = time.perf_counter() - t0
    print(f"Loaded in {load_time:.2f}s | id2label={mdl.config.id2label}")

    pipe = pipeline(
        "text-classification",
        model=mdl,
        tokenizer=tok,
        framework="pt",
        top_k=None if use_top_k else 1,
        device=-1,
        truncation=True,
        max_length=256,
    )

    y_true = []
    y_pred = []
    per_lang: Dict[str, Dict[str, List[int]]] = defaultdict(lambda: {"y_true": [], "y_pred": []})
    latencies_ms = []
    raw_samples = []

    for rec in records:
        t_start = time.perf_counter()
        out = pipe(rec["text"])[0]
        latencies_ms.append((time.perf_counter() - t_start) * 1000.0)

        if isinstance(out, list):
            scores = {item["label"]: float(item["score"]) for item in out}
            pos_score = max((scores.get(lbl, 0.0) for lbl in positive_labels), default=0.0)
            # For multi-class models like deoffxlmr, abusive if sum of offensive classes > Not_offensive
            if "Not_offensive" in scores:
                off_score = sum(v for k, v in scores.items() if k not in {"Not_offensive", "Not_in_intended_language"})
                pred = 1 if off_score >= 0.5 else 0
                pos_score = off_score
            else:
                pred = 1 if pos_score >= 0.5 else 0
        else:
            lbl = out["label"]
            pred = 1 if lbl in positive_labels else 0
            pos_score = float(out["score"])

        truth = 1 if rec["is_abusive"] else 0
        y_true.append(truth)
        y_pred.append(pred)
        per_lang[rec["language"]]["y_true"].append(truth)
        per_lang[rec["language"]]["y_pred"].append(pred)
        raw_samples.append({
            "message_id": rec["message_id"],
            "language": rec["language"],
            "truth": truth,
            "pred": pred,
            "score": round(pos_score, 4),
        })

    overall = compute_metrics(y_true, y_pred)
    by_lang = {lang: compute_metrics(d["y_true"], d["y_pred"]) for lang, d in per_lang.items()}
    return {
        "model_id": model_id,
        "load_time_s": round(load_time, 2),
        "avg_latency_ms": round(float(np.mean(latencies_ms)), 2),
        "p95_latency_ms": round(float(np.percentile(latencies_ms, 95)), 2),
        "overall": overall,
        "by_language": by_lang,
        "samples": raw_samples,
    }


def eval_guardify_baseline(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    print("\n--- Evaluating Guardify Baseline (LinearSVC, eval-only) ---")
    t0 = time.perf_counter()
    bundle = joblib.load(GUARDIFY_JOBLIB)
    vec = bundle["vectorizer"]
    clf = bundle["model"]
    load_time = time.perf_counter() - t0

    y_true = []
    y_pred = []
    per_lang: Dict[str, Dict[str, List[int]]] = defaultdict(lambda: {"y_true": [], "y_pred": []})
    latencies_ms = []

    for rec in records:
        t_start = time.perf_counter()
        feats = vec.transform([rec["text"]])
        pred_lbl = str(clf.predict(feats)[0])
        latencies_ms.append((time.perf_counter() - t_start) * 1000.0)
        pred = 1 if pred_lbl == "Bullying" else 0
        truth = 1 if rec["is_abusive"] else 0
        y_true.append(truth)
        y_pred.append(pred)
        per_lang[rec["language"]]["y_true"].append(truth)
        per_lang[rec["language"]]["y_pred"].append(pred)

    overall = compute_metrics(y_true, y_pred)
    by_lang = {lang: compute_metrics(d["y_true"], d["y_pred"]) for lang, d in per_lang.items()}
    return {
        "model_id": "guardify-hasoc-linearsvc (eval-only)",
        "load_time_s": round(load_time, 3),
        "avg_latency_ms": round(float(np.mean(latencies_ms)), 3),
        "p95_latency_ms": round(float(np.percentile(latencies_ms, 95)), 3),
        "overall": overall,
        "by_language": by_lang,
    }


def main() -> None:
    records = load_eval_data()
    results = {}

    results["toxic_bert"] = eval_hf_model(
        "unitary/toxic-bert",
        records,
        positive_labels={"toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate"},
    )
    results["guardify_baseline"] = eval_guardify_baseline(records)
    results["indic_abusive_muril"] = eval_hf_model(
        "Hate-speech-CNERG/indic-abusive-allInOne-MuRIL",
        records,
        positive_labels={"LABEL_1"},
    )
    results["deoffxlmr_kannada"] = eval_hf_model(
        "Hate-speech-CNERG/deoffxlmr-mono-kannada",
        records,
        positive_labels={"Off_target_other", "Off_target_group", "Profanity", "Off_target_ind"},
    )

    OUT_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("\n=== SUMMARY (Macro-F1 by Language) ===")
    for name, res in results.items():
        langs = {k: v["f1_macro"] for k, v in res["by_language"].items()}
        print(f"{name:25s} | overall F1={res['overall']['f1_macro']:.4f} acc={res['overall']['accuracy']:.4f} | lat={res['avg_latency_ms']}ms | {langs}")


if __name__ == "__main__":
    main()
