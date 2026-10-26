#!/usr/bin/env python3
"""Clean an app-users export (name, email) into an Outreach Manager import file for the Users list.

Usage: python3 .claude/scripts/clean-users.py users.csv

Input: two columns by position, Name then Email. Header row optional (a blank or "Name,Email" first row is skipped).

Writes next to the input:
 users-import.csv   Name,Email,Notes, ready for Data -> Import with Users selected.
                    Every row gets a name: if the export has none, one is guessed from the email
                    and Notes says so, so it can be checked in the app.
 users-review.csv   rows left out, with the reason (bad or duplicate email)

Prints counts only, never names or emails.
"""
import csv, re, sys
from collections import Counter
from pathlib import Path

src = Path(sys.argv[1] if len(sys.argv) > 1 else "users.csv")
out = src.parent
EMAIL = re.compile(r"^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$")

def fix_case(w):
    """'mcdonald' -> 'McDonald', "o'brien" -> "O'Brien", 'smith-jones' -> 'Smith-Jones'."""
    w = "-".join(p[:1].upper() + p[1:].lower() for p in w.split("-"))
    w = "'".join(p[:1].upper() + p[1:] for p in w.split("'"))
    return re.sub(r"^Mc([a-z])", lambda m: "Mc" + m.group(1).upper(), w)

def name_from_email(email):
    """'pat.example22@x.org' -> 'Pat Example'; 'patexample@x.org' -> 'Patexample'; all digits -> 'Parent'."""
    parts = [p for p in re.split(r"[._\-+]+|\d+", email.split("@")[0]) if p]
    return " ".join(fix_case(p) for p in parts) or "Parent"

def fix_name(name, email):
    name = re.sub(r"\s+", " ", name).strip().strip(",;")
    if not name or "@" in name or name.lower() == email:
        return name_from_email(email), "name guessed from email"
    if name.islower() or name.isupper():
        return " ".join(fix_case(w) for w in name.split()), "fixed capitalization"
    return name, ""

rows = list(csv.reader(open(src, newline="", encoding="utf-8-sig")))
if rows and (not any(c.strip() for c in rows[0]) or rows[0][0].strip().lower() in ("name", "full name")):
    rows = rows[1:]

seen, keep, review, why = set(), [], [], Counter()
for r in rows:
    r = (r + ["", ""])[:2]
    if not any(c.strip() for c in r):
        why["blank row"] += 1
        continue
    email = r[1].strip().lower().strip("<>.,;")
    name, note = fix_name(r[0], email)
    if not EMAIL.match(email):
        review.append([r[0].strip(), r[1].strip(), "invalid email"]); why["invalid email"] += 1
        continue
    if email in seen:
        review.append([r[0].strip(), r[1].strip(), "duplicate email"]); why["duplicate email"] += 1
        continue
    seen.add(email)
    keep.append([name, email, "Name guessed from email. Check it." if note == "name guessed from email" else ""])
    if note:
        why[note] += 1

with open(out / "users-import.csv", "w", newline="", encoding="utf-8") as f:
    csv.writer(f).writerows([["Name", "Email", "Notes"], *keep])
with open(out / "users-review.csv", "w", newline="", encoding="utf-8") as f:
    csv.writer(f).writerows([["Name", "Email", "Reason"], *review])

print(f"Read {len(rows)} rows -> {len(keep)} ready to import, {len(review)} to review.")
for k, v in why.most_common():
    print(f"  {k}: {v}")
print(f"  missing a name: {sum(1 for n, *_ in keep if not n)}")
