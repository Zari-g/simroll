import type { TechniqueAnimationDefinition } from './techniqueAnimationTypes.ts'

/** Representative authoring data only. Intentionally absent from the runtime registry. */
export const techniqueAnimations = [
  {
    transitionId: 'open_guard_bottom_butterfly_sweep_to_side_control_top',
    metadata: { description: 'Connect, elevate the hook, then settle on top.', tags: ['sweep', 'butterfly'] },
    phases: [
      {
        id: 'connect', duration: 2,
        playerA: { primitives: [{ type: 'sitUp', amount: 12 }, { type: 'legHook', side: 'left', amount: 18 }] },
        playerB: { primitives: [{ type: 'baseAdjust', forward: 4 }] },
        controls: [
          { controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'right' },
          { controlId: 'butterfly_hook', controller: 'playerA', opponent: 'playerB', action: 'acquire', side: 'left' },
          { controlId: 'sleeve_grip', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'right', modes: ['gi'] },
        ],
        grounding: [{ grapplerId: 'playerB', joint: 'rightKnee', baseline: 'phaseStart' }],
      },
      {
        id: 'elevate', duration: 3,
        playerA: { primitives: [{ type: 'hookElevation', side: 'left', amount: 24 }, { type: 'bodyRotation', amount: -20 }] },
        playerB: { primitives: [{ type: 'offBalance', direction: 'right', amount: 16 }] },
        relationalTargets: [{
          id: 'elevating-hook', controller: 'playerA', opponent: 'playerB', side: 'left', controlId: 'butterfly_hook',
          contacts: [{ id: 'foot-to-thigh', type: 'hook', source: { participant: 'controller', landmark: 'foot', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'thigh', side: 'oppositeSide' }, relationalAnchor: 'foot-to-inner-thigh' }],
        }],
        grounding: [{ grapplerId: 'playerA', joint: 'pelvis', baseline: 'transitionBlend' }],
      },
      {
        id: 'settle', duration: 2, easing: 'easeInOutCubic', targetPosition: 'side_control_top',
        playerA: { primitives: [{ type: 'dropWeight', amount: 8 }] },
        playerB: { primitives: [{ type: 'follow', direction: 'backward', distance: 6 }] },
        controls: [{ controlId: 'butterfly_hook', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'left' }],
        grounding: [{ grapplerId: 'playerA', joint: 'leftKnee', baseline: 'transitionBlend' }],
      },
    ],
  },
  {
    transitionId: 'half_guard_bottom_old_school_sweep_to_side_control_top',
    metadata: { description: 'Secure the ankle, rotate through, then release and settle.', tags: ['sweep', 'half-guard'] },
    phases: [
      {
        id: 'secure-ankle', duration: 1,
        playerA: { primitives: [{ type: 'reach', side: 'right', path: 'under', amount: 16 }] },
        controls: [
          { controlId: 'underhook', controller: 'playerA', opponent: 'playerB', action: 'preserve' },
          { controlId: 'ankle_control', controller: 'playerA', opponent: 'playerB', action: 'acquire', side: 'right' },
        ],
        relationalTargets: [{
          id: 'ankle-connection', controller: 'playerA', opponent: 'playerB', side: 'right', controlId: 'ankle_control',
          contacts: [{ id: 'hand-to-ankle', type: 'grip', source: { participant: 'controller', landmark: 'hand', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'ankle', side: 'oppositeSide' }, relationalAnchor: 'hand-to-grip-target' }],
        }],
        grounding: [{ grapplerId: 'playerB', joint: 'leftAnkle', baseline: 'phaseStart' }],
      },
      {
        id: 'rotate', duration: 2,
        playerA: { primitives: [{ type: 'hipDrive', distance: 24 }, { type: 'bodyRotation', amount: -30 }] },
        playerB: { primitives: [{ type: 'offBalance', direction: 'forward', amount: 12, turn: 8 }] },
        controls: [{ controlId: 'ankle_control', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'right' }],
      },
      {
        id: 'settle', duration: 1, targetPosition: 'side_control_top',
        playerA: { primitives: [{ type: 'dropWeight', amount: 8 }] },
        controls: [{ controlId: 'ankle_control', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'right' }],
        grounding: [{ grapplerId: 'playerA', joint: 'rightKnee', baseline: 'transitionBlend' }],
      },
    ],
  },
  {
    transitionId: 'back_control_top_opponent_turn_in_to_half_guard_bottom',
    metadata: { description: 'Player B turns into Player A and recovers top half guard.', tags: ['escape', 'back-control'] },
    phases: [
      {
        id: 'turn-in', duration: 2,
        playerA: { primitives: [{ type: 'follow', direction: 'forward', distance: 5 }] },
        playerB: { primitives: [{ type: 'bodyRotation', amount: 16, torsoFollow: 0.75 }] },
        controls: [{ controlId: 'seatbelt', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'left' }],
        grounding: [
          { grapplerId: 'playerA', joint: 'pelvis', baseline: 'transitionBlend' },
          { grapplerId: 'playerB', joint: 'pelvis', baseline: 'transitionBlend' },
        ],
      },
      {
        id: 'clear-seatbelt', duration: 2,
        playerB: { primitives: [{ type: 'hipEscape', side: 'left', distance: 18 }, { type: 'frame', side: 'right', amount: 14 }] },
        controls: [
          { controlId: 'seatbelt', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'left' },
          { controlId: 'frame', controller: 'playerB', opponent: 'playerA', action: 'acquire', side: 'right' },
        ],
        relationalTargets: [{
          id: 'escape-frame', controller: 'playerB', opponent: 'playerA', side: 'right', controlId: 'frame',
          contacts: [{ id: 'forearm-to-chest', type: 'control', source: { participant: 'controller', landmark: 'forearm', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'chest' } }],
        }],
      },
      {
        id: 'recover', duration: 1, targetPosition: 'half_guard_bottom',
        playerA: { primitives: [{ type: 'legHook', side: 'left', amount: 12 }] },
        playerB: { primitives: [{ type: 'kneeInsert', side: 'right', amount: 20 }] },
        grounding: [{ grapplerId: 'playerB', joint: 'rightKnee', baseline: 'transitionBlend' }],
      },
    ],
  },
] as const satisfies readonly TechniqueAnimationDefinition[]
