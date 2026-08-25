import type { AnimationRecipe } from './types.ts'

export const authoredAnimationRecipes = [
  {
    transitionId: 'hip_bump_sweep',
    recipeId: 'hip-bump-sweep-v1',
    family: 'sweep',
    durationMs: 1180,
    timing: {
      playerA: { hips: -0.05, torso: -0.02, arms: 0.07, head: 0.1 },
      playerB: { hips: 0.03, torso: 0.06, arms: 0.1, head: 0.12 },
    },
    phases: [
      { progress: 0.24, baseProgress: 0.06, playerA: { primitives: [
        { type: 'sitUp', amount: 30, drive: 16 },
        { type: 'postHand', side: 'right', shoulder: -42, elbow: 25 },
        { type: 'hipShift', forward: 9, lateral: -7 },
      ] }, playerB: { primitives: [
        { type: 'weightShift', forward: -8, lateral: 5, torso: 8 },
        { type: 'postHand', side: 'left', shoulder: 25, elbow: -15 },
      ] } },
      { progress: 0.52, baseProgress: 0.3, playerA: { primitives: [
        { type: 'pelvisRotation', amount: -38 },
        { type: 'torsoTurn', spine: -12, chest: -24 },
        { type: 'kneeDrive', side: 'left', hip: -28, knee: 34 },
        { type: 'weightShift', forward: 20, lateral: -16 },
      ] }, playerB: { primitives: [
        { type: 'pelvisRotation', amount: 34 },
        { type: 'torsoTurn', spine: 10, chest: 22 },
        { type: 'weightShift', forward: -12, lateral: 18 },
      ] } },
      { progress: 0.76, baseProgress: 0.66, playerA: { primitives: [
        { type: 'pelvisRotation', amount: -24 },
        { type: 'weightShift', forward: 12, lateral: -8, torso: -8 },
      ], override: { joints: { rightElbow: { rotation: -72 } } } }, playerB: { primitives: [
        { type: 'pelvisRotation', amount: 25 },
        { type: 'weightShift', forward: -8, lateral: 10 },
      ] } },
    ],
  },
  {
    transitionId: 'flower_sweep',
    recipeId: 'flower-sweep-v1',
    family: 'sweep',
    durationMs: 1320,
    timing: {
      playerA: { hips: -0.08, torso: 0.01, arms: 0.07, head: 0.1 },
      playerB: { hips: 0.04, torso: 0.07, arms: 0.1, head: 0.12 },
    },
    phases: [
      { progress: 0.2, baseProgress: 0.05, playerA: { primitives: [
        { type: 'hipShift', forward: 4, lateral: 12 },
        { type: 'kneeDrive', side: 'right', hip: 38, knee: -28 },
        { type: 'legPummel', side: 'left', hip: -28, knee: 22 },
      ] }, playerB: { primitives: [{ type: 'weightShift', forward: 7, lateral: -8 }] } },
      { progress: 0.48, baseProgress: 0.27, playerA: { primitives: [
        { type: 'legPummel', side: 'right', hip: 58, knee: -44 },
        { type: 'torsoTurn', spine: 12, chest: 24 },
        { type: 'pelvisRotation', amount: 32 },
      ] }, playerB: { primitives: [
        { type: 'weightShift', forward: -14, lateral: -20 },
        { type: 'pelvisRotation', amount: -30 },
      ] } },
      { progress: 0.75, baseProgress: 0.65, playerA: { primitives: [{ type: 'weightShift', forward: 13, torso: -10 }] }, playerB: { primitives: [{ type: 'weightShift', forward: -8, lateral: -8 }] } },
    ],
  },
  {
    transitionId: 'elbow_escape',
    recipeId: 'elbow-escape-v1',
    family: 'escape',
    durationMs: 1450,
    timing: {
      playerA: { hips: 0.04, torso: 0.01, arms: 0.07, head: 0.1 },
      playerB: { hips: -0.07, torso: -0.02, arms: 0.06, head: 0.09 },
    },
    phases: [
      { progress: 0.2, baseProgress: 0.04, playerA: { primitives: [{ type: 'weightShift', forward: 8, lateral: -5, torso: 8 }] }, playerB: { primitives: [
        { type: 'bridge', lift: 16, extension: 15 },
        { type: 'postHand', side: 'left', shoulder: 22, elbow: -18 },
      ] } },
      { progress: 0.45, baseProgress: 0.22, playerA: { primitives: [{ type: 'weightShift', forward: -6, lateral: 15, torso: -10 }] }, playerB: { primitives: [
        { type: 'hipEscape', side: 'right', distance: 24, turn: 18 },
        { type: 'kneeDrive', side: 'left', hip: 42, knee: -34 },
      ] } },
      { progress: 0.7, baseProgress: 0.58, playerA: { primitives: [{ type: 'weightShift', forward: -8, lateral: 10 }] }, playerB: { primitives: [
        { type: 'legPummel', side: 'left', hip: -44, knee: 38 },
        { type: 'hipShift', forward: -8, lateral: 10 },
      ] } },
      { progress: 0.86, baseProgress: 0.8, playerB: { primitives: [{ type: 'kneeDrive', side: 'right', hip: -18, knee: 16 }] } },
    ],
  },
  {
    transitionId: 'mount_to_side_control',
    recipeId: 'mount-to-side-control-v1',
    family: 'pass',
    durationMs: 1080,
    timing: {
      playerA: { hips: -0.05, torso: 0.01, arms: 0.08, head: 0.1 },
      playerB: { hips: 0.04, torso: 0.07, arms: 0.1, head: 0.12 },
    },
    phases: [
      { progress: 0.25, baseProgress: 0.08, playerA: { primitives: [
        { type: 'postHand', side: 'left', shoulder: 30, elbow: -22 },
        { type: 'weightShift', forward: 10, lateral: -14, torso: 14 },
      ] }, playerB: { primitives: [{ type: 'torsoTurn', spine: -8, chest: -16 }] } },
      { progress: 0.52, baseProgress: 0.35, playerA: { primitives: [
        { type: 'pelvisRotation', amount: -35 },
        { type: 'kneeDrive', side: 'right', hip: 42, knee: -35 },
        { type: 'weightShift', forward: 18, lateral: -22 },
      ] }, playerB: { primitives: [{ type: 'weightShift', forward: -6, lateral: 8 }] } },
      { progress: 0.76, baseProgress: 0.68, playerA: { primitives: [
        { type: 'legPummel', side: 'left', hip: -30, knee: 28 },
        { type: 'weightShift', forward: 8, lateral: -10, torso: -10 },
      ] }, playerB: { primitives: [{ type: 'torsoTurn', chest: 10 }] } },
    ],
  },
] as const satisfies readonly AnimationRecipe[]
