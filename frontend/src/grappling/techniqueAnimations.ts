import type { TechniqueAnimationDefinition } from './techniqueAnimationTypes.ts'

/** Representative definitions registered with the generic technique runtime. */
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
  {
    transitionId: 'closed_guard_bottom_hip_bump_to_mount_top',
    metadata: { description: 'Post, sit above the shoulder line, bump the hips and follow to mount.', tags: ['sweep', 'closed-guard'] },
    phases: [
      {
        id: 'post-and-sit', duration: 2,
        playerA: { primitives: [{ type: 'postHand', side: 'left', shoulder: 16, intensity: 0.7 }, { type: 'sitUp', amount: 24, intensity: 0.8 }] },
        playerB: { primitives: [{ type: 'baseAdjust', lateral: 4, intensity: 0.6 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'right' }],
        grounding: [{ grapplerId: 'playerA', joint: 'leftWrist', baseline: 'transitionBlend' }],
      },
      {
        id: 'load-and-bump', duration: 3,
        playerA: { primitives: [{ type: 'hipDrive', distance: 14, lift: 6, intensity: 0.8 }, { type: 'pelvisRotation', amount: -20, intensity: 0.8 }] },
        playerB: { primitives: [{ type: 'offBalance', direction: 'right', amount: 12, turn: 10, intensity: 0.7 }] },
        relationalTargets: [{ id: 'trap-post', controller: 'playerA', opponent: 'playerB', controlId: 'wrist_control', side: 'right', contacts: [{ id: 'hand-to-wrist', type: 'grip', source: { participant: 'controller', landmark: 'hand', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'wrist', side: 'oppositeSide' }, relationalAnchor: 'hand-to-grip-target' }] }],
      },
      {
        id: 'follow-to-mount', duration: 2, targetPosition: 'mount_top', easing: 'easeInOutCubic',
        playerA: { primitives: [{ type: 'follow', direction: 'forward', distance: 6, intensity: 0.6 }, { type: 'dropWeight', amount: 5, intensity: 0.7 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'right' }],
        grounding: [{ grapplerId: 'playerA', joint: 'rightKnee', baseline: 'transitionBlend' }],
      },
    ],
  },
  {
    transitionId: 'mount_bottom_elbow_knee_escape_to_half_guard',
    metadata: { description: 'Frame the hip, shrimp away and insert a knee to recover half guard.', tags: ['escape', 'mount'] },
    phases: [
      {
        id: 'frame-hip', duration: 2,
        playerA: { primitives: [{ type: 'frame', side: 'right', amount: 16, intensity: 0.8 }, { type: 'bridge', lift: 5, intensity: 0.6 }] },
        playerB: { primitives: [{ type: 'baseAdjust', lateral: 5, intensity: 0.6 }] },
        controls: [{ controlId: 'frame', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'right' }],
        relationalTargets: [{ id: 'hip-frame', controller: 'playerA', opponent: 'playerB', controlId: 'frame', side: 'right', contacts: [{ id: 'forearm-to-hip', type: 'control', strength: 0.25, source: { participant: 'controller', landmark: 'forearm', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'hip', side: 'oppositeSide' } }] }],
        grounding: [{ grapplerId: 'playerA', joint: 'leftAnkle', baseline: 'transitionBlend' }],
      },
      {
        id: 'shrimp-and-insert', duration: 3,
        playerA: { primitives: [{ type: 'hipEscape', side: 'left', distance: 16, intensity: 0.8 }, { type: 'kneeInsert', side: 'right', amount: 22, intensity: 0.7 }, { type: 'torsoTurn', chest: 10, intensity: 0.6 }] },
        playerB: { primitives: [{ type: 'weightShift', forward: -4, intensity: 0.6 }] },
        controls: [{ controlId: 'frame', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'right' }],
      },
      {
        id: 'catch-half-guard', duration: 2, targetPosition: 'half_guard_bottom',
        playerA: { primitives: [{ type: 'legHook', side: 'left', amount: 14, intensity: 0.7 }] },
        controls: [{ controlId: 'frame', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'right' }, { controlId: 'underhook', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'left' }],
        grounding: [{ grapplerId: 'playerA', joint: 'pelvis', baseline: 'transitionBlend' }],
      },
    ],
  },
  {
    transitionId: 'open_guard_top_knee_cut_to_side_control_top',
    metadata: { description: 'Post and win the underhook, drive the knee across and settle chest pressure.', tags: ['pass', 'knee-cut', 'pressure'] },
    phases: [
      {
        id: 'post-and-underhook', duration: 2,
        playerA: { primitives: [{ type: 'postHand', side: 'left', shoulder: 14, intensity: 0.6 }, { type: 'armPummel', side: 'right', direction: 'inside', amount: 18, intensity: 0.7 }] },
        playerB: { primitives: [{ type: 'frame', side: 'left', amount: 10, intensity: 0.6 }] },
        controls: [{ controlId: 'underhook', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.1, side: 'right' }],
        grounding: [{ grapplerId: 'playerA', joint: 'leftAnkle', baseline: 'transitionBlend' }],
      },
      {
        id: 'drive-knee', duration: 2,
        playerA: { primitives: [{ type: 'kneeDrive', side: 'right', hip: -18, knee: 14, intensity: 0.8 }, { type: 'weightShift', forward: 8, torso: 6, intensity: 0.7 }] },
        relationalTargets: [{ id: 'knee-across-hip', controller: 'playerA', opponent: 'playerB', side: 'right', contacts: [{ id: 'knee-to-hip', type: 'pressure', strength: 0.25, source: { participant: 'controller', landmark: 'knee', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'hip', side: 'oppositeSide' }, relationalAnchor: 'knee-to-hip-line' }] }],
      },
      {
        id: 'slide-clear', duration: 3,
        playerA: { primitives: [{ type: 'kneeSlide', side: 'right', distance: 14, angle: 12, intensity: 0.8 }, { type: 'hipSwitch', side: 'left', amount: 12, intensity: 0.6 }] },
        playerB: { primitives: [{ type: 'legUnhook', side: 'left', amount: 12, intensity: 0.6 }] },
        controls: [{ controlId: 'underhook', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'right' }],
      },
      {
        id: 'settle-pressure', duration: 2, targetPosition: 'side_control_top',
        playerA: { primitives: [{ type: 'dropWeight', amount: 6, intensity: 0.7 }] },
        controls: [{ controlId: 'crossface', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'left' }],
        grounding: [{ grapplerId: 'playerA', joint: 'leftKnee', baseline: 'transitionBlend' }],
      },
    ],
  },
  {
    transitionId: 'open_guard_top_toreando_to_side_control_top',
    metadata: { description: 'Redirect the ankles, circle outside the legs and close into side control.', tags: ['pass', 'open-guard', 'circling'] },
    phases: [
      {
        id: 'connect-to-legs', duration: 2,
        playerA: { primitives: [{ type: 'torsoLean', amount: 12, intensity: 0.6 }, { type: 'reach', side: 'right', path: 'straight', amount: 18, intensity: 0.7 }] },
        playerB: { primitives: [{ type: 'kneeInsert', side: 'left', amount: 10, intensity: 0.5 }] },
        controls: [{ controlId: 'ankle_control', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'right' }],
        relationalTargets: [{ id: 'steer-ankle', controller: 'playerA', opponent: 'playerB', controlId: 'ankle_control', side: 'right', contacts: [{ id: 'hand-to-ankle', type: 'grip', source: { participant: 'controller', landmark: 'hand', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'ankle', side: 'oppositeSide' }, relationalAnchor: 'hand-to-grip-target' }] }],
        grounding: [{ grapplerId: 'playerA', joint: 'leftAnkle', baseline: 'transitionBlend' }],
      },
      {
        id: 'redirect-and-circle', duration: 3,
        playerA: { primitives: [{ type: 'step', side: 'left', path: 'around', amount: 24, intensity: 0.8 }, { type: 'hipShift', lateral: 12, intensity: 0.7 }, { type: 'torsoTurn', chest: -14, intensity: 0.6 }] },
        playerB: { primitives: [{ type: 'pelvisRotation', amount: 16, intensity: 0.7 }, { type: 'kneeRetract', side: 'left', amount: 12, intensity: 0.6 }] },
        controls: [{ controlId: 'ankle_control', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'right' }],
      },
      {
        id: 'close-distance', duration: 2, targetPosition: 'side_control_top',
        playerA: { primitives: [{ type: 'follow', direction: 'forward', distance: 8, intensity: 0.6 }, { type: 'dropWeight', amount: 6, intensity: 0.7 }] },
        controls: [{ controlId: 'ankle_control', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'right' }, { controlId: 'crossface', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'left' }],
        grounding: [{ grapplerId: 'playerA', joint: 'rightKnee', baseline: 'transitionBlend' }],
      },
    ],
  },
  {
    transitionId: 'side_control_top_step_over_to_mount',
    metadata: { description: 'Stabilize the torso, step over the hip and widen the mounted base.', tags: ['top-transition', 'mount'] },
    phases: [
      {
        id: 'secure-upper-body', duration: 2,
        playerA: { primitives: [{ type: 'dropWeight', amount: 5, intensity: 0.7 }, { type: 'reach', side: 'right', path: 'under', amount: 12, intensity: 0.6 }] },
        controls: [{ controlId: 'underhook', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'right' }],
        relationalTargets: [{ id: 'chest-attachment', controller: 'playerA', opponent: 'playerB', controlId: 'underhook', contacts: [{ id: 'chest-to-torso', type: 'pressure', strength: 0.25, source: { participant: 'controller', landmark: 'chest' }, target: { participant: 'opponent', landmark: 'torso' } }] }],
        grounding: [{ grapplerId: 'playerA', joint: 'leftKnee', baseline: 'transitionBlend' }],
      },
      {
        id: 'step-over-hip', duration: 3,
        playerA: { primitives: [{ type: 'weightShift', lateral: -6, intensity: 0.7 }, { type: 'step', side: 'right', path: 'over', amount: 24, bend: 16, intensity: 0.8 }] },
        playerB: { primitives: [{ type: 'frame', side: 'left', amount: 10, intensity: 0.5 }] },
        controls: [{ controlId: 'underhook', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'right' }],
      },
      {
        id: 'establish-mount', duration: 2, targetPosition: 'mount_top',
        playerA: { primitives: [{ type: 'baseAdjust', lateral: 4, intensity: 0.6 }, { type: 'dropWeight', amount: 4, intensity: 0.7 }] },
        controls: [{ controlId: 'underhook', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'right' }],
        grounding: [{ grapplerId: 'playerA', joint: 'rightKnee', baseline: 'transitionBlend' }],
      },
    ],
  },
  {
    transitionId: 'closed_guard_bottom_arm_drag_to_back_control_top',
    metadata: { description: 'Control the wrist, drag across the center and circle behind into a seatbelt.', tags: ['back-take', 'rotation', 'closed-guard'] },
    phases: [
      {
        id: 'connect-wrist', duration: 2,
        playerA: { primitives: [{ type: 'reach', side: 'right', path: 'across', amount: 16, intensity: 0.7 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'right' }, { controlId: 'sleeve_grip', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'left', modes: ['gi'] }],
        relationalTargets: [{ id: 'sleeve-connection', controller: 'playerA', opponent: 'playerB', controlId: 'sleeve_grip', side: 'left', contacts: [{ id: 'hand-to-sleeve', type: 'grip', source: { participant: 'controller', landmark: 'hand', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'forearm', side: 'oppositeSide' }, relationalAnchor: 'hand-to-grip-target' }] }],
        grounding: [{ grapplerId: 'playerA', joint: 'pelvis', baseline: 'transitionBlend' }],
      },
      {
        id: 'drag-and-circle', duration: 3,
        playerA: { primitives: [{ type: 'armDrag', side: 'right', amount: 22, turn: 12, intensity: 0.8 }, { type: 'hipShift', lateral: -10, intensity: 0.7 }, { type: 'bodyRotation', amount: -24, intensity: 0.8 }] },
        playerB: { primitives: [{ type: 'offBalance', direction: 'forward', amount: 8, intensity: 0.6 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'right' }, { controlId: 'sleeve_grip', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'left', modes: ['gi'] }],
      },
      {
        id: 'attach-behind', duration: 2, targetPosition: 'back_control_top',
        playerA: { primitives: [{ type: 'legHook', side: 'left', amount: 16, intensity: 0.7 }, { type: 'reach', side: 'left', path: 'over', amount: 12, intensity: 0.6 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'right' }, { controlId: 'sleeve_grip', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'left', modes: ['gi'] }, { controlId: 'seatbelt', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'left' }],
        grounding: [{ grapplerId: 'playerA', joint: 'pelvis', baseline: 'transitionBlend' }],
      },
    ],
  },
  {
    transitionId: 'half_guard_bottom_recover_closed_guard',
    metadata: { description: 'Frame for hip space, free the trapped knee and reconnect both legs around the waist.', tags: ['guard-recovery', 'half-guard'] },
    phases: [
      {
        id: 'frame-for-space', duration: 2,
        playerA: { primitives: [{ type: 'frame', side: 'right', amount: 14, intensity: 0.7 }, { type: 'hipEscape', side: 'left', distance: 10, intensity: 0.7 }] },
        playerB: { primitives: [{ type: 'weightShift', forward: -4, intensity: 0.5 }] },
        controls: [{ controlId: 'frame', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'right' }],
        relationalTargets: [{ id: 'guard-frame', controller: 'playerA', opponent: 'playerB', controlId: 'frame', side: 'right', contacts: [{ id: 'forearm-to-chest', type: 'control', strength: 0.25, source: { participant: 'controller', landmark: 'forearm', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'chest' } }] }],
        grounding: [{ grapplerId: 'playerA', joint: 'pelvis', baseline: 'transitionBlend' }],
      },
      {
        id: 'free-and-insert-knee', duration: 3,
        playerA: { primitives: [{ type: 'legUnhook', side: 'left', amount: 12, intensity: 0.6 }, { type: 'kneeInsert', side: 'right', amount: 20, intensity: 0.8 }, { type: 'pelvisRotation', amount: 12, intensity: 0.7 }] },
        controls: [{ controlId: 'frame', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'right' }],
      },
      {
        id: 'close-around-waist', duration: 2, targetPosition: 'closed_guard_bottom',
        playerA: { primitives: [{ type: 'legHook', side: 'left', amount: 14, intensity: 0.7 }, { type: 'legHook', side: 'right', amount: 14, intensity: 0.7 }] },
        controls: [{ controlId: 'frame', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'right' }, { controlId: 'closed_guard_connection', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25 }],
        grounding: [{ grapplerId: 'playerB', joint: 'rightKnee', baseline: 'transitionBlend' }],
      },
    ],
  },
  {
    transitionId: 'mount_top_gift_wrap_to_back_control',
    metadata: { description: 'Pin the wrist across the torso, turn the shoulder line and follow behind with hooks.', tags: ['top-transition', 'back-take', 'rotation'] },
    phases: [
      {
        id: 'wrap-wrist', duration: 2,
        playerA: { primitives: [{ type: 'reach', side: 'right', path: 'across', amount: 18, intensity: 0.7 }, { type: 'dropWeight', amount: 4, intensity: 0.6 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'right' }],
        relationalTargets: [{ id: 'gift-wrap', controller: 'playerA', opponent: 'playerB', controlId: 'wrist_control', side: 'right', contacts: [{ id: 'hand-to-wrist', type: 'grip', source: { participant: 'controller', landmark: 'hand', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'wrist', side: 'oppositeSide' }, relationalAnchor: 'hand-to-grip-target' }] }],
        grounding: [{ grapplerId: 'playerA', joint: 'leftKnee', baseline: 'transitionBlend' }],
      },
      {
        id: 'turn-and-follow', duration: 3,
        playerA: { primitives: [{ type: 'hipSwitch', side: 'left', amount: 20, intensity: 0.8 }, { type: 'follow', direction: 'forward', distance: 8, intensity: 0.6 }] },
        playerB: { primitives: [{ type: 'bodyRotation', amount: 26, torsoFollow: 0.8, intensity: 0.8 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', action: 'preserve', side: 'right' }],
      },
      {
        id: 'seatbelt-and-hooks', duration: 2, targetPosition: 'back_control_top',
        playerA: { primitives: [{ type: 'legHook', side: 'left', amount: 14, intensity: 0.7 }, { type: 'legHook', side: 'right', amount: 14, intensity: 0.7 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', action: 'release', side: 'right' }, { controlId: 'seatbelt', controller: 'playerA', opponent: 'playerB', action: 'acquire', strength: 0.25, side: 'left' }],
        grounding: [{ grapplerId: 'playerA', joint: 'pelvis', baseline: 'transitionBlend' }],
      },
    ],
  },
  {
    transitionId: 'closed_guard_bottom_opponent_stand_open_to_open_guard_bottom',
    metadata: { description: 'Player B controls a wrist, rises in base and opens the legs while Player A recovers open guard.', tags: ['guard-opening', 'standing-action', 'playerB-primary'] },
    phases: [
      {
        id: 'control-and-post', duration: 2,
        playerB: { primitives: [{ type: 'reach', side: 'right', path: 'straight', amount: 12, intensity: 0.7 }, { type: 'postHand', side: 'left', shoulder: 12, intensity: 0.6 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerB', opponent: 'playerA', action: 'acquire', strength: 0.25, side: 'right' }],
        relationalTargets: [{ id: 'opening-wrist', controller: 'playerB', opponent: 'playerA', controlId: 'wrist_control', side: 'right', contacts: [{ id: 'hand-to-wrist', type: 'grip', source: { participant: 'controller', landmark: 'hand', side: 'controlSide' }, target: { participant: 'opponent', landmark: 'wrist', side: 'oppositeSide' }, relationalAnchor: 'hand-to-grip-target' }] }],
        grounding: [{ grapplerId: 'playerB', joint: 'leftAnkle', baseline: 'transitionBlend' }],
      },
      {
        id: 'rise-and-open', duration: 3,
        playerB: { primitives: [{ type: 'lift', amount: 14, intensity: 0.8 }, { type: 'kneeDrive', side: 'right', hip: -12, knee: -20, intensity: 0.7 }, { type: 'baseAdjust', forward: -6, intensity: 0.6 }] },
        playerA: { primitives: [{ type: 'legUnhook', side: 'left', amount: 16, intensity: 0.7 }, { type: 'legUnhook', side: 'right', amount: 16, intensity: 0.7 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerB', opponent: 'playerA', action: 'preserve', side: 'right' }, { controlId: 'closed_guard_connection', controller: 'playerA', opponent: 'playerB', action: 'release' }],
      },
      {
        id: 'establish-open-distance', duration: 2, targetPosition: 'open_guard_bottom',
        playerB: { primitives: [{ type: 'postRetract', side: 'left', amount: 10, intensity: 0.6 }, { type: 'baseAdjust', forward: -4, intensity: 0.6 }] },
        playerA: { primitives: [{ type: 'kneeInsert', side: 'left', amount: 12, intensity: 0.6 }] },
        controls: [{ controlId: 'wrist_control', controller: 'playerB', opponent: 'playerA', action: 'release', side: 'right' }],
        grounding: [{ grapplerId: 'playerB', joint: 'rightAnkle', baseline: 'transitionBlend' }],
      },
    ],
  },
] as const satisfies readonly TechniqueAnimationDefinition[]
