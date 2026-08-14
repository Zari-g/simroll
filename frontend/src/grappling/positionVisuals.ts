import type {
  GrapplerPose,
  GrapplingPositionVisualDefinition,
} from './types'

const closedGuardBottomPose: GrapplerPose = {
  head: { x: 500, y: 430, radius: 32 },
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
  head: { x: 500, y: 125, radius: 30 },
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
  head: { x: 500, y: 155, radius: 32 },
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
  head: { x: 500, y: 190, radius: 30 },
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
  },
}

export function getPositionVisual(positionId: string) {
  return positionVisuals[positionId] ?? null
}
