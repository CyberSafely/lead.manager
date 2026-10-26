#!/usr/bin/env python3
"""Clean a HubSpot newsletter export (the people who opened or clicked) into an import file for the Campaigns list.

Usage: python3 scripts/clean-campaign.py <export>.csv      (.xlsx or .csv)

Reads either kind of HubSpot export:
 - a contacts export (Record ID, First Name, Last Name, Email, ...)
 - an email's recipients export (Recipient, Subject, Sent At, Opened, Clicked, Unsubscribed, Bounce, ...).
   Only people who opened or clicked are kept; bounced, unsubscribed or spam-reporting ones are left out.

Writes next to the input (both are git-ignored):
 <name>-import.csv   ready for Data -> Import with Campaigns selected, or `npm run import-list -- campaign ...`
 <name>-review.csv   rows left out, with the reason (bad or duplicate email)

What it fixes:
 - names HubSpot exported as #VALUE! are left blank (emails then say "Hi there") and Notes says so
 - all-lower / all-upper names get normal capitalization
 - text garbled by a wrong encoding ("â€”" back to "—")
 - abbreviated school names ("Prairie Point Elem." -> "Prairie Point Elementary")
 - phone numbers to digits, emails to lower case, duplicate emails dropped
 - District comes from the associated company ("Company Name" in these exports is MSBA, the list source)
 - the promo code and sign-up link come from unique_url, so {{signup_link}} is the school's own link

Prints counts only, never names or emails.
"""
import csv, re, sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qs, urlparse

src = Path(sys.argv[1] if len(sys.argv) > 1 else "campaign.xlsx")
EMAIL = re.compile(r"^[a-z0-9._%+'\-]+@[a-z0-9.\-]+\.[a-z]{2,}$")
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def read_xlsx(path):
    """First sheet as a list of rows (standard library only)."""
    z = zipfile.ZipFile(path)
    strings = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(NS + "si"):
            strings.append("".join(t.text or "" for t in si.iter(NS + "t")))
    sheet = sorted(n for n in z.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n))[0]
    rows = []
    for row in ET.fromstring(z.read(sheet)).iter(NS + "row"):
        cells = {}
        for c in row.iter(NS + "c"):
            col = 0
            for ch in re.match(r"[A-Z]+", c.get("r")).group():
                col = col * 26 + ord(ch) - 64
            v, t = c.find(NS + "v"), c.get("t")
            if t == "s":
                val = strings[int(v.text)]
            elif t == "inlineStr":
                val = "".join(x.text or "" for x in c.iter(NS + "t"))
            else:
                val = v.text if v is not None else ""
            cells[col - 1] = val or ""
        rows.append([cells.get(i, "") for i in range(max(cells) + 1)] if cells else [])
    return rows


def unmangle(s):
    """UTF-8 text that was read as Windows-1252: 'â€”' -> '—'."""
    if not re.search(r"[âÃ]", s):
        return s
    try:
        return s.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def fix_case(w):
    """'mcdonald' -> 'McDonald', "o'brien" -> "O'Brien", 'smith-jones' -> 'Smith-Jones'."""
    w = "-".join(p[:1].upper() + p[1:].lower() for p in w.split("-"))
    w = "'".join(p[:1].upper() + p[1:] for p in w.split("'"))
    return re.sub(r"^Mc([a-z])", lambda m: "Mc" + m.group(1).upper(), w)


def fix_name(s):
    s = re.sub(r"\s+", " ", unmangle(s)).strip()
    if s.upper() in ("#VALUE!", "#N/A", "#REF!", "#NAME?"):
        return None
    if s.islower() or s.isupper():
        return " ".join(fix_case(w) for w in s.split())
    return s


SCHOOL_WORDS = [
    (r"\bElem\b\.?", "Elementary"), (r"\bSr\.? High\b", "Senior High"), (r"\bJr\.? High\b", "Junior High"),
    (r"\bClass\.(?= )", "Classical"), (r"\bAc\.?$", "Academy"), (r"\bAcad\.?$", "Academy"),
    (r"\bMc([a-z])", lambda m: "Mc" + m.group(1).upper()),
]


# Common US first names: tells "pat.example@" from "example.pat@" (some districts put the last name first)
FIRST_NAMES = set("""
aaron adam alan albert alex alexander alexis alice alicia allison amanda amber amy andrea andrew andy angela angie anita ann
anna anne anthony april ashley barbara becky ben benjamin beth betty beverly bill bob bobbie bonnie brad bradley brandi brandon
brenda brent brett brian brittany brooke bruce bryan carl carla carol carolyn carrie casey cathy chad charles charlotte cheryl
chris christina christine christopher cindy claire cody colleen connie courtney craig crystal curtis cynthia dale dan dana daniel
danielle darlene darren dave david dawn dean debbie deborah debra denise dennis derek diana diane dirk donald donna doris doug
douglas dustin dwayne ed eddie edward elizabeth emily emma eric erica erin evan frank gary gail george gina glenn grace greg
gregory hannah heather heidi helen holly jack jacob jake james jamie jan jane janet janice jared jason jay jayme jean jeff
jeffrey jennifer jenny jeremy jerry jesse jessica jill jim jimmy joan jodi joe joel john jon jonathan jordan joseph josh joshua
joy joyce juan judy julia julie justin karen kari karla kate katherine kathleen kathy katie kay keith kelly ken kenneth kerri
kevin kim kimberly kristen kristin kristy kyle lance laura lauren lawrence leah lee leslie linda lindsay lisa lori louis lucas
luke lynn marc marcus margaret maria marie marilyn mark martha martin mary matt matthew megan melanie melissa michael michele
michelle mike molly monica nancy natalie nathan neil nicholas nick nicole noah pam pamela pat patricia patrick paul peggy
pete peter phil philip rachel randy ray raymond rebecca regina reggie renee rhonda richard rick rob robert robin rodney roger
ron ronald rose russell ruth ryan sabrina sally sam samantha sandra sandy sara sarah scott sean shannon sharon shawn sheila
shelly sherri sherry stacy stephanie stephen steve steven susan suzanne tammy tanya tara teresa terri terry thomas tiffany tim
timothy tina todd tom tommy tonia tony tracy travis troy tyler valerie vanessa vicki victoria vincent walter wanda wayne
wendy william zachary
""".split())


def _parts(email):
    """('pat', 'example') from 'pat.example@', 'pat_q_example@' or 'pat.q.example@'; None otherwise."""
    m = re.fullmatch(r"([a-z]{2,})[._](?:[a-z][._])?([a-z]{2,}(?:[-'][a-z]{2,})?)", email.split("@")[0])
    return (m.group(1), m.group(2)) if m else None


def last_first_domains(emails):
    """Domains whose addresses are mostly last.first, judged by which part is a known first name."""
    vote = Counter()
    for e in emails:
        p = _parts(e)
        if p:
            vote[e.split("@")[1]] += (p[1] in FIRST_NAMES and p[0] not in FIRST_NAMES) - (p[0] in FIRST_NAMES and p[1] not in FIRST_NAMES)
    return {d for d, v in vote.items() if v > 0}


def name_from_email(email, last_first=frozenset()):
    """Only when the address spells it out: 'pat.example@' or 'example.pat@' -> ('Pat', 'Example').
    'pexample@' gives nothing: the first name can't be known, so the email says "Hi there"."""
    p = _parts(email)
    if not p:
        return "", ""
    a, b = p
    swap = (b in FIRST_NAMES and a not in FIRST_NAMES) or (email.split("@")[1] in last_first and a not in FIRST_NAMES)
    first, last = (b, a) if swap else (a, b)
    if len(first) < 3 or not re.search(r"[aeiouy]", first):   # initials or abbreviations ("cg", "wstr")
        return "", ""
    return fix_case(first), fix_case(last)


def fix_school(s):
    s = re.sub(r"\s+", " ", unmangle(s)).strip()
    for pat, rep in SCHOOL_WORDS:
        s = re.sub(pat, rep, s)
    return s


rows = read_xlsx(src) if src.suffix.lower() == ".xlsx" else list(csv.reader(open(src, newline="", encoding="utf-8-sig")))
head = [h.strip().lower() for h in rows[0]]


def col(*names):
    for n in names:
        if n in head:
            return head.index(n)
    return -1


C = {k: col(*v) for k, v in {
    "id": ("record id", "contact id"), "first": ("first name",), "last": ("last name",), "full": ("name", "full name"),
    "email": ("email", "recipient"), "phone": ("phone number", "phone"), "title": ("job title",), "school": ("school",),
    "district": ("associated company (primary)", "associated company", "district"), "owner": ("contact owner",),
    "state": ("state/region", "state"), "url": ("unique_url", "sign-up link"), "last_email": ("last marketing email name",),
    "subject": ("subject",), "sent_at": ("sent at (your time zone)", "sent at"), "opened": ("opened",), "clicked": ("clicked",),
    "unsub": ("unsubscribed",), "bounce": ("bounce",), "spam": ("spam report",),
}.items()}
if C["email"] < 0:
    sys.exit("No Email column found. Is this a HubSpot contacts export?")

OUT = ["Record ID", "First Name", "Last Name", "Email", "Phone Number", "Job Title", "School", "District",
       "Contact owner", "State", "Referral Code", "Sign-up Link", "Notes"]
seen, keep, review, fixes = set(), [], [], Counter()
LAST_FIRST = last_first_domains((r[C["email"]] if C["email"] < len(r) else "").strip().lower() for r in rows[1:])
for r in rows[1:]:
    g = lambda k: (r[C[k]] if 0 <= C[k] < len(r) else "").strip()
    if not any(c.strip() for c in r):
        continue
    email = g("email").lower().strip("<>.,;")
    yes = lambda k: g(k).lower() == "true"
    if C["opened"] >= 0 and not (yes("opened") or yes("clicked")):
        fixes["left out: didn't open"] += 1
        continue
    out_why = "unsubscribed" if yes("unsub") else "bounced" if yes("bounce") else "spam report" if yes("spam") else ""
    if out_why:
        review.append([g("first"), g("last"), g("email"), out_why]); fixes["left out: " + out_why] += 1
        continue
    if not EMAIL.match(email):
        review.append([g("first"), g("last"), g("email"), "invalid email"]); fixes["left out: invalid email"] += 1
        continue
    if email in seen:
        review.append([g("first"), g("last"), g("email"), "duplicate email"]); fixes["left out: duplicate email"] += 1
        continue
    seen.add(email)

    notes = []
    first, last = g("first"), g("last")
    if C["first"] < 0 and g("full"):
        first, _, last = g("full").partition(" ")
    f2, l2 = fix_name(first), fix_name(last)
    if f2 is None or l2 is None:
        fixes["name was #VALUE! (left blank)"] += 1
        notes.append("Name was #VALUE! in HubSpot. Look it up before a personal email (it says \"Hi there\" until then).")
    if (f2 or "", l2 or "") != (first, last) and f2 is not None and l2 is not None:
        fixes["name capitalization fixed"] += 1
    first, last = f2 or "", l2 or ""
    if C["first"] < 0 and C["full"] < 0:
        first, last = name_from_email(email, LAST_FIRST)
        if first:
            fixes["name guessed from email (first.last)"] += 1
            notes.append("Name guessed from the email address. Check it before a personal email.")
        else:
            fixes["no name (emails say \"Hi there\")"] += 1

    school = fix_school(g("school"))
    if school != g("school"):
        fixes["school name expanded"] += 1
    district = unmangle(g("district"))

    phone = re.sub(r"\D", "", g("phone"))
    if len(phone) == 11 and phone.startswith("1"):
        phone = phone[1:]
    if phone and len(phone) != 10:
        fixes["phone not 10 digits (kept as is)"] += 1
        phone = g("phone")

    url = g("url")
    code = (parse_qs(urlparse(url).query).get("promo") or [""])[0] if url.startswith("http") else ""
    k12 = re.search(r"\.k12\.([a-z]{2})\.us$", email)
    state = g("state") or ("MO" if code.startswith("MO-") else k12.group(1).upper() if k12 else "")

    last_email = unmangle(g("last_email"))
    if last_email != g("last_email"):
        fixes["garbled characters fixed"] += 1
    if last_email:
        notes.append(f"Last HubSpot marketing email: {last_email}.")
    if g("subject"):
        did = "Clicked" if yes("clicked") else "Opened"
        notes.append(f"{did}: \"{unmangle(g('subject'))}\"" + (f" (sent {g('sent_at')[:10]})." if g("sent_at") else "."))

    keep.append([g("id"), first, last, email, phone, g("title"), school, district, g("owner"), state, code, url, " ".join(notes)])

out = src.with_name(src.stem + "-import.csv")
with open(out, "w", newline="", encoding="utf-8") as fh:
    csv.writer(fh).writerows([OUT] + keep)
print(f"{len(rows) - 1} rows in, {len(keep)} ready to import -> {out.name}")
if review:
    rv = src.with_name(src.stem + "-review.csv")
    with open(rv, "w", newline="", encoding="utf-8") as fh:
        csv.writer(fh).writerows([["First Name", "Last Name", "Email", "Reason"]] + review)
    print(f"{len(review)} left out -> {rv.name}")
for k, n in sorted(fixes.items()):
    print(f"  {k}: {n}")
print(f"  with a sign-up link: {sum(1 for k in keep if k[11])}, with a district: {sum(1 for k in keep if k[7])}, with a phone: {sum(1 for k in keep if k[4])}")
