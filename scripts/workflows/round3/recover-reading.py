#!/usr/bin/env python3
"""Recover the reading-scale workflow outputs that never reached the persist stage.

Pure parsing — NO model calls. Reads the workflow journal (agentId -> structured result) and the
per-agent transcripts (first user message = the prompt, which embeds the items). Re-applies the same
acceptance gate the persist stage would have (blind-solver agreement AND reviewer pass) and writes
accepted / rejected batches + a report into content/round3-staging/.
"""
import json, glob, os, re, sys, hashlib

WF = sys.argv[1] if len(sys.argv) > 1 else ""
OUT = "content/round3-staging"
os.makedirs(f"{OUT}/accepted", exist_ok=True)
os.makedirs(f"{OUT}/rejected", exist_ok=True)
os.makedirs(f"{OUT}/reports", exist_ok=True)

dec = json.JSONDecoder()

def first_user_text(path):
    for line in open(path):
        try: d = json.loads(line)
        except: continue
        if d.get("type") == "user":
            c = d.get("message", {}).get("content")
            if isinstance(c, str): return c
            if isinstance(c, list): return " ".join(x.get("text","") for x in c if isinstance(x, dict))
    return ""

def parse_array_after(text, marker):
    i = text.find(marker)
    if i < 0: return None
    j = text.find("[", i)
    if j < 0: return None
    try:
        arr, _ = dec.raw_decode(text[j:])
        return arr
    except Exception:
        return None

def norm(s): return re.sub(r"\s+", " ", (s or "").strip().lower())

# 1) agentId -> result
res = {}
for line in open(f"{WF}/journal.jsonl"):
    try: d = json.loads(line)
    except: continue
    if d.get("type") == "result" and d.get("agentId"):
        res[d["agentId"]] = d.get("result")

# 2) build solve lookup: stem -> chosenAnswer  (from solve agents' prompt items + result answers)
solve_lookup = {}
review_batches = []  # each: {items:[...], verdicts:[...]}
for f in glob.glob(f"{WF}/agent-*.jsonl"):
    aid = os.path.basename(f)[6:].split(".")[0]
    r = res.get(aid)
    if not isinstance(r, dict): continue
    if isinstance(r.get("answers"), list):
        prompt = first_user_text(f)
        items = parse_array_after(prompt, "Return {answers")
        if not items: items = parse_array_after(prompt, "]. ")
        if not items:
            # fallback: first array anywhere
            j = prompt.find("[{")
            if j >= 0:
                try: items,_ = dec.raw_decode(prompt[j:])
                except: items = None
        if items:
            ans = {a.get("index"): a.get("chosenAnswer") for a in r["answers"] if isinstance(a, dict)}
            for it in items:
                if isinstance(it, dict) and "stem" in it:
                    ca = ans.get(it.get("index"))
                    if ca: solve_lookup[norm(it["stem"])] = ca
    elif isinstance(r.get("verdicts"), list):
        prompt = first_user_text(f)
        items = parse_array_after(prompt, "ITEMS:")
        if items:
            review_batches.append({"items": items, "verdicts": r["verdicts"]})

# 3) apply acceptance per review batch
accepted_all, rejected_all, report = [], [], []
seen_stem = set()
for b in review_batches:
    vmap = {v.get("index"): v for v in b["verdicts"] if isinstance(v, dict)}
    for idx, it in enumerate(b["items"]):
        if not isinstance(it, dict) or "stem" not in it or "correctAnswer" not in it: continue
        key = norm(it.get("passageText","")) + "||" + norm(it["stem"])  # true-duplicate key
        if key in seen_stem:  # dedup exact passage+stem across batches
            continue
        seen_stem.add(key)
        v = vmap.get(it.get("index", idx)) or vmap.get(idx)
        blind = solve_lookup.get(norm(it["stem"]))
        blind_agree = (blind == it["correctAnswer"]) if blind is not None else None
        clean = bool(v and v.get("singleCorrect") and v.get("naturalFrench") and v.get("canadaAppropriate")
                     and not v.get("answerLeak") and v.get("difficultyOk")
                     and (v.get("frenchQuality", 0) >= 80) and v.get("verdict") == "keep")
        ok = clean and (blind_agree is True or blind is None)
        item = {k: it[k] for k in it if k != "_qa"}
        item["_qa"] = {
            "blindAgree": bool(blind_agree) if blind is not None else "unmatched",
            "frenchQuality": (v or {}).get("frenchQuality"),
            "reviewer": "review-pass-recovered",
            "verdict": "published" if ok else "rejected",
        }
        (accepted_all if ok else rejected_all).append(item)
        if not ok:
            reasons = []
            if not v: reasons.append("no_verdict")
            else:
                for f_ in ["singleCorrect","naturalFrench","canadaAppropriate","difficultyOk"]:
                    if not v.get(f_): reasons.append(f"fail_{f_}")
                if v.get("answerLeak"): reasons.append("answerLeak")
                if v.get("frenchQuality",0) < 80: reasons.append("lowFrenchQuality")
                if v.get("verdict") != "keep": reasons.append(f"verdict_{v.get('verdict')}")
            if blind_agree is False: reasons.append("blindDisagree")
            report.append({"stem": it["stem"][:80], "cefr": it.get("cefrLevel"), "reasons": reasons})

# 4) write, grouped by CEFR
def write_grouped(items, sub):
    by = {}
    for it in items: by.setdefault(it.get("cefrLevel","??"), []).append(it)
    files = []
    for cefr, arr in sorted(by.items()):
        p = f"{OUT}/{sub}/{cefr}.json"
        json.dump(arr, open(p, "w"), ensure_ascii=False, indent=1)
        files.append((p, len(arr)))
    return files, by

acc_files, acc_by = write_grouped(accepted_all, "accepted")
rej_files, _ = write_grouped(rejected_all, "rejected")

summary = {
    "reviewBatches": len(review_batches),
    "solveStemsIndexed": len(solve_lookup),
    "accepted": len(accepted_all),
    "rejected": len(rejected_all),
    "acceptedByCefr": {k: len(v) for k, v in acc_by.items()},
    "acceptedFiles": [p for p, _ in acc_files],
    "rejectedFiles": [p for p, _ in rej_files],
}
json.dump({"summary": summary, "rejections": report}, open(f"{OUT}/reports/reading-recovery.json","w"), ensure_ascii=False, indent=1)
# checksums
lines = []
for p, _ in acc_files + rej_files:
    h = hashlib.sha256(open(p,"rb").read()).hexdigest()
    lines.append(f"{h}  {p}")
open(f"{OUT}/reports/reading-recovery.sha256","w").write("\n".join(lines)+"\n")
print(json.dumps(summary, ensure_ascii=False))
