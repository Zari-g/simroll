import type { GrapplingPositionVisualDefinition } from './types'
import { defaultGrapplerAnatomy } from './anatomy.ts'
import { createArticulatedSkeletonPose } from './coreKinematics.ts'
import { skeletonToGrapplerPose } from './kinematics.ts'
import type {
  ArticulatedGrapplerPoseDefinition,
  GrapplerSkeletonPose,
} from './skeleton.ts'

function articulatedSkeleton(
  definition: ArticulatedGrapplerPoseDefinition,
): GrapplerSkeletonPose {
  return createArticulatedSkeletonPose(definition, defaultGrapplerAnatomy)
}

const closedGuardBottomSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 300 },
  core: {
    pelvisRotation: 96,
    spineFlexion: -18,
    chestRotation: -8,
    neckRotation: 6,
  },
  limbs: {
    leftArm: {
      proximalRotation: 135,
      distalRotation: 173,
      proximalLength: 76,
      distalLength: 70,
    },
    rightArm: {
      proximalRotation: -95,
      distalRotation: -173,
      proximalLength: 76,
      distalLength: 70,
    },
    leftLeg: {
      proximalRotation: 132,
      distalRotation: 110,
      proximalLength: 122,
      distalLength: 105,
    },
    rightLeg: {
      proximalRotation: -144,
      distalRotation: -110,
      proximalLength: 122,
      distalLength: 105,
    },
  },
})

const closedGuardTopSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 265 },
  core: { pelvisRotation: -88, spineFlexion: -4, chestRotation: -2 },
  limbs: {
    leftArm: {
      proximalRotation: -118,
      distalRotation: -120,
      proximalLength: 72,
      distalLength: 68,
    },
    rightArm: {
      proximalRotation: 126,
      distalRotation: 120,
      proximalLength: 72,
      distalLength: 68,
    },
    leftLeg: {
      proximalRotation: -154,
      distalRotation: -41,
      proximalLength: 110,
      distalLength: 90,
    },
    rightLeg: {
      proximalRotation: 150,
      distalRotation: 41,
      proximalLength: 110,
      distalLength: 90,
    },
  },
})

const mountBottomSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 338 },
  core: {
    pelvisRotation: -94,
    spineFlexion: 12,
    chestRotation: -6,
    neckRotation: -4,
  },
  limbs: {
    leftArm: {
      proximalRotation: -112,
      distalRotation: -55,
      proximalLength: 105,
      distalLength: 88,
    },
    rightArm: {
      proximalRotation: 68,
      distalRotation: 55,
      proximalLength: 105,
      distalLength: 88,
    },
    leftLeg: {
      proximalRotation: -148,
      distalRotation: -42,
      proximalLength: 115,
      distalLength: 90,
    },
    rightLeg: {
      proximalRotation: 156,
      distalRotation: 36,
      proximalLength: 115,
      distalLength: 90,
    },
  },
})

const mountTopSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 345 },
  core: {
    pelvisRotation: -88,
    spineFlexion: -7,
    chestRotation: 3,
    neckRotation: 3,
  },
  limbs: {
    leftArm: {
      proximalRotation: -66,
      distalRotation: -130,
      proximalLength: 72,
      distalLength: 75,
    },
    rightArm: {
      proximalRotation: 70,
      distalRotation: 130,
      proximalLength: 72,
      distalLength: 75,
    },
    leftLeg: {
      proximalRotation: -129,
      distalRotation: -71,
      proximalLength: 112,
      distalLength: 102,
    },
    rightLeg: {
      proximalRotation: 125,
      distalRotation: 71,
      proximalLength: 112,
      distalLength: 102,
    },
  },
})

const sideControlBottomSkeleton = articulatedSkeleton({
  rootPosition: { x: 500, y: 342 },
  core: {
    pelvisRotation: -92,
    spineFlexion: 10,
    chestRotation: -14,
    neckRotation: 8,
  },
  limbs: {
    leftArm: {
      proximalRotation: -69,
      distalRotation: 30,
      proximalLength: 100,
      distalLength: 78,
    },
    rightArm: {
      proximalRotation: 111,
      distalRotation: 30,
      proximalLength: 100,
      distalLength: 78,
    },
    leftLeg: {
      proximalRotation: -150,
      distalRotation: -44,
      proximalLength: 115,
      distalLength: 90,
    },
    rightLeg: {
      proximalRotation: 154,
      distalRotation: 36,
      proximalLength: 115,
      distalLength: 90,
    },
  },
})

const sideControlTopSkeleton = articulatedSkeleton({
  rootPosition: { x: 575, y: 310 },
  core: {
    pelvisRotation: 160,
    spineFlexion: 15,
    chestRotation: 10,
    neckRotation: -5,
  },
  limbs: {
    leftArm: {
      proximalRotation: 43,
      distalRotation: 92,
      proximalLength: 80,
      distalLength: 70,
    },
    rightArm: {
      proximalRotation: -53,
      distalRotation: -97,
      proximalLength: 80,
      distalLength: 70,
    },
    leftLeg: {
      proximalRotation: 165,
      distalRotation: 53,
      proximalLength: 112,
      distalLength: 98,
    },
    rightLeg: {
      proximalRotation: -118,
      distalRotation: 40,
      proximalLength: 112,
      distalLength: 98,
    },
  },
})

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
