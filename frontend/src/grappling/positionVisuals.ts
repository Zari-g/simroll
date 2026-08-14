import type {
  GrapplerPose,
  GrapplingPositionVisualDefinition,
} from './types'
import { createPoseVariant } from './positionPoseHelpers.ts'

const closedGuardBottomPose: GrapplerPose = {
  head: { x: 500, y: 430 },
  segments: {
    torso: { x: 500, y: 400, rotation: -90, length: 105 },
    leftUpperArm: { x: 482, y: 310, rotation: -155, length: 76 },
    leftForearm: { x: 413, y: 278, rotation: 18, length: 70 },
    rightUpperArm: { x: 518, y: 310, rotation: -25, length: 76 },
    rightForearm: { x: 587, y: 278, rotation: 162, length: 70 },
    leftThigh: { x: 484, y: 395, rotation: -132, length: 122 },
    leftShin: { x: 402, y: 304, rotation: -22, length: 105 },
    rightThigh: { x: 516, y: 395, rotation: -48, length: 122 },
    rightShin: { x: 598, y: 304, rotation: -158, length: 105 },
  },
}

const closedGuardTopPose: GrapplerPose = {
  head: { x: 500, y: 125 },
  segments: {
    torso: { x: 500, y: 265, rotation: -90, length: 102 },
    leftUpperArm: { x: 480, y: 180, rotation: 148, length: 72 },
    leftForearm: { x: 419, y: 218, rotation: 28, length: 68 },
    rightUpperArm: { x: 520, y: 180, rotation: 32, length: 72 },
    rightForearm: { x: 581, y: 218, rotation: 152, length: 68 },
    leftThigh: { x: 484, y: 265, rotation: 118, length: 110 },
    leftShin: { x: 431, y: 362, rotation: 77, length: 90 },
    rightThigh: { x: 516, y: 265, rotation: 62, length: 110 },
    rightShin: { x: 569, y: 362, rotation: 103, length: 90 },
  },
}

const mountBottomPose: GrapplerPose = {
  head: { x: 500, y: 155 },
  segments: {
    torso: { x: 500, y: 345, rotation: -90, length: 140 },
    leftUpperArm: { x: 478, y: 225, rotation: 160, length: 105 },
    leftForearm: { x: 379, y: 261, rotation: 105, length: 88 },
    rightUpperArm: { x: 522, y: 225, rotation: 20, length: 105 },
    rightForearm: { x: 621, y: 261, rotation: 75, length: 88 },
    leftThigh: { x: 484, y: 342, rotation: 118, length: 115 },
    leftShin: { x: 430, y: 444, rotation: 82, length: 100 },
    rightThigh: { x: 516, y: 342, rotation: 62, length: 115 },
    rightShin: { x: 570, y: 444, rotation: 98, length: 100 },
  },
}

const mountTopPose: GrapplerPose = {
  head: { x: 500, y: 190 },
  segments: {
    torso: { x: 500, y: 345, rotation: -90, length: 112 },
    leftUpperArm: { x: 480, y: 250, rotation: -158, length: 72 },
    leftForearm: { x: 413, y: 223, rotation: 72, length: 75 },
    rightUpperArm: { x: 520, y: 250, rotation: -22, length: 72 },
    rightForearm: { x: 587, y: 223, rotation: 108, length: 75 },
    leftThigh: { x: 482, y: 340, rotation: 143, length: 112 },
    leftShin: { x: 393, y: 407, rotation: 72, length: 102 },
    rightThigh: { x: 518, y: 340, rotation: 37, length: 112 },
    rightShin: { x: 607, y: 407, rotation: 108, length: 102 },
  },
}

const sideControlBottomPose = createPoseVariant(mountBottomPose, {
  head: { x: 500, y: 175 },
  segments: {
    torso: { x: 500, y: 350, rotation: -90, length: 130 },
    leftUpperArm: { x: 480, y: 235, rotation: -165, length: 100 },
    leftForearm: { x: 384, y: 209, rotation: -135, length: 78 },
    rightUpperArm: { x: 520, y: 235, rotation: 15, length: 100 },
    rightForearm: { x: 616, y: 261, rotation: 45, length: 78 },
  },
})

const sideControlTopPose: GrapplerPose = {
  head: { x: 410, y: 310 },
  segments: {
    torso: { x: 575, y: 310, rotation: 180, length: 125 },
    leftUpperArm: { x: 468, y: 292, rotation: -132, length: 80 },
    leftForearm: { x: 414, y: 233, rotation: -40, length: 70 },
    rightUpperArm: { x: 468, y: 328, rotation: 132, length: 80 },
    rightForearm: { x: 414, y: 387, rotation: 35, length: 70 },
    leftThigh: { x: 568, y: 292, rotation: -35, length: 112 },
    leftShin: { x: 660, y: 228, rotation: 18, length: 98 },
    rightThigh: { x: 568, y: 328, rotation: 42, length: 112 },
    rightShin: { x: 651, y: 403, rotation: 82, length: 98 },
  },
}

export const corePositionVisualIds = [
  'closed_guard_bottom',
  'mount_top',
  'side_control_top',
] as const

const positionVisuals: Readonly<
  Record<string, GrapplingPositionVisualDefinition>
> = {
  closed_guard_bottom: {
    positionId: 'closed_guard_bottom',
    label: 'Closed Guard Bottom',
    description:
      'Closed Guard visual showing Player A reclined with their legs wrapped around Player B.',
    playerAPose: closedGuardBottomPose,
    playerBPose: closedGuardTopPose,
    playerARole: 'Bottom',
    playerBRole: 'Top',
    playerOrder: ['playerB', 'playerA'],
    contacts: [
      {
        id: 'closed-guard-left-hook',
        type: 'hook',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'leftShin',
          anchor: 'end',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'leftThigh',
          anchor: 'start',
        },
      },
      {
        id: 'closed-guard-right-hook',
        type: 'hook',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'rightShin',
          anchor: 'end',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'rightThigh',
          anchor: 'start',
        },
      },
    ],
    occlusion: {
      overrides: [
        {
          bodyPart: { grapplerId: 'playerA', bodyPart: 'leftThigh' },
          relativeTo: { grapplerId: 'playerB', bodyPart: 'torso' },
          placement: 'before',
        },
        {
          bodyPart: { grapplerId: 'playerA', bodyPart: 'rightThigh' },
          relativeTo: { grapplerId: 'playerB', bodyPart: 'torso' },
          placement: 'before',
        },
      ],
    },
  },
  mount_top: {
    positionId: 'mount_top',
    label: 'Mount Top',
    description:
      'Mount visual showing Player A straddling Player B from above the torso.',
    playerAPose: mountTopPose,
    playerBPose: mountBottomPose,
    playerARole: 'Top',
    playerBRole: 'Bottom',
    playerOrder: ['playerB', 'playerA'],
    contacts: [
      {
        id: 'mount-torso-pressure',
        type: 'pressure',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'torso',
          anchor: 'midpoint',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'torso',
          anchor: 'midpoint',
        },
      },
      {
        id: 'mount-left-knee-control',
        type: 'control',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'leftThigh',
          anchor: 'start',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'torso',
          anchor: 'start',
        },
      },
      {
        id: 'mount-right-knee-control',
        type: 'control',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'rightThigh',
          anchor: 'start',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'torso',
          anchor: 'start',
        },
      },
    ],
    occlusion: {
      overrides: [
        {
          bodyPart: { grapplerId: 'playerB', bodyPart: 'leftForearm' },
          relativeTo: { grapplerId: 'playerA', bodyPart: 'torso' },
          placement: 'before',
        },
        {
          bodyPart: { grapplerId: 'playerB', bodyPart: 'rightForearm' },
          relativeTo: { grapplerId: 'playerA', bodyPart: 'torso' },
          placement: 'before',
        },
      ],
    },
  },
  side_control_top: {
    positionId: 'side_control_top',
    label: 'Side Control Top',
    description:
      'Side Control visual showing Player A perpendicular across the supine Player B.',
    playerAPose: sideControlTopPose,
    playerBPose: sideControlBottomPose,
    playerARole: 'Top',
    playerBRole: 'Bottom',
    playerOrder: ['playerB', 'playerA'],
    contacts: [
      {
        id: 'side-control-torso-pressure',
        type: 'pressure',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'torso',
          anchor: 'midpoint',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'torso',
          anchor: 'midpoint',
        },
      },
      {
        id: 'side-control-shoulder-control',
        type: 'control',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'leftUpperArm',
          anchor: 'start',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'torso',
          anchor: 'midpoint',
        },
      },
    ],
    occlusion: {
      overrides: [
        {
          bodyPart: { grapplerId: 'playerA', bodyPart: 'leftUpperArm' },
          relativeTo: { grapplerId: 'playerB', bodyPart: 'torso' },
          placement: 'before',
        },
      ],
    },
  },
}

export function getPositionVisual(positionId: string) {
  return positionVisuals[positionId] ?? null
}
