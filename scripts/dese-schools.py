#!/usr/bin/env python3
"""Turn DESE's School Building List into a principal-list import of middle and high schools.

The MSBA offer covers grades 5-9, so we keep buildings that serve those grades as a
middle, junior-high or high school, and drop elementary, early-childhood and vocational
(AVTS) buildings. Schools already in the lead manager (matched on principal email) are
left out, so the import only adds new schools.

  python3 scripts/dese-schools.py [--leads outreach-backup-YYYY-MM-DD.json]

Reads  data/scraper/School Building List.csv  (DESE download, git-ignored)
Writes data/scraper/dese-middle-high.csv      (git-ignored; import as the Principal list)
Prints counts only, never names or emails (project rule 6).
"""
import argparse, csv, glob, json, os, re, sys
from collections import Counter, OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data/scraper/School Building List.csv")
OUT = os.path.join(ROOT, "data/scraper/dese-middle-high.csv")
OFFER = (5, 9)  # grades the MSBA offer covers

s = lambda x: re.sub(r"\s+", " ", (x or "").strip())
GRADE = {"PK": -1, "EC": -2, "K": 0}


def grade(x):
    x = s(x).upper()
    return GRADE.get(x, int(x) if x.isdigit() else None)


def flag(b, k):
    return s(b.get(k)) == "Y"


def level(b, lo, hi):
    """Label in the app's style ("Middle", "Junior High" already exist)."""
    if lo <= 0 and hi >= 9: return "K-12"
    if lo <= 0: return "K-8"
    if flag(b, "JUNIOR_HIGH_SCHOOL_FLAG"): return "Junior High"
    if lo >= 9: return "High"
    if hi >= 9: return "Middle/High"
    return "Middle"


# Buildings with no families to reach: prisons, detention, hospital and diagnostic programs,
# special-ed co-ops, and contract/placement sites. Charter and virtual schools stay.
NOT_A_SCHOOL_DISTRICT = re.compile(r"department of corrections|sev disabled", re.I)
NOT_A_SCHOOL = re.compile(r"correction|corr\.? cent|juvenile|detention|det ct|hospital|diagnostic|treatment|"
                          r"co-?op\b|coop\.|special programs|contract$|external sites|family literacy|"
                          r"family center|therap|center for educ", re.I)


def keep(b):
    """(kept, reason). Middle/junior/high buildings whose grades overlap 5-9."""
    lo, hi = grade(b["BGRADE"]), grade(b["EGRADE"])
    if lo is None or hi is None: return False, "no grade range"
    if flag(b, "AVTS_FLAG"): return False, "vocational (AVTS)"
    if NOT_A_SCHOOL_DISTRICT.search(s(b["DNAME"])) or NOT_A_SCHOOL.search(s(b["SCHNAME"])):
        return False, "not a school (prison, detention, co-op…)"
    if hi < OFFER[0] or lo > OFFER[1]: return False, "grades outside 5-9"
    middle = flag(b, "MIDDLE_SCHOOL_FLAG") or flag(b, "JUNIOR_HIGH_SCHOOL_FLAG") or flag(b, "HIGH_SCHOOL_FLAG")
    if middle or hi >= 7: return True, ""
    return False, "elementary ending at grade 5-6"


def normD(x):
    """Same as normD() in src/lib/helpers.ts."""
    x = re.sub(r"\bsaint\b", "st", str(x or "").lower())
    x = re.sub(r"\b(school|schools|district|public|city|the)\b", "", x)
    return re.sub(r"[^a-z0-9]", "", x)


pad = lambda x: s(str(x or "")).zfill(6) if s(str(x or "")) else ""


def tidy(name):
    """DESE names are sometimes ALL CAPS; leave mixed case alone."""
    return name.title() if name.isupper() or name.islower() else name


def title(t):
    t = s(t).rstrip(".").lower()
    t = re.sub(r"\bpri?ni?c?i?n?c?i?a?pa?l\b", "principal", t)  # "Prinicpal", "Princiapl", "Prinipal", "Prinincipal"
    if t == "p": t = "principal"
    return {"prin": "Principal", "principal": "Principal", "dir": "Director", "director": "Director",
            "superintendent": "Superintendent", "supt": "Superintendent"}.get(t, s(t).title() or "Principal")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--leads", help="lead manager backup to skip existing schools (default: newest outreach-backup-*.json)")
    a = ap.parse_args()
    backups = sorted(glob.glob(os.path.join(ROOT, "outreach-backup-*.json")) + glob.glob(os.path.join(ROOT, "data/outreach-backup-*.json")),
                     key=os.path.basename)
    lp = a.leads or (backups[-1] if backups else None)
    leads = json.load(open(lp)).get("leads", []) if lp else []
    have = {s(l.get("email")).lower() for l in leads if l.get("email")}
    # The app's import also matches a principal by first + last + district (importCsv in src/lib/csv.ts)
    lo_ = lambda x: s(x).lower()
    have_name = {(lo_(l.get("first")), lo_(l.get("last")), lo_(l.get("district"))) for l in leads if not l.get("type") and (l.get("first") or l.get("last"))}
    # Reuse the district spelling already in the app, so filters, the map click and the graph keep one name.
    # Prefer the Principal list's spelling, then the most common one on other lists.
    spell = {}
    for pri in (False, True):   # other lists first, then the Principal list overrides
        best = {}
        for (key, nm), _ in Counter((pad(l.get("districtId")) or "n:" + normD(l.get("district")), s(l.get("district")))
                                    for l in leads if s(l.get("district")) and (not l.get("type")) == pri).most_common():
            best.setdefault(key, nm)
        spell.update(best)

    rows = list(csv.DictReader(open(SRC, encoding="utf-8-sig")))
    why = Counter(); kept = []
    for b in rows:
        ok, r = keep(b)
        if ok: kept.append(b)
        else: why[r] += 1

    # One lead per principal email: a principal over two buildings becomes one lead naming both
    by = OrderedDict(); noemail = 0
    for b in kept:
        e = s(b["SCHEMAIL"]).lower()
        if not e: noemail += 1; e = "nomail:" + s(b["CTYDIST"]) + s(b["SCHNUM"])
        by.setdefault(e, []).append(b)

    out, dup_in_app, levels, blank, respelled = [], 0, Counter(), 0, set()
    for e, bs in by.items():
        if e in have: dup_in_app += 1; continue
        b0 = bs[0]
        first, last = tidy(s(b0["PRINFN"])), tidy(s(b0["PRINLN"]))
        dname = s(b0["DNAME"]); code = pad(s(b0["CTYDIST"]))
        dname_app = spell.get(code) or spell.get("n:" + normD(dname)) or dname
        if dname_app != dname: respelled.add(dname)
        if (first.lower(), last.lower(), dname_app.lower()) in have_name: dup_in_app += 1; continue
        if e.startswith("nomail:") and not (first or last): blank += 1; continue
        lo = min(grade(b["BGRADE"]) for b in bs); hi = max(grade(b["EGRADE"]) for b in bs)
        lv = level(b0, lo, hi) if len(bs) == 1 else level({}, lo, hi)
        levels[lv] += 1
        g = lambda v: "K" if v == 0 else "PK" if v < 0 else f"{v:02d}"
        out.append({
            "First Name": first, "Last Name": last,
            "Email": "" if e.startswith("nomail:") else e, "Phone Number": s(b0["SCHLPHON"]),
            "Job Title": title(b0["PRINTITL"]),
            "School": " / ".join(s(b["SCHNAME"]) for b in bs),
            "District": dname_app, "District ID": s(b0["CTYDIST"]).lstrip("0"),
            "City": s(b0["SCHCITY"]).title(), "State": "MO",
            "Level": lv, "Grades": f"{g(lo)}-{g(hi)}",
            "Notes": "From DESE School Directory (Nov 2026). Enrollment " + ", ".join(s(b["SCHTENR"]) for b in bs) + "."
                     + (f" Leads {len(bs)} buildings." if len(bs) > 1 else ""),
        })

    # Same principal listed under two emails in one district: the app would match the second row on
    # name + district and overwrite the first, so merge them into one lead that keeps the first email.
    merged, idx = [], {}
    for r in out:
        k = (r["First Name"].lower(), r["Last Name"].lower(), r["District"].lower())
        if not (k[0] or k[1]) or k not in idx: idx[k] = len(merged); merged.append(r); continue
        m = merged[idx[k]]; levels[r["Level"]] -= 1
        m["School"] += " / " + r["School"]
        m["Notes"] += f" Also leads {r['School']}" + (f" (email there: {r['Email']})" if r["Email"] else "") + "."
    out = merged; levels = +levels

    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)

    print(f"DESE buildings:            {len(rows)}")
    for r, n in why.most_common(): print(f"  dropped, {r + ':':30} {n}")
    print(f"middle/high buildings:     {len(kept)}  ({len(kept) - len(by)} share a principal with another building)")
    print(f"unique principals:         {len(by)}  ({noemail} without an email)")
    print(f"already in the app:        {dup_in_app}  (skipped; matched on email, or name + district, in {os.path.basename(lp) if lp else 'no backup'})")
    print(f"no name and no email:      {blank}  (skipped)")
    print(f"district spelled as in app:{len(respelled):>5}  (DESE name replaced with the app's existing spelling)")
    print(f"new leads to import:       {len(out)}")
    for lv, n in levels.most_common(): print(f"  {lv + ':':20} {n}")
    print(f"wrote {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
