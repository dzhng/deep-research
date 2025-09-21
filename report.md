json{
  "nodes": [
    {
      "id": "start",
      "label": "Start: System Initialization",
      "descriptions": [
        "Initiate costing software for NHS providers (acute, mental/ambulatory/community sectors)",
        "Check for mandatory compliance with Approved Costing Guidance (March 2022) and ISNs",
        "Load prepopulated structures (SYS004: feeds, resources, matching rules from standards CP1-CP5)",
        "Dependencies: Technical document updates (annual/in-year via SYS006); stakeholder needs: Suppliers verify via test plan (Section 4)"
      ]
    },
    {
      "id": "setup",
      "label": "System Setup (SYS001-SYS006)",
      "descriptions": [
        "Create multiple cost models (SYS001: copy reference data/allocation stats; no limits)",
        "Choose YTD/monthly model (SYS002: define periods; reconciliation report for exclusions)",
        "Prepopulate with standards (SYS004: feeds/fields e.g., episode type; allow user-defined mappings)",
        "Track changes (SYS005: timestamps, users); lock models post-signoff (SYS003)",
        "Upload updates (SYS006: central/local; ensure consistency per Data principle)",
        "Constraints: Annual revisions (Section 17); transitional timelines by sector (e.g., acute no new MUST 2022); risks: Inconsistent models leading to audit failures (CP5)"
      ]
    },
    {
      "id": "import",
      "label": "Data Import (DAT001-DAT016)",
      "descriptions": [
        "Transform feeds (DAT001: date/text changes, user procedures; preserve sources)",
        "Import from sources (DAT002: flat/Excel/XML/ODBC; batch/scheduled DAT005/DAT006)",
        "Load/select fields (DAT003: GL/information requirements; add/append/replace/delete DAT007)",
        "Exclude datasets (DAT004: reports); link look-ups (DAT008: codes/prices/weights)",
        "Cost incomplete objects (DAT009: e.g., non-discharged); support alphanumeric (DAT012), 200-char desc (DAT011)",
        "Group activities (DAT013: cost groups in/out scope, R&D, sensitive; NCC additions)",
        "Proxy objects (DAT014: non-identifiable); derive fields (DAT016: e.g., LOS); flag deps (DAT015)",
        "Edge cases: Standalone feeds (DAT011 master/aux/supplementary); risks: Format mismatches causing import fails (level 1 IMP001); dependencies: IR1 for feeds"
      ]
    },
    {
      "id": "validate_import",
      "label": "Import Data Validation (IMP001-IMP007)",
      "descriptions": [
        "Set validations (IMP001: missing mandatories, types, negatives, dups, inconsistencies; Appendix 2 examples)",
        "Severity levels (IMP002: 1=fail, 2=flag/load, 3=minor); reports/export errors (IMP003/IMP004)",
        "Control reports (IMP005: records loaded/excluded/reconciled; IMP006: by time periods)",
        "Flag new GL codes (IMP007)",
        "DVT pre-submission (format/fields/codes; CSV-to-XML; non-acute restricted blanks OK)",
        "Constraints: Three-step quality check (extension); risks: Early errors undetected → output inaccuracies (CP5); technical: XPath for criteria (DAT016)"
      ]
    },
    {
      "id": "decision_import_valid",
      "label": "Decision: Import Valid?",
      "descriptions": [
        "Evaluate: All level 1 pass? (e.g., no blank IDs, valid formats per Appendix 2)",
        "Yes: Proceed to Matching; No: Flag/export to sources (IMP003), cleanse, retry",
        "Edge cases: Partial loads (DAT007); multi-feeds (DAT005 batch); risks: 10%+ unmatched (MAT009) from poor data → reconciliation overload (Appendix 1)"
      ]
    }
  ],
  "edges": [
    {
      "source": "start",
      "target": "setup",
      "relations": ["Initialize per sector mandates (ISNs)"]
    },
    {
      "source": "setup",
      "target": "import",
      "relations": ["Model ready; load feeds per IR1"]
    },
    {
      "source": "import",
      "target": "validate_import",
      "relations": ["Feeds transformed/loaded"]
    },
    {
      "source": "validate_import",
      "target": "decision_import_valid",
      "relations": ["Apply validations (IMP001-IMP007)"]
    }
  ]
}
--continue-response

json{
  "nodes": [
    {
      "id": "matching",
      "label": "Activity Matching (MAT001-MAT013)",
      "descriptions": [
        "Classify feeds (MAT011: master/aux/supplementary/standalone; hierarchy MAT004 no limits)",
        "Automate rules (MAT002: columns e.g., ID/consultant/specialty/location/date; unique user IDs MAT003)",
        "Adjust date ranges (MAT005: days/hours around activity); field combos/orders (MAT006)",
        "Handle unmatched (MAT007: separate cost/reconcile/allocate to matched; Appendix 1 e.g., pathology to specialty/dept)",
        "Assign rule IDs (MAT008); reports (MAT009: % matched/unmatched); unlikely matches (MAT010)",
        "Pre-matched keys (MAT001: import with IDs, report rates); time formats (MAT012: start/finish CCYY/MM/DD hh:mm)",
        "Allocate from aux to master (MAT013: e.g., critical care); master incl. all sectors (MAT004)",
        "Dependencies: CP4 matching; risks: Low match rates → unallocated costs (COS002 patient-facing); edge cases: Cross-sector hierarchies (e.g., acute to community)"
      ]
    },
    {
      "id": "decision_match_quality",
      "label": "Decision: Matching Quality Acceptable?",
      "descriptions": [
        "Evaluate: Match % > threshold (e.g., MAT009 >90%; unmatched <10% per Appendix 1)?",
        "Yes: Proceed to Cost Ledger; No: Refine rules (MAT002-006), re-match, or flag reconciliation (MAT007)",
        "Edge cases: Unlikely scenarios (MAT010); incomplete objects (DAT009); risks: Inaccurate patient costs (CM2/CM3) in multi-sector → NCC failures"
      ]
    },
    {
      "id": "ledger",
      "label": "Cost Ledger & Allocations (COS001-COS011, ALL001-ALL018)",
      "descriptions": [
        "Map GL to CL (COS001: 4 stages CP1-3; classify patient-facing/overheads COS002 min 5 groups)",
        "Disaggregate/transfer/aggregate (COS003-006: stats tables, weights; fields COS005 e.g., fixed/SF/V per CP2.1)",
        "Reciprocal overheads (COS007 CP2); exclude recharges (COS008); reconciliation codes (COS009)",
        "View CL (COS010); classify fixed/variable (COS011); automate allocations (ALL001-ALL018: methods CP3.3, trim points ALL005)",
        "Overheads apportion (ALL002-004: stats/reciprocal CP2.2); weights by cost/income (ALL006-007 variance reports)",
        "Minutes/precision (ALL011-012: 4 decimals); % from feeds (ALL013); match activities (ALL015 CP4)",
        "Dependencies: CP2/CP3 standards; constraints: No Type 2 support (2022 changes); risks: Biased disaggregation (COS003) → inefficient tariffs (Section 10)"
      ]
    }
  ],
  "edges": [
    {
      "source": "decision_import_valid",
      "target": "matching",
      "relations": ["Yes: Matches valid? → Proceed", "No: Retry import/validation"]
    },
    {
      "source": "matching",
      "target": "decision_match_quality",
      "relations": ["Apply rules/hierarchy"]
    },
    {
      "source": "decision_match_quality",
      "target": "ledger",
      "relations": ["Yes: Matches OK → Allocate costs", "No: Refine & re-match"]
    }
  ]
}
--continue-response

json{
  "nodes": [
    {
      "id": "validate_cost",
      "label": "Cost Validation (VAL001-VAL007)",
      "descriptions": [
        "Reconcile GL to absorbed objects (VAL001 CP5; show lines absorbed)",
        "Unallocated CL lines (VAL002 pre-allocation); no-activity methods (VAL003 pre-cost)",
        "Record counts/volumes per method (VAL004 trace to objects); NCC DVT validation (VAL005 issues)",
        "Single model for PLICS/aggregated (VAL006 reconciliation); proxy validation (VAL007 IR1 anonymized/IG)",
        "Exportable/interrogable reports (no VLOOKUP); edge cases: Reconciling items (REP017); risks: No basis allocation → incomplete quantum (CP1); dependencies: CP5 standards"
      ]
    },
    {
      "id": "decision_cost_valid",
      "label": "Decision: Cost Validation Passed?",
      "descriptions": [
        "Evaluate: Reconciliations match (VAL001/006)? No unallocated (VAL002)? Activity present (VAL003)?",
        "Yes: Proceed to Reports; No: Fix mappings/allocations (ALL014), re-validate",
        "Constraints: Export formats (REP015 flat/Excel/ODBC/XML); risks: Proxy IG failures (VAL007) in sensitive data (DAT013); multi-year where available (REP013 min 3 FYs)"
      ]
    },
    {
      "id": "income",
      "label": "Income Ledger (INC001-INC004)",
      "descriptions": [
        "Allocate using costs/drivers (INC001: patient-facing/total as weights)",
        "Disaggregate records (INC002: mixed types/classifications)",
        "Apply validations/ledger ops (INC003: Table 5/COS except COS007; replace cost/resource with income/classification)",
        "Map to resources for netting (INC004: e.g., awards/E&T/other; CM3-5 transitional)",
        "Dependencies: CM3-5 E&T netting; risks: Inaccurate netting → inflated patient costs; edge cases: External recharges (CP2)"
      ]
    },
    {
      "id": "et",
      "label": "Education & Training (E&T001-E&T003)",
      "descriptions": [
        "Single model for patient/E&T objects (E&T001 integration)",
        "Split staff resources (E&T002: patient care/E&T activities)",
        "Choose removal/netting (E&T003: same weightings; CM3-5 transitional income/expenditure)",
        "All prior sections apply (ledgers/allocations); constraints: Flexible for NCC; risks: Non-integration → scope exclusion; dependencies: Transitional methods (CM3-5)"
      ]
    }
  ],
  "edges": [
    {
      "source": "ledger",
      "target": "validate_cost",
      "relations": ["Costs allocated → Validate"]
    },
    {
      "source": "validate_cost",
      "target": "decision_cost_valid",
      "relations": ["Apply reconciliations (VAL001-007)"]
    },
    {
      "source": "decision_cost_valid",
      "target": "income",
      "relations": ["Yes: Costs OK → Handle income", "No: Re-allocate & validate"]
    },
    {
      "source": "income",
      "target": "et",
      "relations": ["Income processed → E&T if applicable"]
    }
  ]
}
--continue-response

json{
  "nodes": [
    {
      "id": "reports",
      "label": "System Reports & Transparency (REP001-REP028)",
      "descriptions": [
        "Trace GL/cost object (REP001: windows/exports Excel/CSV); select fields (REP002: by clinic/date/site/cons etc.)",
        "Compare years (REP003: avg mean/median/mode, adjust MFF/inflation); allocations (REP004-005 GL to CL/overheads bi-dir REP007)",
        "Cost groups (REP008: in/out scope/R&D/E&T/recon); isolate costs (REP010); unit costs (REP011 by attr/resource/group)",
        "Model comparisons (REP012 % change); multi-year (REP013 min 3 FYs); weights (REP014)",
        "Exports (REP015: flat/Excel/ODBC/XML); NCC outputs (REP016 CSV/XML per guidance); reconciling items (REP017); mandatory tables (REP018)",
        "By codes/resources (REP019); filters (REP020-021 activity/resource breakdowns); YTD grouping (REP022 monthly)",
        "Absorbed/non-abs (REP023); collection recon (REP024); CAT sheets (REP025); review/sign-off (REP026 by object/specialty/feed/count/costs)",
        "Incomplete episodes (REP027 CM2); windows at stages (REP028 GL/CL/resources/activities/objects)",
        "Dependencies: CP5/Data principle; constraints: Interrogable (no VLOOKUP); risks: Poor transparency → untraceable errors (e.g., overheads REP007); edge cases: Multi-year gaps (REP013 where available)"
      ]
    },
    {
      "id": "decision_reports",
      "label": "Decision: Reports & Outputs Valid?",
      "descriptions": [
        "Evaluate: Reconciliations complete (REP024/VAL001)? Traceability full (REP001/019)? NCC format compliant (REP016/VAL005)?",
        "Yes: Proceed to Submission/End; No: Review stages (REP026/028), fix (e.g., unmatched REP017), re-report",
        "Edge cases: Sensitive data (DAT013 NCC); risks: Outlier misses (REP003) → inefficient peers (Section 9); stakeholder: Executives sign-off (REP026)"
      ]
    },
    {
      "id": "submit",
      "label": "NCC Submission & Outputs (VAL005-006, REP016/018/024)",
      "descriptions": [
        "Validate NCC (VAL005 DVT rules); single model PLICS/aggregated (VAL006 recon)",
        "Produce outputs (REP016 CSV/XML per sector/year; REP018 mandatory collections; REP024 model recon)",
        "Compliance: NCC guidance (March 2022 specs); DVT (format/fields/codes; non-acute blanks OK)",
        "Dependencies: Approved Guidance/Collection files; constraints: XML format (NHS Digital); risks: Submission failures → resubmissions/delays (Section 41 DVT)",
        "Edge cases: Incomplete episodes (REP027 CM2); proxies (VAL007 IR1)"
      ]
    },
    {
      "id": "futures_test",
      "label": "Future Requirements & Test Plan (Section 3-4, Appendices)",
      "descriptions": [
        "2023: Single integrated NCC (PLICS XML across sectors; E&T integration; quarterly feasibility post-discovery/consultation)",
        "Test plan (Section 4: scenarios for functionality; download https://england.nhs.uk); appendices for unmatched/validation (1-2: examples non-exhaustive; 3: process diagram COS001)",
        "Dependencies: Stakeholder consultation; constraints: Speculative ('may include' E&T/quarterly); risks: Non-compliance → non-mandatory voluntary sectors; technical: Self-assess via IDs/test scenarios"
      ]
    },
    {
      "id": "end",
      "label": "End: Process Complete",
      "descriptions": [
        "Final QA/sign-off (REP026/028); lock model (SYS003); archive for audit (Data principle)",
        "Outputs ready for local/NCC use; feedback loops for 2023 schema/integration",
        "Stakeholder needs: Efficiency (Section 9), tariff accuracy (Section 10); risks mitigated: Variations reduced (Section 15)"
      ]
    }
  ],
  "edges": [
    {
      "source": "et",
      "target": "reports",
      "relations": ["E&T allocated → Generate reports"]
    },
    {
      "source": "reports",
      "target": "decision_reports",
      "relations": ["Produce traces/recons"]
    },
    {
      "source": "decision_reports",
      "target": "submit",
      "relations": ["Yes: Reports OK → Submit NCC", "No: Fix & re-report"]
    },
    {
      "source": "submit",
      "target": "futures_test",
      "relations": ["Outputs validated → Plan for futures/tests"]
    },
    {
      "source": "futures_test",
      "target": "end",
      "relations": ["Test/plan complete"]
    }
  ]
}
--end-response