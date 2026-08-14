import type { GrapplerAnatomy } from './anatomy.ts'
import type {
  ArticulatedGrapplerPoseDefinition,
  GrapplerSkeletonPose,
  LimbArticulation,
  LocalJointTransform,
} from './skeleton.ts'

function terminalTransform(
  length: number,
  rotation: number,
): LocalJointTransform {
  return { x: length, y: 0, rotation }
}

function appendLimb(
  limb: LimbArticulation,
): readonly [LocalJointTransform, LocalJointTransform] {
  return [
    terminalTransform(limb.proximalLength, limb.distalRotation),
    terminalTransform(limb.distalLength, 0),
  ]
}

/**
 * Builds the authoritative local skeleton for an anatomy-backed articulated
 * pose. Shoulder and hip anchors cannot drift because their offsets are
 * derived here from the chest and pelvis spans.
 */
export function createArticulatedSkeletonPose(
  definition: ArticulatedGrapplerPoseDefinition,
  anatomy: GrapplerAnatomy,
): GrapplerSkeletonPose {
  const { core, limbs, rootPosition } = definition
  const [leftElbow, leftWrist] = appendLimb(limbs.leftArm)
  const [rightElbow, rightWrist] = appendLimb(limbs.rightArm)
  const [leftKnee, leftAnkle] = appendLimb(limbs.leftLeg)
  const [rightKnee, rightAnkle] = appendLimb(limbs.rightLeg)

  return {
    root: {
      position: { ...rootPosition },
      rotation: core.pelvisRotation,
    },
    joints: {
      spine: {
        x: anatomy.core.pelvisToSpineLength,
        y: 0,
        rotation: core.spineFlexion,
      },
      chest: {
        x: anatomy.core.spineToChestLength,
        y: 0,
        rotation: core.chestRotation,
      },
      neck: {
        x: anatomy.core.neckLength,
        y: 0,
        rotation: core.neckRotation ?? 0,
      },
      head: {
        x: anatomy.core.headOffset,
        y: 0,
        rotation: core.headRotation ?? 0,
      },
      leftShoulder: {
        x: 0,
        y: -anatomy.core.shoulderSpan / 2,
        rotation: limbs.leftArm.proximalRotation,
      },
      leftElbow,
      leftWrist,
      rightShoulder: {
        x: 0,
        y: anatomy.core.shoulderSpan / 2,
        rotation: limbs.rightArm.proximalRotation,
      },
      rightElbow,
      rightWrist,
      leftHip: {
        x: 0,
        y: -anatomy.core.hipSpan / 2,
        rotation: limbs.leftLeg.proximalRotation,
      },
      leftKnee,
      leftAnkle,
      rightHip: {
        x: 0,
        y: anatomy.core.hipSpan / 2,
        rotation: limbs.rightLeg.proximalRotation,
      },
      rightKnee,
      rightAnkle,
    },
  }
}
