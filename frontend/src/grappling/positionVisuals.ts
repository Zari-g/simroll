import type { GrapplingPositionVisualDefinition } from './types'
import { defaultGrapplerAnatomy } from './anatomy.ts'
import { createArticulatedSkeletonPose } from './coreKinematics.ts'
import { skeletonToGrapplerPose } from './kinematics.ts'
import { warnForInvalidSkeletonPose } from './poseValidation.ts'
import type {
  ArticulatedGrapplerPoseDefinition,
  GrapplerSkeletonPose,
} from './skeleton.ts'

function articulatedSkeleton(
  definition: ArticulatedGrapplerPoseDefinition,
  label: string,
): GrapplerSkeletonPose {
  const skeleton = createArticulatedSkeletonPose(
    definition,
    defaultGrapplerAnatomy,
  )
  warnForInvalidSkeletonPose(skeleton, label)
  return skeleton
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
} as const

const closedGuardBottomPose = skeletonToGrapplerPose(closedGuardBottomSkeleton)
const closedGuardTopPose = skeletonToGrapplerPose(closedGuardTopSkeleton)
const mountBottomPose = skeletonToGrapplerPose(mountBottomSkeleton)
const mountTopPose = skeletonToGrapplerPose(mountTopSkeleton)
const sideControlBottomPose = skeletonToGrapplerPose(sideControlBottomSkeleton)
const sideControlTopPose = skeletonToGrapplerPose(sideControlTopSkeleton)

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
}

export function getPositionVisual(positionId: string) {
  return positionVisuals[positionId] ?? null
}
