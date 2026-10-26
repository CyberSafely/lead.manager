#!/usr/bin/env python3
"""Clean the Notion middle / junior high export into Outreach Manager import files.

Usage: python3 .claude/scripts/clean-schools.py "Missouri/middle schools.csv"

The Notion export has no header row. Columns by position:
 0 School  1 Assigned  2 Membership (MSBA / Independent)  3 Level  4 Promo code  5 Sign-up link
 6 Region #  7 District ID  8 District  9 Superintendent "name / email / phone"  10 City
 11 Principal email  12 Principal name  13 Phone  14 Flag (all Y)  15 Grades (e.g. 06-08)

Writes next to the input:
 middle-schools-import.csv      ready for Data -> Import (Principals list)
 middle-schools-review.csv      not usable yet, with the reason
 middle-schools-overseers.csv   superintendents for districts not already in the tracker (Overseers list),
                                one row per district; the tracker links them to schools by District ID
"""
import csv, re, sys
from pathlib import Path

src = Path(sys.argv[1] if len(sys.argv) > 1 else "Missouri/middle schools.csv")
out = src.parent
# Emails known to belong to someone other than the listed principal: one per line in a local,
# git-ignored file (keeps real addresses out of the repo).
_wp = Path(__file__).with_name("known-wrong-contacts.txt")
WRONG_PERSON = {x.strip().lower() for x in _wp.read_text().splitlines() if x.strip()} if _wp.exists() else set()
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$", re.I)

def emails_in(path):
    p = out / path
    if not p.exists():
        return set()
    return {r.get("Email", "").strip().lower() for r in csv.DictReader(open(p, encoding="utf-8-sig"))}

tracked = emails_in("missouri-principals-import.csv")
tracked_ov = emails_in("missouri-overseers-import.csv")

def grades_ok(span):
    """True if the grade span overlaps 5-9."""
    a, _, b = span.partition("-")
    lo = 0 if a.upper() in ("PK", "K", "KG") else int(a or 0)
    hi = int(b or lo)
    return lo <= 9 and hi >= 5

def fix_name(name, email):
    """Notion stores some names as 'Last First'. Swap when the email is clearly first-initial + last."""
    p = name.split()
    if len(p) != 2:
        return name, ""
    first, last = p
    local = re.sub(r"[^a-z]", "", email.split("@")[0].lower())
    if local.startswith(last[0].lower() + first.lower()) and not local.startswith(first[0].lower() + last.lower()):
        return f"{last} {first}", f"Name order fixed from '{name}' (check)"
    return name, ""

rows = list(csv.reader(open(src, encoding="utf-8-sig")))
if rows and "@" not in rows[0][11]:
    rows = rows[1:]  # skip a header row if the export has one

HEAD = ["District ID", "District", "School", "First Name", "Last Name", "Email", "Phone Number", "Job Title",
        "Contact Owner", "Referral Code", "Sign-up Link", "Level", "Grades", "City", "Region", "Assigned", "Notes"]
good, review, overseers, seen = [], [], {}, set()

for r in rows:
    r = [c.strip() for c in r] + [""] * (16 - len(r))
    school, assigned, member, level, code, link, region, did, district, sup, city, email, name, phone, _, grades = r[:16]
    email = email.lower()
    name, note = fix_name(name, email)
    first, _, last = name.partition(" ")
    rec = [did, district, school, first, last, email, phone, "Principal", "Giancarlo", code, link, level, grades, city, region, assigned]

    why = []
    if member != "MSBA":
        why.append("Not an MSBA member: free-year offer doesn't apply")
    if not code or not link:
        why.append("No promo code or sign-up link")
    if not EMAIL.match(email):
        why.append("Missing or invalid email")
    elif email in seen:
        why.append("Duplicate email")
    if email in tracked:
        why.append("Already in the tracker")
    if grades and not grades_ok(grades):
        why.append(f"Grades {grades} outside 5-9")
    if email in WRONG_PERSON:
        why.append("Email belongs to a different person than the listed principal")
    seen.add(email)

    if why:
        review.append(rec + ["; ".join(why)])
        continue
    notes = [note] if note else []
    if grades in ("03-05", "04-05"):
        notes.append("Only grade 5 is in the offer")
    good.append(rec + ["; ".join(notes)])

    parts = [p.strip() for p in sup.split("/")]
    if len(parts) == 3 and parts[1].lower() not in tracked_ov:
        if did not in overseers:
            sf, _, sl = parts[0].partition(" ")
            overseers[did] = [did, district, sf, sl, parts[1].lower(), parts[2], "Superintendent", "Giancarlo", "", []]
        overseers[did][-1].append(school)

def write(name, head, data):
    with open(out / name, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(head)
        w.writerows(sorted(data, key=lambda x: (x[1], x[2])))

write("middle-schools-import.csv", HEAD, good)
write("middle-schools-review.csv", HEAD[:-1] + ["Reason"], review)
# The tracker links overseers to schools by District ID. "Middle and junior highs" is a reference column only:
# the importer ignores it (its header must not contain "school", or it would be read as the School field).
write("middle-schools-overseers.csv", ["District ID", "District", "First Name", "Last Name", "Email", "Phone Number",
                                       "Job Title", "Contact Owner", "Notes", "Middle and junior highs"],
      [o[:-1] + ["; ".join(sorted(o[-1]))] for o in overseers.values()])
print(f"{len(rows)} rows -> {len(good)} ready to import, {len(review)} to review, {len(overseers)} new district overseers")
