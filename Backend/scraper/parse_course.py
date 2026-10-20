"""
Parse an SDSU PeopleSoft "Class Search and Enroll" course page (the frame that
contains "Select a class option") into structured data.

Each course has class *options*. An option is one enrollable combination of
classes, e.g. a lecture plus one of its labs. Within an option row, every
column holds one value per class, distinguished by an index suffix (_1, _2, ...)
on the element id.
"""

import re
from bs4 import BeautifulSoup

DAY_CODES = {
    "Monday": "M",
    "Tuesday": "T",
    "Wednesday": "W",
    "Thursday": "Th",
    "Friday": "F",
    "Saturday": "Sa",
    "Sunday": "Su",
}

TIME_RANGE = re.compile(r"(\d{1,2}):(\d{2})\s*([AP]M)\s*to\s*(\d{1,2}):(\d{2})\s*([AP]M)", re.I)
SEATS = re.compile(r"(Open|Closed|Wait\s*List)?\s*Seats?\s*(\d+)\s*of\s*(\d+)", re.I)
WAITLIST = re.compile(r"Wait\s*List\s*(\d+)\s*of\s*(\d+)", re.I)


def _text(element, sep="\n"):
    if not element:
        return ""
    text = element.get_text(sep, strip=True).replace("\xa0", " ")
    return "\n".join(re.sub(r"[ \t]+", " ", line) for line in text.split("\n"))


def _minutes(hour, minute, meridiem):
    hour = int(hour) % 12 + (12 if meridiem.upper() == "PM" else 0)
    return hour * 60 + int(minute)


def parse_schedule(text):
    """'Monday Wednesday\\n1:00PM to 1:50PM\\nFriday\\n...' -> list of meetings."""
    meetings, days = [], []
    for line in [l.strip() for l in text.split("\n") if l.strip()]:
        match = TIME_RANGE.search(line)
        if match:
            meetings.append({
                "days": days,
                "start": _minutes(*match.group(1, 2, 3)),
                "end": _minutes(*match.group(4, 5, 6)),
            })
            days = []
        else:
            found = [DAY_CODES[word] for word in re.findall(r"[A-Za-z]+", line) if word in DAY_CODES]
            if found:
                days = found
    return meetings


def parse_location(text):
    room = re.search(r"\(([^)]+)\)\s*$", text)
    return {
        "location": text,
        "room": room.group(1).strip() if room else None,
    }


def parse_seats(text):
    match = SEATS.search(text)
    waitlist = WAITLIST.search(text)
    return {
        "seats_open": int(match.group(2)) if match else None,
        "seats_total": int(match.group(3)) if match else None,
        "waitlist": int(waitlist.group(1)) if waitlist else None,
        "waitlist_total": int(waitlist.group(2)) if waitlist else None,
    }


def _indexed(row, pattern):
    """Map class index -> text for element ids matching `pattern` with an _N index."""
    values = {}
    for element in row.find_all(id=re.compile(pattern)):
        if element.name not in ("span", "a"):
            continue
        index = int(re.search(pattern, element["id"]).group(1))
        values.setdefault(index, _text(element))
    return values


def _field(soup, element_id):
    return _text(soup.find(id=element_id), " ")


def parse_course_page(html):
    soup = BeautifulSoup(html, "html.parser")

    course = {
        "code": re.sub(r"\s+", " ", _field(soup, "SSR_CRSE_INFO_V_SSS_SUBJ_CATLG")),
        "short_title": _field(soup, "SSR_CRSE_INFO_V_COURSE_TITLE_LONG"),
        "description": _field(soup, "SSR_CRSE_INFO_V_DESCRLONG"),
        "units": _field(soup, "SSR_CLSRCH_F_WK_UNITS_RANGE"),
        "grading": _field(soup, "SSR_CLSRCH_F_WK_SSR_GRAD_BASIS_LNG"),
        "components": _field(soup, "SSR_CLSRCH_F_WK_SSR_COMPONENT_LONG"),
        "career": _field(soup, "SSR_CLSRCH_F_WK_SSR_ACADCAR_LONG"),
        "options": [],
    }

    for row in soup.find_all("tr", id=re.compile(r"^SSR_CLS_DTLS_VW\$0_row_\d+$")):
        option_link = row.find(id=re.compile(r"SSR_OPTION_DESCR"))
        status = row.find(id=re.compile(r"^SSR_DER_CS_GRP_SSR_DESCR\$"))
        session = row.find(id=re.compile(r"^SSR_DER_CS_GRP_SESSION_CODE"))

        components = _indexed(row, r"SSR_CMPNT_DESCR_(\d+)")
        dates = _indexed(row, r"SSR_MTG_DT_LONG_(\d+)")
        schedules = _indexed(row, r"SSR_MTG_SCHED_L_(\d+)")
        locations = _indexed(row, r"SSR_MTG_LOC_LONG_(\d+)")
        instructors = _indexed(row, r"SSR_INSTR_LONG_(\d+)")
        seats = _indexed(row, r"SSR_DESCR50_(\d+)")

        classes = []
        for index in sorted(components):
            label = components[index]
            match = re.match(r"(.+?)\s*-\s*(\d+)$", label)
            # Dates usually appear once per option; fall back to the first.
            date_text = dates.get(index) or dates.get(1, "")
            date_match = re.findall(r"\d{2}/\d{2}/\d{4}", date_text)
            classes.append({
                "component": match.group(1) if match else label,
                "class_nbr": match.group(2) if match else None,
                "start_date": date_match[0] if date_match else None,
                "end_date": date_match[1] if len(date_match) > 1 else None,
                "schedule_text": schedules.get(index, ""),
                "meetings": parse_schedule(schedules.get(index, "")),
                **parse_location(locations.get(index, "")),
                "instructor": instructors.get(index, ""),
                "seats_text": seats.get(index, ""),
                **parse_seats(seats.get(index, "")),
            })

        course["options"].append({
            "option": _text(option_link),
            "status": _text(status),
            "session": _text(session),
            "classes": classes,
        })

    return course


if __name__ == "__main__":
    import json
    import sys

    print(json.dumps(parse_course_page(open(sys.argv[1]).read()), indent=1)[:3000])
