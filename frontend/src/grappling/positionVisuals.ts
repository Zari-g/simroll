import type { GrapplingPositionVisualDefinition } from './types'
import { defaultGrapplerAnatomy } from './anatomy.ts'
import { createArticulatedSkeletonPose } from './coreKinematics.ts'
import {
  createUnplacedBasePair,
  resolveConstraintDrivenPosition,
  type ConstraintDrivenPosition,
} from './constraintDrivenPositions.ts'
import {
  compileControlsToContacts,
  type ActiveVisualControl,
} from './controlTargets.ts'
import type { GroundedAnchorSet } from './groundedAnchors.ts'
import { groundSkeletonPose } from './groundedAnchors.ts'
import { skeletonToGrapplerPose } from './kinematics.ts'
import { warnForInvalidSkeletonPose } from './poseValidation.ts'
import type {
  ArticulatedGrapplerPoseDefinition,
  GrapplerSkeletonPose,
} from './skeleton.ts'

function articulatedSkeleton(
  definition: ArticulatedGrapplerPoseDefinition,
  label: string,
  groundedAnchors?: GroundedAnchorSet,
): GrapplerSkeletonPose {
  const skeleton = createArticulatedSkeletonPose(
    definition,
    defaultGrapplerAnatomy,
  )
  const grounded = groundedAnchors
    ? groundSkeletonPose(skeleton, groundedAnchors)
    : skeleton
  warnForInvalidSkeletonPose(grounded, label)
  return grounded
}

const closedGuardBottomSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 330 },
  core: {
    pelvisRotation: 96,
    spineFlexion: -28,
    chestRotation: -12,
    neckRotation: 14,
  },
  limbs: {
    leftArm: {
      proximalRotation: 140,
      distalRotation: 100,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: -100,
      distalRotation: -90,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: 130,
      distalRotation: 105,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: -142,
      distalRotation: -105,
      proximalLength: 116,
      distalLength: 98,
    },
  },
}, 'Closed Guard Bottom')

const closedGuardTopSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 280 },
  core: {
    pelvisRotation: -84,
    spineFlexion: 18,
    chestRotation: -12,
    neckRotation: 8,
  },
  limbs: {
    leftArm: {
      proximalRotation: 168,
      distalRotation: 0,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: 165,
      distalRotation: 0,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: -152,
      distalRotation: -60,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: 140,
      distalRotation: 65,
      proximalLength: 116,
      distalLength: 98,
    },
  },
}, 'Closed Guard Top')

const mountBottomSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 333 },
  core: {
    pelvisRotation: -92,
    spineFlexion: -5,
    chestRotation: 12,
    neckRotation: -5,
  },
  limbs: {
    leftArm: {
      proximalRotation: -120,
      distalRotation: 170,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: 113,
      distalRotation: -172,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: -150,
      distalRotation: -20,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: 150,
      distalRotation: 24,
      proximalLength: 116,
      distalLength: 98,
    },
  },
}, 'Mount Bottom')

const mountTopSkeleton = articulatedSkeleton({
  rootPosition: { x: 515, y: 300 },
  core: {
    pelvisRotation: -86,
    spineFlexion: 12,
    chestRotation: -10,
    neckRotation: 8,
  },
  limbs: {
    leftArm: {
      proximalRotation: -136,
      distalRotation: -87,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: 127,
      distalRotation: 84,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: -125,
      distalRotation: -79,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: 115,
      distalRotation: 81,
      proximalLength: 116,
      distalLength: 98,
    },
  },
}, 'Mount Top')

const sideControlBottomSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 325 },
  core: {
    pelvisRotation: -100,
    spineFlexion: 18,
    chestRotation: -20,
    neckRotation: 12,
  },
  limbs: {
    leftArm: {
      proximalRotation: 135,
      distalRotation: 5,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: -115,
      distalRotation: -80,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: -145,
      distalRotation: -25,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: 120,
      distalRotation: 95,
      proximalLength: 116,
      distalLength: 98,
    },
  },
}, 'Side Control Bottom')

const sideControlTopSkeleton = articulatedSkeleton({
  rootPosition: { x: 575, y: 280 },
  core: {
    pelvisRotation: 160,
    spineFlexion: 22,
    chestRotation: 18,
    neckRotation: -8,
  },
  limbs: {
    leftArm: {
      proximalRotation: 40,
      distalRotation: 95,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: -55,
      distalRotation: -95,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: 175,
      distalRotation: 45,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: -135,
      distalRotation: 75,
      proximalLength: 116,
      distalLength: 98,
    },
  },
}, 'Side Control Top')

const openGuardBottomSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 340 },
  core: {
    pelvisRotation: 96,
    spineFlexion: -30,
    chestRotation: -10,
    neckRotation: 16,
  },
  limbs: {
    leftArm: {
      proximalRotation: 150,
      distalRotation: 55,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: -105,
      distalRotation: -55,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: 131,
      distalRotation: 117,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: 115,
      distalRotation: 119,
      proximalLength: 116,
      distalLength: 98,
    },
  },
}, 'Open Guard Bottom')

const openGuardTopSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 220 },
  core: {
    pelvisRotation: -88,
    spineFlexion: 12,
    chestRotation: -8,
    neckRotation: 6,
  },
  limbs: {
    leftArm: {
      proximalRotation: -158,
      distalRotation: -86,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: 158,
      distalRotation: 74,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: -160,
      distalRotation: -55,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: 165,
      distalRotation: 60,
      proximalLength: 116,
      distalLength: 98,
    },
  },
  // The passer's lead knee is the base that carries weight against the mat.
}, 'Open Guard Top', { leftKnee: { baselineY: 327 } })

const halfGuardBottomSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 330 },
  core: {
    pelvisRotation: 96,
    spineFlexion: -25,
    chestRotation: -10,
    neckRotation: 12,
  },
  limbs: {
    leftArm: {
      proximalRotation: 145,
      distalRotation: 95,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: -100,
      distalRotation: -85,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: 87.3,
      distalRotation: -112.5,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: -170.5,
      distalRotation: -90,
      proximalLength: 116,
      distalLength: 98,
    },
  },
}, 'Half Guard Bottom')

const halfGuardTopSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 278 },
  core: {
    pelvisRotation: -85,
    spineFlexion: 15,
    chestRotation: -10,
    neckRotation: 8,
  },
  limbs: {
    leftArm: {
      proximalRotation: 165,
      distalRotation: -10,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: 160,
      distalRotation: 15,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: -150,
      distalRotation: -55,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: 128,
      distalRotation: 28,
      proximalLength: 116,
      distalLength: 98,
    },
  },
  // The free leg's knee is the passer's grounded driving base.
}, 'Half Guard Top', { rightKnee: { baselineY: 359 } })

const backControlBottomSkeleton = articulatedSkeleton({
  rootPosition: { x: 460, y: 330 },
  core: {
    pelvisRotation: -95,
    spineFlexion: -5,
    chestRotation: 5,
    neckRotation: -8,
  },
  limbs: {
    leftArm: {
      proximalRotation: -120,
      distalRotation: 170,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: 113,
      distalRotation: -172,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: -145,
      distalRotation: -20,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: 150,
      distalRotation: 22,
      proximalLength: 116,
      distalLength: 98,
    },
  },
}, 'Back Control Bottom')

const backControlTopSkeleton = articulatedSkeleton({
  rootPosition: { x: 560, y: 300 },
  core: {
    pelvisRotation: -95,
    spineFlexion: -6,
    chestRotation: -14,
    neckRotation: -10,
  },
  limbs: {
    leftArm: {
      proximalRotation: -41,
      distalRotation: -86,
      proximalLength: 76,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: -76,
      distalRotation: 0,
      proximalLength: 76,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: -157.4,
      distalRotation: 114.3,
      proximalLength: 116,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: -163.9,
      distalRotation: 123.6,
      proximalLength: 116,
      distalLength: 98,
    },
  },
}, 'Back Control Top')

function relationship(
  control: ActiveVisualControl,
  priority: 'critical' | 'high' | 'medium' | 'low',
) {
  const compiled = compileControlsToContacts([control])[0]
  if (!compiled) throw new Error(`Unknown position relationship "${control.controlId}"`)
  return { ...compiled, priority }
}

function sameSideFootToThighRelationship(side: 'left' | 'right') {
  return {
    contact: {
      id: `position:back-control:${side}-foot-to-inner-thigh`,
      type: 'hook' as const,
      source: {
        grapplerId: 'playerA' as const,
        bodyPart: `${side}Foot` as const,
        anchor: 'center' as const,
      },
      target: {
        grapplerId: 'playerB' as const,
        bodyPart: `${side}Thigh` as const,
        anchor: 'midpoint' as const,
      },
    },
    strength: 1,
    relationalAnchor: 'foot-to-inner-thigh' as const,
    priority: 'high' as const,
  }
}

const authoredPositionPairs = {
  open_guard_bottom: {
    playerA: openGuardBottomSkeleton,
    playerB: openGuardTopSkeleton,
  },
  half_guard_bottom: {
    playerA: halfGuardBottomSkeleton,
    playerB: halfGuardTopSkeleton,
  },
  back_control_top: {
    playerA: backControlTopSkeleton,
    playerB: backControlBottomSkeleton,
  },
} as const

export const constraintDrivenPositionIds = [
  'open_guard_bottom',
  'half_guard_bottom',
  'back_control_top',
] as const

export const constraintDrivenPositions: Readonly<
  Record<(typeof constraintDrivenPositionIds)[number], ConstraintDrivenPosition>
> = {
  open_guard_bottom: {
    basePose: createUnplacedBasePair(authoredPositionPairs.open_guard_bottom),
    placement: {
      playerA: { x: 500, y: 340 },
      playerB: { x: 500, y: 220 },
    },
    grounding: { playerB: { leftKnee: { baselineY: 327 } } },
    relationships: [
      relationship({
        controlId: 'butterfly_hook', controller: 'playerA', opponent: 'playerB', side: 'left',
      }, 'high'),
      relationship({
        controlId: 'butterfly_hook', controller: 'playerA', opponent: 'playerB', side: 'right',
      }, 'high'),
    ],
  },
  half_guard_bottom: {
    basePose: createUnplacedBasePair(authoredPositionPairs.half_guard_bottom),
    placement: {
      playerA: { x: 500, y: 330 },
      playerB: { x: 500, y: 278 },
    },
    grounding: { playerB: { rightKnee: { baselineY: 359 } } },
    relationships: [
      relationship({
        controlId: 'wrist_control', controller: 'playerB', opponent: 'playerA', side: 'left',
      }, 'critical'),
    ],
  },
  back_control_top: {
    basePose: createUnplacedBasePair(authoredPositionPairs.back_control_top),
    placement: {
      playerA: { x: 560, y: 300 },
      playerB: { x: 460, y: 330 },
    },
    relationships: [
      sameSideFootToThighRelationship('left'),
      sameSideFootToThighRelationship('right'),
    ],
  },
}

const resolvedConstraintDrivenPairs = Object.fromEntries(
  constraintDrivenPositionIds.map((positionId) => [
    positionId,
    resolveConstraintDrivenPosition(constraintDrivenPositions[positionId]),
  ]),
) as Record<(typeof constraintDrivenPositionIds)[number], ReturnType<typeof resolveConstraintDrivenPosition>>

export const articulatedPositionSkeletons = {
  closed_guard_bottom: {
    playerA: closedGuardBottomSkeleton,
    playerB: closedGuardTopSkeleton,
  },
  mount_top: {
    playerA: mountTopSkeleton,
    playerB: mountBottomSkeleton,
  },
  side_control_top: {
    playerA: sideControlTopSkeleton,
    playerB: sideControlBottomSkeleton,
  },
  open_guard_bottom: {
    ...resolvedConstraintDrivenPairs.open_guard_bottom,
  },
  half_guard_bottom: {
    ...resolvedConstraintDrivenPairs.half_guard_bottom,
  },
  back_control_top: {
    ...resolvedConstraintDrivenPairs.back_control_top,
  },
} as const

const closedGuardBottomPose = skeletonToGrapplerPose(closedGuardBottomSkeleton)
const closedGuardTopPose = skeletonToGrapplerPose(closedGuardTopSkeleton)
const mountBottomPose = skeletonToGrapplerPose(mountBottomSkeleton)
const mountTopPose = skeletonToGrapplerPose(mountTopSkeleton)
const sideControlBottomPose = skeletonToGrapplerPose(sideControlBottomSkeleton)
const sideControlTopPose = skeletonToGrapplerPose(sideControlTopSkeleton)
const openGuardBottomPose = skeletonToGrapplerPose(articulatedPositionSkeletons.open_guard_bottom.playerA)
const openGuardTopPose = skeletonToGrapplerPose(articulatedPositionSkeletons.open_guard_bottom.playerB)
const halfGuardBottomPose = skeletonToGrapplerPose(articulatedPositionSkeletons.half_guard_bottom.playerA)
const halfGuardTopPose = skeletonToGrapplerPose(articulatedPositionSkeletons.half_guard_bottom.playerB)
const backControlBottomPose = skeletonToGrapplerPose(articulatedPositionSkeletons.back_control_top.playerB)
const backControlTopPose = skeletonToGrapplerPose(articulatedPositionSkeletons.back_control_top.playerA)

export const corePositionVisualIds = [
  'closed_guard_bottom',
  'mount_top',
  'side_control_top',
  'open_guard_bottom',
  'half_guard_bottom',
  'back_control_top',
] as const

export const reusedPositionVisualIds = ['mount_bottom', 'open_guard_top'] as const

const positionVisuals: Readonly<
  Record<string, GrapplingPositionVisualDefinition>
> = {
  // Existing graph orientations reuse authored anatomy with explicit fixed identities.
  mount_bottom: {
    positionId: 'mount_bottom', label: 'Mount Bottom',
    description: 'Player A defends underneath Player B in mount.',
    playerAPose: mountBottomPose, playerBPose: mountTopPose,
    playerARole: 'Defending', playerBRole: 'Mount', playerOrder: ['playerA', 'playerB'],
  },
  open_guard_top: {
    positionId: 'open_guard_top', label: 'Open Guard Top',
    description: 'Player A passes against Player B in open guard.',
    playerAPose: openGuardTopPose, playerBPose: openGuardBottomPose,
    playerARole: 'Passing', playerBRole: 'Guard', playerOrder: ['playerB', 'playerA'],
  },
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
          bodyPart: 'torso',
          anchor: 'midpoint',
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
          bodyPart: 'torso',
          anchor: 'midpoint',
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
  open_guard_bottom: {
    positionId: 'open_guard_bottom',
    label: 'Open Guard Bottom',
    description:
      'Open Guard visual showing Player A on their back framing both feet on Player B\'s hips to control distance.',
    playerAPose: openGuardBottomPose,
    playerBPose: openGuardTopPose,
    playerARole: 'Bottom',
    playerBRole: 'Top',
    playerOrder: ['playerB', 'playerA'],
    contacts: [
      {
        id: 'open-guard-left-foot-frame',
        type: 'hook',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'leftShin',
          anchor: 'end',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'torso',
          anchor: 'start',
        },
      },
      {
        id: 'open-guard-right-foot-frame',
        type: 'hook',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'rightShin',
          anchor: 'end',
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
          relativeTo: { grapplerId: 'playerA', bodyPart: 'leftShin' },
          placement: 'after',
        },
        {
          bodyPart: { grapplerId: 'playerB', bodyPart: 'rightForearm' },
          relativeTo: { grapplerId: 'playerA', bodyPart: 'rightShin' },
          placement: 'after',
        },
      ],
    },
  },
  half_guard_bottom: {
    positionId: 'half_guard_bottom',
    label: 'Half Guard Bottom',
    description:
      'Half Guard visual showing Player A trapping one of Player B\'s legs while framing a knee shield with the free leg.',
    playerAPose: halfGuardBottomPose,
    playerBPose: halfGuardTopPose,
    playerARole: 'Bottom',
    playerBRole: 'Top',
    playerOrder: ['playerB', 'playerA'],
    contacts: [
      {
        id: 'half-guard-leg-wrap',
        type: 'hook',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'leftShin',
          anchor: 'end',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'leftShin',
          anchor: 'midpoint',
        },
      },
      {
        id: 'half-guard-knee-shield',
        type: 'control',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'rightShin',
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
          bodyPart: { grapplerId: 'playerA', bodyPart: 'leftThigh' },
          relativeTo: { grapplerId: 'playerB', bodyPart: 'leftThigh' },
          placement: 'before',
        },
        {
          bodyPart: { grapplerId: 'playerA', bodyPart: 'rightShin' },
          relativeTo: { grapplerId: 'playerB', bodyPart: 'torso' },
          placement: 'after',
        },
      ],
    },
  },
  back_control_top: {
    positionId: 'back_control_top',
    label: 'Back Control Top',
    description:
      'Back Control visual showing Player A hooking both legs inside Player B\'s thighs with a seatbelt grip around the torso.',
    playerAPose: backControlTopPose,
    playerBPose: backControlBottomPose,
    playerARole: 'Back Control',
    playerBRole: 'Defending',
    playerOrder: ['playerB', 'playerA'],
    contacts: [
      {
        id: 'back-control-left-hook',
        type: 'hook',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'leftShin',
          anchor: 'end',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'leftThigh',
          anchor: 'midpoint',
        },
      },
      {
        id: 'back-control-right-hook',
        type: 'hook',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'rightShin',
          anchor: 'end',
        },
        target: {
          grapplerId: 'playerB',
          bodyPart: 'rightThigh',
          anchor: 'midpoint',
        },
      },
      {
        id: 'back-control-seatbelt',
        type: 'control',
        source: {
          grapplerId: 'playerA',
          bodyPart: 'leftForearm',
          anchor: 'end',
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
          bodyPart: { grapplerId: 'playerA', bodyPart: 'leftThigh' },
          relativeTo: { grapplerId: 'playerB', bodyPart: 'leftThigh' },
          placement: 'before',
        },
        {
          bodyPart: { grapplerId: 'playerA', bodyPart: 'rightThigh' },
          relativeTo: { grapplerId: 'playerB', bodyPart: 'rightThigh' },
          placement: 'before',
        },
      ],
    },
  },
}

export function getPositionVisual(positionId: string) {
  return positionVisuals[positionId] ?? null
}

export function getConstraintDrivenPosition(positionId: string) {
  return positionId in constraintDrivenPositions
    ? constraintDrivenPositions[positionId as keyof typeof constraintDrivenPositions]
    : null
}

export function getPositionSkeletons(positionId: string) {
  return positionId in articulatedPositionSkeletons
    ? articulatedPositionSkeletons[positionId as keyof typeof articulatedPositionSkeletons]
    : null
}
