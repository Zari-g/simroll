# Curated SimRoll BJJ MVP source

This directory contains the authoritative, integration-ready inputs retained
for Iteration 11A:

* `simroll_bjj_mvp.json` is the canonical machine-readable source consumed by
  the importer.
* `research_and_validation_report.md` records the source methodology,
  validation results, and known review items.

The package's CSV files flatten data already present in the JSON. The review
workbook presents the same material for manual inspection. They are not
committed because they would create competing copies without adding importer
semantics. The original package remains reproducible by these SHA-256 hashes:

```text
135a69e57b29dfbeaa285f6e861c9a3acdca5ec8b32286969ca10f423259824a  simroll_bjj_mvp_package.zip
a2394e1657b25124fd201940622c7f350920809ac976b7263807ab828d72452d  simroll_bjj_mvp.json
a7c16ab1c6635bb4c3dcac3f84eb3e42b0dbb5e4ee87b7ae15e8253cba492b38  research_and_validation_report.md
```

Do not edit the generated normalized artifact directly. Run:

```powershell
python scripts/import_bjj_mvp.py
```

The active simulator continues to load `simroll/data/*.yaml`; this directory is
not a runtime data source in Iteration 11A.
