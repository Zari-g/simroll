import type { AuthoredAnimationRecipe } from './types.ts'

export const authoredAnimationRecipes = [
  {
    transitionId: 'closed_guard_bottom_hip_bump_to_mount_top',
    recipeId: 'hip-bump-sweep-v2',
    familyId: 'sweep.rotation',
    params: { side: 'right', rotation: -38, hipDrive: 20, followDirection: 'forward' },
  },
  // Butterfly elevation remains explicit until another active transition
  // demonstrates the same two-hook lifting sequence.
  {
    transitionId: 'open_guard_bottom_butterfly_sweep_to_side_control_top',
    recipeId: 'butterfly-sweep-v1',
    durationMs: 1320,
    timing: {
      playerA: { hips: -0.08, torso: 0.01, arms: 0.07, head: 0.1 },
      playerB: { hips: 0.04, torso: 0.07, arms: 0.1, head: 0.12 },
    },
    phases: [
      { progress: 0.2, baseProgress: 0.05, playerA: { primitives: [
        { type: 'hipShift', forward: 4, lateral: 10 },
        { type: 'legHook', side: 'right', amount: 28, bend: 24 },
        { type: 'armPummel', side: 'left', direction: 'inside', amount: 20 },
      ] }, playerB: { primitives: [{ type: 'weightShift', forward: 7, lateral: -8 }] } },
      { progress: 0.48, baseProgress: 0.27, playerA: { primitives: [
        { type: 'hookElevation', side: 'right', amount: 34, extension: 22 },
        { type: 'sitUp', amount: 24, drive: 10 },
        { type: 'bodyRotation', amount: 30, torsoFollow: 0.35 },
      ] }, playerB: { primitives: [
        { type: 'lift', amount: 18, extension: 12 },
        { type: 'offBalance', direction: 'left', amount: 20, turn: -24 },
      ] } },
      { progress: 0.75, baseProgress: 0.65, playerA: { primitives: [
        { type: 'follow', direction: 'forward', distance: 13 },
        { type: 'dropWeight', amount: 8, lean: 7 },
      ] }, playerB: { primitives: [{ type: 'weightShift', forward: -8, lateral: -8 }] } },
    ],
  },
  {
    transitionId: 'mount_bottom_elbow_knee_escape_to_half_guard',
    recipeId: 'elbow-escape-v2',
    familyId: 'escape.hip',
    params: { side: 'right', bridgeLift: 16, escapeDistance: 24, followDirection: 'backward' },
  },
  {
    transitionId: 'side_control_top_step_over_to_mount',
    recipeId: 'side-control-step-over-v2',
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
  {
    transitionId: 'knee_on_belly_top_slide_to_mount',
    familyId: 'advance.stepOver',
    params: { stepSide: 'left', drive: 14, rotation: 28 },
  },
  {
    transitionId: 'half_guard_top_knee_slice_to_side_control_top',
    familyId: 'pass.pressure',
    params: { side: 'right', drive: 20, slideDistance: 27, pressure: 17 },
  },
  {
    transitionId: 'open_guard_top_knee_cut_to_side_control_top',
    familyId: 'pass.pressure',
    params: { side: 'left', drive: 23, slideDistance: 31, pressure: 14 },
  },
  {
    transitionId: 'half_guard_bottom_recover_closed_guard',
    familyId: 'guard.recovery',
    params: { side: 'right', escapeDistance: 11, insertAmount: 24 },
  },
  {
    transitionId: 'open_guard_bottom_recover_closed_guard',
    familyId: 'guard.recovery',
    params: { side: 'left', escapeDistance: 17, insertAmount: 32 },
  },
  {
    transitionId: 'front_headlock_top_go_behind_to_turtle_top',
    familyId: 'advance.spinBehind',
    params: { side: 'right', rotation: 48, distance: 19 },
  },
  {
    transitionId: 'turtle_top_spiral_ride_to_side_control',
    familyId: 'advance.spinBehind',
    params: { side: 'left', rotation: 58, distance: 22 },
  },
  {
    transitionId: 'closed_guard_bottom_arm_drag_to_back_control_top',
    familyId: 'backTake.rotation',
    params: { side: 'right', rotation: 52, travel: 17 },
  },
  {
    transitionId: 'mount_top_gift_wrap_to_back_control',
    familyId: 'backTake.rotation',
    params: { side: 'left', rotation: 66, travel: 20 },
  },
  {
    transitionId: 'turtle_top_seatbelt_back_take',
    familyId: 'backTake.rotation',
    params: { side: 'right', rotation: 44, travel: 14 },
  },
] as const satisfies readonly AuthoredAnimationRecipe[]
