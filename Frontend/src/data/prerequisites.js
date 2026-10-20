// Hand-structured version of the free-text `prerequisites` column in
// sdsu_cs_curriculum.csv. Each course lists `all` requirement groups that must
// each be satisfied; a group is satisfied by completing any course in
// `anyOf` (or, when `concurrent` is true, by also taking it this semester).
// `notes` are conditions the app cannot check (consent, GPA, ...).
// `alternative` is a non-course path that waives the course requirements.

const DATA_STRUCTURES = ["CS 210", "CS 305", "CS 496"];
const DS_NOTE = "CS 496 counts only when taken as Data Structures.";
const GRAD_OR_CONSENT = "Graduate standing or instructor consent";
const GRAD_AIT_OR_CONSENT = "Graduate standing in CS or AIT, or instructor consent";

const one = (code) => ({ anyOf: [code] });
const concurrent = (code) => ({ anyOf: [code], concurrent: true });

export const prerequisites = {
  "CS 150": { all: [concurrent("CS 150L")] },
  "CS 150L": { all: [concurrent("CS 150")] },
  "CS 160": { all: [one("CS 150"), concurrent("CS 160L")] },
  "CS 160L": { all: [one("CS 150"), concurrent("CS 160")] },
  "CS 210": { all: [one("CS 160")] },
  "CS 240": { all: [one("CS 160")] },
  "CS 250": { all: [one("CS 160")] },
  "CS 370": { all: [one("CS 240")] },
  "CS 420": { all: [{ anyOf: DATA_STRUCTURES }], notes: [DS_NOTE] },
  "CS 450": {
    all: [
      { anyOf: DATA_STRUCTURES },
      one("MATH 254"),
      {
        anyOf: [
          "STAT 250",
          "STAT 119",
          "BIOL 215",
          "CIV E 160",
          "ECON 201",
          "LING 270",
          "POL S 201",
          "PSY 280",
          "SOC 201",
        ],
      },
    ],
    notes: [DS_NOTE],
  },
  "CS 460": {
    all: [one("MATH 245"), { anyOf: DATA_STRUCTURES }],
    notes: [DS_NOTE],
  },
  "CS 470": { all: [one("CS 370")] },
  "CS 480": { all: [one("CS 210"), one("CS 370")] },
  "CS 496": { all: [] },
  "CS 497": {
    all: [{ anyOf: ["CS 460", "CS 480"] }],
    notes: ["Minimum GPA of 3.3", "Consent of instructor"],
  },
  "CS 498": { all: [one("CS 497")], notes: ["Consent of instructor"] },
  "CS 499": { all: [], notes: ["Consent of instructor"] },
  "CS 503": { all: [one("CS 210"), one("MATH 245")] },
  "CS 514": { all: [one("CS 210"), one("MATH 245")] },
  "CS 521": { all: [one("CS 210")] },
  "CS 530": { all: [one("CS 210"), one("CS 240")] },
  "CS 532": { all: [one("CS 250")] },
  "CS 545": { all: [one("CS 210")] },
  "CS 549": { all: [one("CS 210"), one("MATH 254")] },
  "CS 553": { all: [one("CS 210"), one("MATH 254")] },
  "CS 556": { all: [one("CS 450"), one("MATH 254")] },
  "CS 558": { all: [one("CS 210"), one("STAT 550")] },
  "CS 559": { all: [one("CS 210"), one("MATH 254")] },
  "CS 561": { all: [one("CS 450")] },
  "CS 562": { all: [one("MATH 245")] },
  "CS 572": {
    all: [one("CS 370")],
    notes: ["Knowledge of the C programming language"],
  },
  "CS 574": { all: [one("CS 480"), one("MATH 245")] },
  "CS 576": { all: [concurrent("CS 480")] },
  "CS 577": {
    all: [{ anyOf: ["STAT 119", "STAT 250"] }, one("CS 210"), one("MATH 254")],
  },
  "CS 578": { all: [one("CS 210")] },
  "CS 581": {
    all: [{ anyOf: ["LING 571", "LING 572", "BDA 572", "CS 200", "CS 160"] }],
  },
  "CS 582": { all: [one("CS 210")] },
  "CS 583": { all: [one("CS 210")] },
  "CS 596": { all: [], notes: ["Consent of instructor"] },
  "CY 302": {
    all: [one("CS 160"), one("CS 240")],
    alternative: "Instructor consent",
  },
  "CY 531": {
    all: [one("CS 370"), one("CS 470"), one("CS 480")],
    alternative: GRAD_OR_CONSENT,
  },
  "CY 533": { all: [one("CY 302")], alternative: GRAD_OR_CONSENT },
  "CY 534": {
    all: [one("CS 210"), one("CY 302"), one("MATH 254")],
    alternative: GRAD_OR_CONSENT,
  },
  "CY 541": {
    all: [one("CY 302"), { anyOf: ["CS 450", "CS 549"] }],
    alternative: GRAD_AIT_OR_CONSENT,
  },
  "CY 542": {
    all: [one("STAT 250"), one("CS 549")],
    alternative: GRAD_AIT_OR_CONSENT,
  },
  "CY 569": {
    all: [one("CY 302"), one("CS 470")],
    alternative: GRAD_OR_CONSENT,
  },
  "CY 575": {
    all: [one("CS 574"), one("CS 576")],
    alternative: GRAD_OR_CONSENT,
  },
  "MATH 150": {
    all: [one("MATH 141")],
    notes: ["MATH 141 with a grade of C (2.0) or better"],
    alternative: "Qualification on the Mathematics Placement Assessment",
  },
  "MATH 151": {
    all: [one("MATH 150")],
    notes: ["Grade of C (2.0) or better"],
  },
  "MATH 245": {
    all: [{ anyOf: ["MATH 124", "MATH 150"] }],
    notes: ["Grade of C (2.0) or better"],
  },
  "MATH 254": {
    all: [one("MATH 151")],
    notes: ["Grade of C (2.0) or better"],
  },
  "PHYS 195": {
    all: [],
    notes: ["Prerequisite text is incomplete in our dataset; check the catalog entry"],
  },
  "PHYS 195L": { all: [concurrent("PHYS 195")] },
  "PHYS 196": {
    all: [one("PHYS 195"), one("MATH 151")],
    notes: ["Grade of C (2.0) or better in each"],
  },
  "PHYS 196L": { all: [concurrent("PHYS 196")] },
  "STAT 250": { all: [] },
  "STAT 550": { all: [one("MATH 151"), one("MATH 254")] },
};
