#!/usr/bin/env python3
"""Build public/district-stats.js (window.MO_DISTRICT_STATS) for the Graph view's "District info" tab.

  python3 scripts/district-stats.py

Reads  data/scraper/School District List.csv  and  School Building List.csv  (DESE downloads, git-ignored)
Writes public/district-stats.js, keyed by the 6-digit DESE district code.

Only organisation-level facts go in the file: enrollment, school and teacher counts, the district
office's and each school's main line, the website, and the email *format* worked out from staff
addresses (e.g. "first.last" at "sps.org"). No person's name or email is written (project rule 6).
Prints counts only.
"""
import csv, json, os, re
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "data/scraper/School District List.csv")
BLDG = os.path.join(ROOT, "data/scraper/School Building List.csv")
OUT = os.path.join(ROOT, "public/district-stats.js")

s = lambda x: re.sub(r"\s+", " ", (x or "").strip())
pad = lambda x: s(x).zfill(6) if s(x) else ""


def num(x):
    x = s(x).replace(",", "")
    return int(x) if x.isdigit() else None


def tidy(name):
    """DESE names are sometimes ALL CAPS; leave mixed case alone."""
    return name.title() if name.isupper() or name.islower() else name


def phone(x):
    d = re.sub(r"\D", "", x or "")
    return f"({d[:3]}) {d[3:6]}-{d[6:]}" if len(d) == 10 else ""


def url(x):
    x = s(x)
    if not x: return ""
    return x if re.match(r"https?://", x, re.I) else "http://" + x


GRADE = {"PK": -1, "EC": -2, "K": 0}
def grade(x):
    x = s(x).upper()
    return GRADE.get(x, int(x) if x.isdigit() else None)


def gtxt(v):
    return "" if v is None else "K" if v == 0 else "PK" if v < 0 else str(v)


def _match(local, first, last):
    f = re.sub(r"[^a-z]", "", s(first).lower())
    parts = [p for p in re.split(r"[\s\-']+", s(last).lower()) if p]
    lasts = [re.sub(r"[^a-z]", "", "".join(parts))] + ([re.sub(r"[^a-z]", "", parts[0])] if len(parts) > 1 else [])
    if not f or not lasts[0]: return None
    for l in lasts:
        cands = [
            ("first.last", f"{f}.{l}"), ("first_last", f"{f}_{l}"), ("first-last", f"{f}-{l}"), ("firstlast", f + l),
            ("f.last", f"{f[0]}.{l}"), ("flast", f[0] + l), ("last.first", f"{l}.{f}"), ("last_first", f"{l}_{f}"),
            ("lastfirst", l + f), ("last.f", f"{l}.{f[0]}"), ("lastf", l + f[0]), ("first.l", f"{f}.{l[0]}"),
            ("firstl", f + l[0]), ("first", f), ("last", l),
        ]
        for name, v in cands:
            if local == v: return name
    return None


def pattern(first, last, email):
    """The local-part format of a staff email, e.g. "first.last" or "flast"; "#" = digits on the end.
    Tries the names as given, then swapped (DESE sometimes has them backwards), then by shape:
    one letter + last = "flast" (a nickname initial), two letters + last = "fmlast" (middle initial)."""
    email = s(email).lower()
    if "@" not in email: return None
    local = email.split("@")[0]
    m = re.match(r"^(.*?)(\d+)$", local)
    num_ = "#" if m and m.group(1) else ""
    if num_: local = m.group(1)
    p = _match(local, first, last) or _match(local, last, first)
    if not p:
        for a, b in ((first, last), (last, first)):
            l = re.sub(r"[^a-z]", "", s(b).lower())
            if len(l) < 3: continue
            if re.fullmatch(r"[a-z]" + re.escape(l), local): p = "flast"; break
            if re.fullmatch(r"[a-z]{2}" + re.escape(l), local): p = "fmlast"; break
            if re.fullmatch(r"[a-z]+\." + re.escape(l), local): p = "first.last"; break
    return p + num_ if p else None


def main():
    dists = list(csv.DictReader(open(DIST, encoding="utf-8-sig")))
    bldgs = list(csv.DictReader(open(BLDG, encoding="utf-8-sig")))

    # Email samples per district: (domain, pattern or None)
    samples = defaultdict(list)
    for d in dists:
        e = s(d["DIEMAIL"]).lower()
        if "@" in e: samples[pad(d["CTYDIST"])].append((e.split("@")[1], pattern(d["SDFNAME"], d["SDLNAME"], e)))
    for b in bldgs:
        e = s(b["SCHEMAIL"]).lower()
        if "@" in e: samples[pad(b["CTYDIST"])].append((e.split("@")[1], pattern(b["PRINFN"], b["PRINLN"], e)))

    schools = defaultdict(list)
    for b in bldgs:
        lo, hi = grade(b["BGRADE"]), grade(b["EGRADE"])
        lv = ("High" if s(b["HIGH_SCHOOL_FLAG"]) == "Y" else "Junior High" if s(b["JUNIOR_HIGH_SCHOOL_FLAG"]) == "Y"
              else "Middle" if s(b["MIDDLE_SCHOOL_FLAG"]) == "Y" else "Elementary" if s(b["ELEMENTARY_SCHOOL_FLAG"]) == "Y"
              else "Vocational" if s(b["AVTS_FLAG"]) == "Y" else "Alternative" if s(b["ALTERNATIVE_SCHOOL_FLAG"]) == "Y" else "")
        schools[pad(b["CTYDIST"])].append({
            "name": tidy(s(b["SCHNAME"])), "grades": f"{gtxt(lo)}-{gtxt(hi)}" if lo is not None and hi is not None else "",
            "lo": lo, "hi": hi, "level": lv, "students": num(b["SCHTENR"]), "phone": phone(b["SCHLPHON"]),
        })

    out, n_fmt = {}, 0
    for d in dists:
        code = pad(d["CTYDIST"])
        if not code: continue
        # Email formats: per domain, how many staff addresses and which patterns they follow
        by_dom = defaultdict(Counter)
        for dom, p in samples.get(code, []): by_dom[dom][p or "?"] += 1
        emails = []
        for dom, c in sorted(by_dom.items(), key=lambda kv: -sum(kv[1].values()))[:3]:
            known = [(p, n) for p, n in c.most_common() if p != "?"]
            emails.append({"domain": dom, "n": sum(c.values()), "patterns": [[p, n] for p, n in known[:3]]})
        if any(e["patterns"] for e in emails): n_fmt += 1
        lv = lambda k: {"schools": num(d[k + "N"]), "students": num(d[k + "TS"])}
        out[code] = {
            "name": tidy(s(d["DNAME"])), "city": s(d["DCITY"]).title(), "county": s(d["DCOUNTY"]),
            "phone": phone(d["DPHONE"]), "url": url(d["URL"]),
            "students": num(d["DTOTSTU"]), "schools": num(d["DTOTSCHL"]), "teachers": num(d["DTOTTECH"]),
            "levels": {"Elementary": lv("DELEMS"), "Middle": lv("DMIDSS"), "Junior High": lv("DJRS"), "High": lv("DHIGHS")},
            "emails": emails,
            "buildings": sorted(schools.get(code, []), key=lambda x: (-(x["lo"] if x["lo"] is not None else -9), x["name"])),
        }

    js = ("/* Missouri school district facts for the Graph view's District info tab. Source: MO DESE School Directory "
          "(School District List + School Building List). Generated by scripts/district-stats.py. "
          "Organisation-level only: no person's name or email. Keyed by DESE district code. */\n"
          "window.MO_DISTRICT_STATS = " + json.dumps(out, separators=(",", ":")) + ";\n")
    open(OUT, "w", encoding="utf-8").write(js)
    print(f"districts:                 {len(out)}")
    print(f"school buildings:          {sum(len(v['buildings']) for v in out.values())}")
    print(f"districts with an email format: {n_fmt}")
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({len(js) // 1024} KB)")


if __name__ == "__main__":
    main()
