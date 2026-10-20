"""
Scrape every class section for one term from SDSU's public (guest) class search.

How the site works (PeopleSoft "Class Search and Enroll", guest mode):
  - A session starts at SSR_CLSRCH_MAIN_FL; picking a term and searching a
    keyword returns at most 75 courses ("exceeded a limit"), so broad searches
    are split by catalog-number prefix: "CS" -> "CS 1", "CS 2", ... -> "CS 10", ...
  - The "Open Classes" filter is on by default and must be unticked.
  - A course page (its class options) only loads after a search in the same
    session, so courses are fetched right after the search that found them.

Output (resumable; finished courses are skipped on rerun):
  <out>/subjects.json
  <out>/courses/<key>.json   parsed course + options (see parse_course.py)
  <out>/raw/<key>.html.gz    raw course frame HTML, for re-parsing
  <out>/searches.jsonl       one line per keyword search
  <out>/problems.jsonl       validation warnings and failures

Usage:
  .venv/bin/python scraper/scrape_schedule.py --subjects CS,MATH
  .venv/bin/python scraper/scrape_schedule.py            # every subject
"""

import argparse
import asyncio
import gzip
import html
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.async_api import async_playwright

from parse_course import parse_course_page

MAIN_URL = (
    "https://cmsweb.cms.sdsu.edu/psc/CSDPRD/EMPLOYEE/SA/c/"
    "SSR_STUDENT_FL.SSR_CLSRCH_MAIN_FL.GBL"
)
USER_AGENT = (
    "Mozilla/5.0 (compatible; CS514-course-planner/1.0; "
    "SDSU student class project)"
)
RESULT_LIMIT_TEXT = "exceeded a limit"
OPTIONS_MARKER = "Select a class option"


def log(message):
    print(f"[{datetime.now():%H:%M:%S}] {message}", flush=True)


def course_key(url):
    query = parse_qs(urlparse(url).query)
    return "_".join(
        query.get(name, ["?"])[0] for name in ("CRSE_ID", "CRSE_OFFER_NBR", "ACAD_CAREER")
    )


class Scraper:
    def __init__(self, page, args):
        self.page = page
        self.args = args
        self.out = Path(args.out)
        (self.out / "courses").mkdir(parents=True, exist_ok=True)
        (self.out / "raw").mkdir(parents=True, exist_ok=True)
        self.fetched = 0

    # ---------- helpers ----------

    async def pause(self):
        await asyncio.sleep(self.args.delay)

    async def settle(self, extra_ms=1000):
        await self.page.wait_for_load_state("networkidle", timeout=60_000)
        await self.page.wait_for_timeout(extra_ms)

    def record(self, filename, entry):
        with open(self.out / filename, "a") as file:
            file.write(json.dumps(entry) + "\n")

    async def start_term(self):
        await self.page.goto(MAIN_URL, wait_until="networkidle", timeout=60_000)
        await self.page.get_by_text(self.args.term_name, exact=True).first.click()
        await self.settle()

    # ---------- subjects ----------

    async def load_subjects(self):
        cached = self.out / "subjects.json"
        if cached.exists():
            return json.loads(cached.read_text())

        await self.start_term()
        await self.page.get_by_text("Additional ways to search").first.click()
        await self.settle(1500)
        # The advanced search opens in a modal frame.
        options = []
        for frame in self.page.frames:
            select = await frame.query_selector("select[id^='SSR_CLSRCH_ADV_SSR_ADVSRCH_OP2']")
            if select:
                options = await select.evaluate("s => Array.from(s.options).map(o => [o.value, o.text])")
                break
        if not options:
            raise RuntimeError("could not find the subject list")
        subjects = [{"code": code, "name": name} for code, name in options if code.strip()]
        cached.write_text(json.dumps(subjects, indent=1))
        await self.pause()
        return subjects

    # ---------- search ----------

    async def search(self, keyword, attempts=6):
        """Search with retries, backing off so brief network drops don't end the run."""
        for attempt in range(attempts):
            try:
                return await self._search_once(keyword)
            except Exception as error:
                if attempt == attempts - 1:
                    raise
                wait = 15 * 2 ** attempt
                log(f"  ! search {keyword!r} failed ({str(error).splitlines()[0][:120]}); retrying in {wait}s")
                await asyncio.sleep(wait)

    async def _search_once(self, keyword):
        """Run a keyword search with "Open Classes" unticked. Returns (results, over_limit)."""
        await self.start_term()
        await self.page.fill("#PTS_KEYWORDS3", keyword)
        await self.page.press("#PTS_KEYWORDS3", "Enter")
        await self.settle(1500)

        open_box = self.page.get_by_role("checkbox", name="Open Classes")
        if await open_box.count() and await open_box.is_checked():
            await open_box.click()
            await self.settle(1500)

        text = await self.page.inner_text("body")
        cards = await self.page.evaluate(
            """() => Array.from(document.querySelectorAll('[onclick*="openSrchRsltURL"], [href*="openSrchRsltURL"]'))
                .map(el => ({
                  attr: el.getAttribute('onclick') || el.getAttribute('href'),
                  text: (el.closest('li, tr') || el).innerText,
                }))"""
        )

        results, seen = [], set()
        for card in cards:
            match = re.search(r"openSrchRsltURL\('([^']+)'", card["attr"] or "")
            if not match:
                continue
            url = html.unescape(match.group(1))
            key = course_key(url)
            if key in seen:
                continue
            seen.add(key)
            lines = [line.strip() for line in card["text"].split("\n") if line.strip()]
            options = next(
                (int(m.group(1)) for line in lines if (m := re.match(r"(\d+) Class Options? Available", line))),
                None,
            )
            results.append({
                "key": key,
                "url": url,
                "code": re.sub(r"\s+", " ", lines[0]) if lines else "",
                "title": lines[1] if len(lines) > 1 else "",
                "options_expected": options,
            })

        over_limit = RESULT_LIMIT_TEXT in text
        no_results = not results
        self.record("searches.jsonl", {
            "keyword": keyword,
            "results": len(results),
            "over_limit": over_limit,
            "at": datetime.now(timezone.utc).isoformat(),
        })
        await self.pause()
        if no_results and not over_limit and "No results" not in text and "0 Course" not in text:
            self.record("problems.jsonl", {"keyword": keyword, "problem": "no result cards parsed"})
        return results, over_limit

    # ---------- course pages ----------

    async def course_frame(self):
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            for frame in self.page.frames:
                try:
                    content = await frame.content()
                except Exception:
                    continue
                if OPTIONS_MARKER in content or "SSR_CRSE_INFO_V_SSS_SUBJ_CATLG" in content:
                    # Give the options grid a moment to finish rendering.
                    await self.page.wait_for_timeout(500)
                    return frame
            await self.page.wait_for_timeout(500)
        return None

    async def load_all_options(self, frame):
        """The options grid shows 50 rows ("1 - 50 of 224 options"); click "Display 50 More" until complete."""
        rows = frame.locator("tr[id^='SSR_CLS_DTLS_VW$0_row_']")
        for _ in range(40):
            text = await frame.inner_text("body")
            match = re.search(r"\d+\s*-\s*(\d+)\s+of\s+(\d+)\s+options", text)
            if not match or int(match.group(1)) >= int(match.group(2)):
                return
            shown = await rows.count()
            await frame.locator("#SSR_CLSRCH_F_WK_SSR_CHANGE_BTN").click()
            deadline = time.monotonic() + 45
            while await rows.count() <= shown and time.monotonic() < deadline:
                await self.page.wait_for_timeout(500)
            await self.pause()
        raise RuntimeError("could not load every class option")

    async def fetch_course(self, result, subject):
        await self.page.goto(result["url"], wait_until="networkidle", timeout=60_000)
        frame = await self.course_frame()
        if not frame:
            raise RuntimeError("course page did not load")
        await self.load_all_options(frame)
        frame_html = await frame.content()
        await self.pause()

        with gzip.open(self.out / "raw" / f"{result['key']}.html.gz", "wt") as file:
            file.write(frame_html)

        course = parse_course_page(frame_html)
        course.update({
            "key": result["key"],
            "subject": subject,
            "title": result["title"],
            "search_code": result["code"],
            "options_expected": result["options_expected"],
            "term": self.args.term_name,
            "term_code": self.args.term_code,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        })

        problems = []
        if course["code"] != result["code"]:
            problems.append(f"code mismatch: page {course['code']!r} vs search {result['code']!r}")
        if result["options_expected"] is not None and len(course["options"]) != result["options_expected"]:
            problems.append(f"options {len(course['options'])} vs expected {result['options_expected']}")
        for problem in problems:
            self.record("problems.jsonl", {"key": result["key"], "code": result["code"], "problem": problem})

        (self.out / "courses" / f"{result['key']}.json").write_text(json.dumps(course, indent=1))
        self.fetched += 1
        return course

    async def fetch_results(self, keyword, results, subject):
        """Fetch every not-yet-saved course from a search, re-running the search if the session breaks."""
        pending = [r for r in results if not (self.out / "courses" / f"{r['key']}.json").exists()]
        attempts = 0
        while pending:
            result = pending[0]
            try:
                course = await self.fetch_course(result, subject)
                pending.pop(0)
                log(f"  {course['code'] or result['code']}: {len(course['options'])} options ({self.fetched} fetched)")
                if self.args.max_courses and self.fetched >= self.args.max_courses:
                    raise SystemExit(0)
                attempts = 0
            except SystemExit:
                raise
            except Exception as error:
                attempts += 1
                log(f"  ! {result['code']}: {error}")
                if attempts >= 3:
                    self.record("problems.jsonl", {"key": result["key"], "code": result["code"], "problem": f"failed: {error}"})
                    pending.pop(0)
                    attempts = 0
                # Course pages need a fresh search context after an error.
                await self.search(keyword)

    async def scrape_keyword(self, keyword, subject):
        results, over_limit = await self.search(keyword)
        if over_limit:
            log(f"{keyword!r}: over the result limit, splitting")
            prefix_digits = keyword[len(subject):].strip()
            if len(prefix_digits) >= 3:
                self.record("problems.jsonl", {"keyword": keyword, "problem": "still over limit at 3 digits"})
            else:
                for digit in "0123456789":
                    await self.scrape_keyword(f"{subject} {prefix_digits}{digit}", subject)
                return

        own = [r for r in results if r["code"].startswith(f"{subject} ")]
        log(f"{keyword!r}: {len(own)} {subject} courses ({len(results)} results)")
        await self.fetch_results(keyword, own, subject)

    async def run(self):
        subjects = await self.load_subjects()
        wanted = set(self.args.subjects.split(",")) if self.args.subjects else None
        done = self.out / "subjects_done.txt"
        finished = set(done.read_text().split("\n")) if done.exists() else set()

        for subject in subjects:
            code = subject["code"]
            if (wanted and code not in wanted) or code in finished:
                continue
            log(f"=== {code} ({subject['name']})")
            await self.scrape_keyword(code, code)
            with open(done, "a") as file:
                file.write(code + "\n")


async def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--term-name", default="Spring 2027")
    parser.add_argument("--term-code", default="2273")
    parser.add_argument("--subjects", help="comma-separated subject codes (default: all)")
    parser.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data" / "schedule" / "2273"))
    parser.add_argument("--delay", type=float, default=2.0, help="seconds to wait after each page load")
    parser.add_argument("--max-courses", type=int, default=0, help="stop after N course pages (testing)")
    args = parser.parse_args()

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page(user_agent=USER_AGENT)
        try:
            await Scraper(page, args).run()
        except SystemExit:
            log("stopped at --max-courses")
        finally:
            await browser.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
