# Local Animation Visual QA

Run the backend from the repository root in PowerShell:

```powershell
python -m uvicorn simroll.api.app:app --reload
```

Run the frontend in a second PowerShell terminal:

```powershell
cd frontend
npm.cmd run dev
```

Open `http://localhost:5173`, choose **Roll simulator**, and start a roll. Vite
proxies `/api` to `http://127.0.0.1:8000` by default.

## Constraint overlay

Use **Show constraints** while running the Vite development server to inspect
Player A/B joints and bones, relational source/target landmarks, target error,
priority, anchor type, ground baselines, and grounded anchors. The control is
compiled behind `import.meta.env.DEV`, is absent from production builds, reads
already-solved geometry, and cannot alter playback or semantic roll state.

## Static positions

Inspect Closed Guard, Open Guard, Half Guard, Side Control, Mount, and Back
Control. Check each available top/bottom orientation; an unavailable orientation
should show the intentional placeholder. Look for floating or sinking, impossible
overlap, extreme joints, disconnected grips, incorrect facing, bad ground
contact, implausible pelvis placement, obvious limb intersections, asymmetry,
and mirrored-role mistakes.

## Showcase transitions

- Butterfly Sweep: verify hook connection, visible off-balance, paired rotation,
  stable leg length/knee direction, no root teleport, and a clean destination.
- Half Guard Old-School Sweep: verify connected bodies, understandable role
  reversal, paired movement, stable grounding, and a clean destination.
- Back-Control Turn-In Escape: verify close starting bodies, paired turn-in,
  bounded separation, no seatbelt limb-IK artifact, recognizable Half Guard,
  and no endpoint pop.

## Auto Roll

Run several 10-step Auto Rolls in both Gi and No-Gi (continue manually or with a
second Auto Roll to inspect roughly 10-15 transitions). Confirm that each step
starts at the previous endpoint, controls do not teleport unnecessarily, bodies
do not reset, orientation is consistent, grapplers never disappear, timing is
stable, the overlay does not affect playback, and visible state matches history.

Record the browser, viewport, mode, sequence length, and any reproducible issue.
Automated geometry validation is not a substitute for this visual sign-off.
## 15E verification handoff

Automated dense continuity covers all 12 registered techniques in Gi and No-Gi
at 0.0001 progress intervals, including exact endpoints. Run
`npm.cmd run animation:continuity` to reproduce. Existing checks retain contact,
grounding, finite geometry, bone length, and separation assertions.

Browser visual QA was not performed because both browser discovery and the
in-app browser reported unavailable. Numeric checks are not visual sign-off.
Review source, early, middle, late, and destination frames for all 12 registered
techniques, including the existing Mount Bottom and Open Guard Top orientations.
Fixed Player A/B identities must remain unchanged.

Pay special attention to Toreando and Arm Drag release/circle phases, Gift Wrap's
Mount-anchored setup, Butterfly's folded hook reach, and fast constrained limb
rotations. Run mixed Auto Rolls and exercise history selection, Previous, Next,
Replay, Return to Live, and reduced motion before marking Iteration 15 complete.
