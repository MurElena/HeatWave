# Aggregated Score & Consistency — How Ranking Works

Provider ranking in the Evaluation results page is based on **two scores only**:

1. **Consistency score** (percentage)
2. **Aggregated metric score** (0–100)

The provider with the **highest aggregated metric score wins**.

---

## 1. Consistency score

When the challenge dataset contains **duplicate segments** (identical source
text appearing more than once), the evaluation compares each provider's
translations of those identical sources.

- If all translations of an identical source are **identical**, that segment is
  counted as *consistent*.
- If they differ, the segment is *inconsistent* (a penalty is applied).

```
consistency score (%) = consistent duplicate segments / total duplicate segments × 100
```

When no duplicates exist, consistency is reported as *not available* and no
consistency penalty is applied.

---

## 2. Aggregated metric score

Each selected metric is first **normalized** to a 0–100 "higher is better"
contribution:

| Metric          | Normalization        | Weight |
| --------------- | -------------------- | ------ |
| LLM-as-a-Jury   | value (0–100)        | 0.30   |
| QE              | value (0–100)        | 0.25   |
| ChrF++          | value (0–100)        | 0.20   |
| BLEU            | value (0–100)        | 0.15   |
| WER             | `100 − WER` (lower error is better) | 0.10 |

GenAI metrics (QE and LLM-as-a-Jury) carry the highest weight because they
capture meaning, fluency and terminology better than surface-overlap metrics.

The weighted average uses only the metrics actually selected for the run:

```
base = Σ(normalized_metric × weight) / Σ(weight of selected metrics)
```

### Consistency penalty

If consistency is available, the base score is reduced proportionally to the
inconsistency rate:

```
penalty = (100 − consistency score) / 100 × 0.15
aggregated score = base × (1 − penalty)
```

So a perfectly consistent provider keeps its full base score, while a fully
inconsistent provider loses up to 15% of it.

---

## Human review

When a reviewer finishes a human review, segment scores edited by the human are
re-aggregated using the exact same formula above, producing a separate **Human**
ranking shown alongside the **Automatic** ranking on the results page.
