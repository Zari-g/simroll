# Dataset Provenance

## Dataset purpose

`simroll_bjj_mvp_v1` is a compact Brazilian Jiu-Jitsu graph intended for
simulator testing, branching roll generation, Gi/No-Gi compatibility, and
exchanges longer than ten positional transitions. It is an MVP taxonomy, not a
complete BJJ ontology or competition foul engine.

## Source methodology

GrappleMap was used as a structural and topology reference. Because GrappleMap
is No-Gi-oriented and says that clothing and detailed hand fighting are not
modeled, it was not treated as an authority for Gi grips. No GrappleMap pose,
skeleton, or animation data is reproduced.

Major position and technique taxonomy was cross-checked against the references
listed in the curated source, including official IBJJF rules/uniform material
and public Gracie University terminology. Gi semantics received a dedicated
review. Canonical IDs, broad control vocabulary, collapsed state taxonomy,
shared submission terminal, and conservative control-reset policy are SimRoll
normalization decisions.

The repository retains the integration-ready JSON and the package's research
report. Flattened CSV exports and the review workbook duplicate the JSON and
are intentionally omitted from version control. Source checksums and the
reproduction command are recorded beside the curated files.

## Known review items

Eleven transitions remain in the practitioner/manual-review queue. Nine are
class B transitions whose common controls differ between modes. Two are class E
future split candidates:

* `open_guard_top_toreando_to_side_control_top`
* `half_guard_bottom_old_school_sweep_to_side_control_top`

Thirty ownership-sensitive transitions have review records. Their role and
ownership metadata is preserved for Iteration 11B; Iteration 11A does not turn
it into runtime behavior.

## Version and lineage

The repository dataset version is `simroll_bjj_mvp_v1`. The source declares
schema `1.1.0-grip-control-mvp`; the normalized import contract is `1.0.0`.
These versions belong to the data boundary and are not embedded throughout the
simulation engine.
