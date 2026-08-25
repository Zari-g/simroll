import type { AuthoredAnimationRecipe } from './types.ts'

export const authoredAnimationRecipes = [
  {
    transitionId: 'hip_bump_sweep',
    recipeId: 'hip-bump-sweep-v2',
    familyId: 'sweep.rotation',
    params: { side: 'right', rotation: -38, hipDrive: 20, followDirection: 'forward' },
  },
  // Flower sweep stays explicit: its leg-elevation sequence is not a clean fit
  // for the MVP families and demonstrates the choreography escape hatch.
  {
    transitionId: 'flower_sweep',
    recipeId: 'flower-sweep-v1',
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
    recipeId: 'elbow-escape-v2',
    familyId: 'escape.hip',
    params: { side: 'right', bridgeLift: 16, escapeDistance: 24, followDirection: 'backward' },
  },
  {
    transitionId: 'mount_to_side_control',
    recipeId: 'mount-to-side-control-v2',
    familyId: 'advance.stepOver',
    params: { stepSide: 'right', drive: 18, rotation: -35 },
  },
  // This semantic graph transition shares the hip-escape structure with
  // mirrored, smaller movement while retaining its own transition identity.
  {
    transitionId: 'side_control_bottom_elbow_escape_to_closed_guard',
    recipeId: 'side-control-elbow-escape-v1',
    familyId: 'escape.hip',
    params: { side: 'left', bridgeLift: 12, escapeDistance: 19, followDirection: 'backward' },
  },
] as const satisfies readonly AuthoredAnimationRecipe[]
