import type { TechniqueFamily } from './types.ts'

const ref = (
  $param: string,
  options: { scale?: number; offset?: number; opposite?: boolean } = {},
) => ({ $param, ...options }) as const

export const techniqueFamilies = [
  {
    id: 'sweep.rotation',
    durationMs: 1180,
    parameters: {
      side: { kind: 'side', required: true },
      rotation: { kind: 'number', required: true, min: -60, max: 60 },
      hipDrive: { kind: 'number', default: 20, min: 0, max: 40 },
      followDirection: { kind: 'direction', default: 'forward' },
    },
    timing: {
      playerA: { hips: -0.05, torso: -0.02, arms: 0.07, head: 0.1 },
      playerB: { hips: 0.03, torso: 0.06, arms: 0.1, head: 0.12 },
    },
    phases: [
      { progress: 0.24, baseProgress: 0.06, playerA: { primitives: [
        { type: 'sitUp', amount: 30, drive: 16 },
        { type: 'postHand', side: ref('side'), shoulder: -42, elbow: 25 },
        { type: 'hipShift', forward: 9, lateral: -7 },
      ] }, playerB: { primitives: [
        { type: 'weightShift', forward: -8, lateral: 5, torso: 8 },
        { type: 'postHand', side: ref('side', { opposite: true }), shoulder: 25, elbow: -15 },
      ] } },
      { progress: 0.52, baseProgress: 0.3, playerA: { primitives: [
        { type: 'pelvisRotation', amount: ref('rotation') },
        { type: 'torsoTurn', spine: ref('rotation', { scale: 0.3157894737 }), chest: ref('rotation', { scale: 0.6315789474 }) },
        { type: 'kneeDrive', side: ref('side', { opposite: true }), hip: -28, knee: 34 },
        { type: 'weightShift', forward: ref('hipDrive'), lateral: -16 },
      ] }, playerB: { primitives: [
        { type: 'pelvisRotation', amount: ref('rotation', { scale: -0.8947368421 }) },
        { type: 'torsoTurn', spine: ref('rotation', { scale: -0.2631578947 }), chest: ref('rotation', { scale: -0.5789473684 }) },
        { type: 'weightShift', forward: -12, lateral: 18 },
      ] } },
      { progress: 0.76, baseProgress: 0.66, playerA: { primitives: [
        { type: 'pelvisRotation', amount: ref('rotation', { scale: 0.6315789474 }) },
        { type: 'follow', direction: ref('followDirection'), distance: 12 },
        { type: 'weightShift', lateral: -8, torso: -8 },
      ], override: { joints: { rightElbow: { rotation: -72 } } } }, playerB: { primitives: [
        { type: 'pelvisRotation', amount: ref('rotation', { scale: -0.6578947368 }) },
        { type: 'weightShift', forward: -8, lateral: 10 },
      ] } },
    ],
    controls: [
      { controlId: 'closed_guard_connection', action: 'release', controller: 'playerA', opponent: 'playerB', activeUntil: 0.68 },
      { controlId: 'underhook', action: 'acquire', controller: 'playerA', opponent: 'playerB', side: ref('side'), activeFrom: 0.62 },
    ],
  },
  {
    id: 'escape.hip',
    durationMs: 1450,
    parameters: {
      side: { kind: 'side', required: true },
      bridgeLift: { kind: 'number', default: 16, min: 0, max: 30 },
      escapeDistance: { kind: 'number', required: true, min: 0, max: 40 },
      followDirection: { kind: 'direction', default: 'backward' },
    },
    timing: {
      playerA: { hips: 0.04, torso: 0.01, arms: 0.07, head: 0.1 },
      playerB: { hips: -0.07, torso: -0.02, arms: 0.06, head: 0.09 },
    },
    phases: [
      { progress: 0.2, baseProgress: 0.04, playerA: { primitives: [{ type: 'weightShift', forward: 8, lateral: -5, torso: 8 }] }, playerB: { primitives: [
        { type: 'bridge', lift: ref('bridgeLift'), extension: 15 },
        { type: 'postHand', side: ref('side', { opposite: true }), shoulder: 22, elbow: -18 },
      ] } },
      { progress: 0.45, baseProgress: 0.22, playerA: { primitives: [{ type: 'weightShift', forward: -6, lateral: 15, torso: -10 }] }, playerB: { primitives: [
        { type: 'hipEscape', side: ref('side'), distance: ref('escapeDistance'), turn: 18 },
        { type: 'kneeDrive', side: ref('side', { opposite: true }), hip: 42, knee: -34 },
      ] } },
      { progress: 0.7, baseProgress: 0.58, playerA: { primitives: [{ type: 'weightShift', forward: -8, lateral: 10 }] }, playerB: { primitives: [
        { type: 'legPummel', side: ref('side', { opposite: true }), hip: -44, knee: 38 },
        { type: 'follow', direction: ref('followDirection'), distance: 8 },
        { type: 'hipShift', lateral: 10 },
      ] } },
      { progress: 0.86, baseProgress: 0.8, playerB: { primitives: [{ type: 'kneeDrive', side: ref('side'), hip: -18, knee: 16 }] } },
    ],
    controls: [
      { controlId: 'crossface', action: 'release', controller: 'playerA', opponent: 'playerB', side: ref('side', { opposite: true }), activeUntil: 0.55 },
      { controlId: 'frame', action: 'acquire', controller: 'playerB', opponent: 'playerA', side: ref('side'), activeFrom: 0.2 },
    ],
  },
  {
    id: 'advance.stepOver',
    durationMs: 1080,
    parameters: {
      stepSide: { kind: 'side', required: true },
      drive: { kind: 'number', default: 18, min: 0, max: 35 },
      rotation: { kind: 'number', default: -35, min: -60, max: 60 },
    },
    timing: {
      playerA: { hips: -0.05, torso: 0.01, arms: 0.08, head: 0.1 },
      playerB: { hips: 0.04, torso: 0.07, arms: 0.1, head: 0.12 },
    },
    phases: [
      { progress: 0.25, baseProgress: 0.08, playerA: { primitives: [
        { type: 'postHand', side: ref('stepSide', { opposite: true }), shoulder: 30, elbow: -22 },
        { type: 'weightShift', forward: 10, lateral: -14, torso: 14 },
      ] }, playerB: { primitives: [{ type: 'torsoTurn', spine: -8, chest: -16 }] } },
      { progress: 0.52, baseProgress: 0.35, playerA: { primitives: [
        { type: 'pelvisRotation', amount: ref('rotation') },
        { type: 'kneeDrive', side: ref('stepSide'), hip: 42, knee: -35 },
        { type: 'weightShift', forward: ref('drive'), lateral: -22 },
      ] }, playerB: { primitives: [{ type: 'weightShift', forward: -6, lateral: 8 }] } },
      { progress: 0.76, baseProgress: 0.68, playerA: { primitives: [
        { type: 'legPummel', side: ref('stepSide', { opposite: true }), hip: -30, knee: 28 },
        { type: 'weightShift', forward: 8, lateral: -10, torso: -10 },
      ] }, playerB: { primitives: [{ type: 'torsoTurn', chest: 10 }] } },
    ],
    controls: [
      { controlId: 'crossface', action: 'acquire', controller: 'playerA', opponent: 'playerB', side: ref('stepSide', { opposite: true }), activeFrom: 0.6 },
    ],
  },
  {
    id: 'pass.pressure',
    durationMs: 1160,
    parameters: {
      side: { kind: 'side', required: true },
      drive: { kind: 'number', default: 18, min: 6, max: 36 },
      slideDistance: { kind: 'number', required: true, min: 8, max: 36 },
      pressure: { kind: 'number', default: 14, min: 4, max: 28 },
    },
    timing: {
      playerA: { hips: -0.06, torso: -0.02, arms: 0.06, head: 0.09 },
      playerB: { hips: 0.04, torso: 0.07, arms: 0.1, head: 0.12 },
    },
    phases: [
      { progress: 0.22, baseProgress: 0.06, playerA: { primitives: [
        { type: 'baseAdjust', forward: 7, lateral: -8 },
        { type: 'frame', side: ref('side', { opposite: true }), amount: 24, angle: 18 },
      ] }, playerB: { primitives: [{ type: 'frame', side: ref('side'), amount: 18 }] } },
      { progress: 0.5, baseProgress: 0.3, playerA: { primitives: [
        { type: 'kneeSlide', side: ref('side'), distance: ref('slideDistance'), angle: -18 },
        { type: 'hipDrive', distance: ref('drive'), lift: 4, extension: 10 },
        { type: 'dropWeight', amount: ref('pressure'), lean: 12 },
      ] }, playerB: { primitives: [
        { type: 'hipEscape', side: ref('side', { opposite: true }), distance: 8, turn: 8 },
        { type: 'torsoTurn', chest: -12 },
      ] } },
      { progress: 0.76, baseProgress: 0.67, playerA: { primitives: [
        { type: 'kneeRetract', side: ref('side', { opposite: true }), amount: 20 },
        { type: 'follow', direction: 'forward', distance: 11 },
        { type: 'dropWeight', amount: ref('pressure', { scale: 0.7 }), lean: 7 },
      ] }, playerB: { primitives: [{ type: 'weightShift', forward: -5, lateral: 7 }] } },
    ],
  },
  {
    id: 'guard.recovery',
    durationMs: 1040,
    parameters: {
      side: { kind: 'side', required: true },
      escapeDistance: { kind: 'number', default: 14, min: 4, max: 28 },
      insertAmount: { kind: 'number', required: true, min: 12, max: 42 },
    },
    timing: {
      playerA: { hips: -0.04, torso: 0.01, arms: 0.05, head: 0.08 },
      playerB: { hips: 0.05, torso: 0.07, arms: 0.09, head: 0.11 },
    },
    phases: [
      { progress: 0.24, baseProgress: 0.07, playerA: { primitives: [
        { type: 'frame', side: ref('side'), amount: 24, angle: 15 },
        { type: 'hipEscape', side: ref('side'), distance: ref('escapeDistance'), turn: 12 },
      ] }, playerB: { primitives: [{ type: 'baseAdjust', forward: -5, lateral: 6 }] } },
      { progress: 0.52, baseProgress: 0.31, playerA: { primitives: [
        { type: 'kneeInsert', side: ref('side'), amount: ref('insertAmount'), bend: 24 },
        { type: 'legPummel', side: ref('side', { opposite: true }), hip: -28, knee: 30 },
        { type: 'pull', direction: 'backward', distance: 8 },
      ] }, playerB: { primitives: [{ type: 'weightShift', forward: -7, lateral: 5 }] } },
      { progress: 0.78, baseProgress: 0.7, playerA: { primitives: [
        { type: 'legHook', side: ref('side'), amount: 24, bend: 30 },
        { type: 'legHook', side: ref('side', { opposite: true }), amount: 22, bend: 28 },
        { type: 'baseAdjust', forward: -4 },
      ] } },
    ],
  },
  {
    id: 'advance.spinBehind',
    durationMs: 1120,
    parameters: {
      side: { kind: 'side', required: true },
      rotation: { kind: 'number', required: true, min: 20, max: 80 },
      distance: { kind: 'number', default: 18, min: 8, max: 34 },
    },
    timing: {
      playerA: { hips: -0.07, torso: -0.03, arms: 0.03, head: 0.06 },
      playerB: { hips: 0.04, torso: 0.08, arms: 0.1, head: 0.12 },
    },
    phases: [
      { progress: 0.22, baseProgress: 0.06, playerA: { primitives: [
        { type: 'armDrag', side: ref('side'), amount: 24, turn: 10 },
        { type: 'baseAdjust', forward: 5, lateral: -7 },
      ] }, playerB: { primitives: [{ type: 'postHand', side: ref('side', { opposite: true }), shoulder: 22, elbow: -16 }] } },
      { progress: 0.5, baseProgress: 0.29, playerA: { primitives: [
        { type: 'bodyRotation', amount: ref('rotation'), torsoFollow: 0.35 },
        { type: 'step', side: ref('side'), path: 'around', amount: ref('distance'), bend: 18 },
        { type: 'drag', direction: 'backward', distance: 9, turn: 12 },
      ] }, playerB: { primitives: [{ type: 'offBalance', direction: 'forward', amount: 10, turn: -8 }] } },
      { progress: 0.76, baseProgress: 0.66, playerA: { primitives: [
        { type: 'follow', direction: 'forward', distance: ref('distance', { scale: 0.65 }) },
        { type: 'dropWeight', amount: 10, lean: 7 },
      ] }, playerB: { primitives: [{ type: 'baseAdjust', forward: -5 }] } },
    ],
  },
  {
    id: 'backTake.rotation',
    durationMs: 1260,
    parameters: {
      side: { kind: 'side', required: true },
      rotation: { kind: 'number', required: true, min: 25, max: 85 },
      travel: { kind: 'number', default: 18, min: 8, max: 34 },
    },
    timing: {
      playerA: { hips: -0.06, torso: -0.02, arms: 0.02, head: 0.07 },
      playerB: { hips: 0.03, torso: 0.07, arms: 0.1, head: 0.12 },
    },
    phases: [
      { progress: 0.2, baseProgress: 0.05, playerA: { primitives: [
        { type: 'armDrag', side: ref('side'), amount: 30, turn: 14 },
        { type: 'pull', direction: 'backward', distance: 8, side: ref('side') },
      ] }, playerB: { primitives: [{ type: 'offBalance', direction: 'forward', amount: 9, turn: 9 }] } },
      { progress: 0.48, baseProgress: 0.27, playerA: { primitives: [
        { type: 'bodyRotation', amount: ref('rotation'), torsoFollow: 0.4 },
        { type: 'step', side: ref('side'), path: 'around', amount: ref('travel'), bend: 22 },
        { type: 'hipSwitch', side: ref('side'), amount: 24, drive: 8 },
      ] }, playerB: { primitives: [{ type: 'bodyRotation', amount: ref('rotation', { scale: 0.35 }), torsoFollow: 0.25 }] } },
      { progress: 0.75, baseProgress: 0.64, playerA: { primitives: [
        { type: 'follow', direction: 'forward', distance: ref('travel', { scale: 0.7 }) },
        { type: 'legHook', side: ref('side'), amount: 24, bend: 28 },
        { type: 'reach', side: ref('side', { opposite: true }), path: 'across', amount: 24, bend: 15 },
      ] }, playerB: { primitives: [{ type: 'baseAdjust', forward: -6 }] } },
    ],
    controls: [
      { controlId: 'seatbelt', action: 'acquire', controller: 'playerA', opponent: 'playerB', activeFrom: 0.62 },
    ],
  },
] as const satisfies readonly TechniqueFamily[]
