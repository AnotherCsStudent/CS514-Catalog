"""
Combine scraped course files into the dataset the frontend loads at runtime.

  .venv/bin/python scraper/build_dataset.py
  -> Frontend/public/data/schedule-2273.json

Each course keeps its class *options* as the choosable "sections"; an option's
classes (e.g. lecture + lab) each carry their own meetings, room and seats.
"""

import argparse
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent


def units_range(text):
    numbers = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", text or "")]
    if not numbers:
        return 0, 0
    return min(numbers), max(numbers)


def iso_date(text):
    return datetime.strptime(text, "%m/%d/%Y").date().isoformat() if text else None


def modality(classes):
    rooms = [c["room"] or "" for c in classes]
    if rooms and all(room.upper() == "ONLINE" for room in rooms):
        timed = any(c["meetings"] for c in classes)
        return "Online (synchronous)" if timed else "Online (asynchronous)"
    if any(room.upper() == "ONLINE" for room in rooms):
        return "Hybrid"
    return "In person"


def build_class(entry):
    return {
        "classNbr": entry["class_nbr"],
        "component": entry["component"],
        "instructor": entry["instructor"],
        "room": entry["room"] or "TBA",
        "meetings": entry["meetings"],
        "scheduleText": entry["schedule_text"],
        "seatsOpen": entry["seats_open"],
        "seatsTotal": entry["seats_total"],
        "startDate": iso_date(entry["start_date"]),
        "endDate": iso_date(entry["end_date"]),
    }


def build_course(raw):
    unit_min, unit_max = units_range(raw["units"])
    options = []
    for option in raw["options"]:
        classes = [build_class(entry) for entry in option["classes"]]
        options.append({
            "id": "-".join(c["classNbr"] or "?" for c in classes),
            "option": option["option"],
            "status": option["status"],
            "session": option["session"],
            "modality": modality(option["classes"]),
            "classes": classes,
        })
    return {
        "code": raw["code"] or raw["search_code"],
        "subject": raw["subject"],
        "title": raw["title"] or raw["short_title"],
        "description": raw["description"],
        "unitsMin": unit_min,
        "unitsMax": unit_max,
        "career": raw["career"],
        "components": raw["components"],
        "grading": raw["grading"],
        "options": options,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--term-code", default="2273")
    parser.add_argument("--src", default=str(ROOT / "Backend" / "data" / "schedule" / "2273"))
    parser.add_argument("--out", default=str(ROOT / "Frontend" / "public" / "data" / "schedule-2273.json"))
    args = parser.parse_args()

    src = Path(args.src)
    raws = [json.loads(path.read_text()) for path in sorted((src / "courses").glob("*.json"))]
    subjects = json.loads((src / "subjects.json").read_text())

    # The same course can be found under several keys (e.g. cross-listings);
    # keep one entry per course code, preferring the one with more options.
    by_code = {}
    for raw in raws:
        course = build_course(raw)
        current = by_code.get(course["code"])
        if not current or len(course["options"]) > len(current["options"]):
            by_code[course["code"]] = course
    courses = sorted(by_code.values(), key=lambda c: (c["subject"], c["code"]))

    dates = Counter(
        (c["startDate"], c["endDate"])
        for course in courses
        for option in course["options"]
        for c in option["classes"]
        if c["startDate"]
    )
    (start, end), _ = dates.most_common(1)[0] if dates else ((None, None), 0)
    scraped = [raw["scraped_at"] for raw in raws]
    term_name = raws[0]["term"] if raws else ""

    used = {course["subject"] for course in courses}
    dataset = {
        "term": {
            "code": args.term_code,
            "name": term_name,
            "start": start,
            "end": end,
            "scrapedFrom": min(scraped) if scraped else None,
            "scrapedTo": max(scraped) if scraped else None,
            "source": "SDSU public class search (cmsweb.cms.sdsu.edu, guest access)",
        },
        "subjects": [s for s in subjects if s["code"] in used],
        "courses": courses,
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(dataset, separators=(",", ":")))
    options = sum(len(c["options"]) for c in courses)
    print(f"{len(courses)} courses, {options} options, {len(dataset['subjects'])} subjects "
          f"-> {out} ({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
