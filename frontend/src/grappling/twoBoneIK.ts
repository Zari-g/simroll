import { normalizeAngleDegrees } from './jointConstraints.ts'
import { resolveSkeletonPose } from './kinematics.ts'
import { constrainSkeletonPose, validateSkeletonPose } from './poseValidation.ts'
import {
  grapplerJointParents,
  type GrapplerChildJointName,
  type GrapplerSkeletonPose,
  type JointPosition,
} from './skeleton.ts'

export type TwoBoneIKBendDirection = 'positive' | 'negative'
export type TwoBoneIKChainName = 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'

export interface TwoBoneIKChain {
  readonly root: GrapplerChildJointName
  readonly mid: GrapplerChildJointName
  readonly end: GrapplerChildJointName
  readonly bendDirection: TwoBoneIKBendDirection
}

export const twoBoneIKChains = {
  leftArm: {
    root: 'leftShoulder', mid: 'leftElbow', end: 'leftWrist', bendDirection: 'positive',
  },
  rightArm: {
    root: 'rightShoulder', mid: 'rightElbow', end: 'rightWrist', bendDirection: 'negative',
  },
  leftLeg: {
    root: 'leftHip', mid: 'leftKnee', end: 'leftAnkle', bendDirection: 'positive',
  },
  rightLeg: {
    root: 'rightHip', mid: 'rightKnee', end: 'rightAnkle', bendDirection: 'negative',
  },
} as const satisfies Readonly<Record<TwoBoneIKChainName, TwoBoneIKChain>>

export type TwoBoneIKReach = 'reachable' | 'too-far' | 'too-close'
export type TwoBoneIKFailureReason =
  | 'invalid-target'
  | 'invalid-skeleton'
  | 'invalid-chain'
  | 'degenerate-chain'
  | 'coincident-root-target'

export type TwoBoneIKResult =
  | {
      readonly ok: true
      readonly skeleton: GrapplerSkeletonPose
      readonly reach: TwoBoneIKReach
      /** True when the shared joint profile changed either analytic angle. */
      readonly constrained: boolean
    }
  | {
      readonly ok: false
      readonly skeleton: GrapplerSkeletonPose
      readonly reason: TwoBoneIKFailureReason
    }

export interface SolveTwoBoneIKOptions {
  readonly skeleton: GrapplerSkeletonPose
  readonly chain: TwoBoneIKChain
  readonly target: JointPosition
  readonly bendDirection?: TwoBoneIKBendDirection
}

const EPSILON = 1e-9

function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

function finitePoint(point: JointPosition): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

function failure(
  skeleton: GrapplerSkeletonPose,
  reason: TwoBoneIKFailureReason,
): TwoBoneIKResult {
  return { ok: false, skeleton, reason }
}

function isValidChain(chain: TwoBoneIKChain): boolean {
  return (
    grapplerJointParents[chain.mid] === chain.root &&
    grapplerJointParents[chain.end] === chain.mid &&
    grapplerJointParents[chain.root] !== null &&
    chain.root !== chain.mid &&
    chain.mid !== chain.end
  )
}

/**
 * Solve one planar two-segment chain in O(1). Only local rotations at the
 * chain root and middle joint are authored; offsets, bone lengths, the root
 * transform, and every unrelated joint remain unchanged.
 */
export function solveTwoBoneIK({
  skeleton,
  chain,
  target,
  bendDirection = chain.bendDirection,
}: SolveTwoBoneIKOptions): TwoBoneIKResult {
  if (!finitePoint(target)) return failure(skeleton, 'invalid-target')
  if (!isValidChain(chain)) return failure(skeleton, 'invalid-chain')

  const validation = validateSkeletonPose(skeleton)
  if (validation.violations.some(({ category }) => category === 'structure')) {
    return failure(skeleton, 'invalid-skeleton')
  }

  const upperLength = Math.hypot(
    skeleton.joints[chain.mid].x,
    skeleton.joints[chain.mid].y,
  )
  const lowerLength = Math.hypot(
    skeleton.joints[chain.end].x,
    skeleton.joints[chain.end].y,
  )
  if (
    !Number.isFinite(upperLength) ||
    !Number.isFinite(lowerLength) ||
    upperLength <= EPSILON ||
    lowerLength <= EPSILON
  ) {
    return failure(skeleton, 'degenerate-chain')
  }
  const upperAxisOffset = radiansToDegrees(Math.atan2(
    skeleton.joints[chain.mid].y,
    skeleton.joints[chain.mid].x,
  ))
  const lowerAxisOffset = radiansToDegrees(Math.atan2(
    skeleton.joints[chain.end].y,
    skeleton.joints[chain.end].x,
  ))

  const resolved = resolveSkeletonPose(skeleton)
  const root = resolved.joints[chain.root]
  const deltaX = target.x - root.x
  const deltaY = target.y - root.y
  const requestedDistance = Math.hypot(deltaX, deltaY)
  if (!Number.isFinite(requestedDistance) || requestedDistance <= EPSILON) {
    return failure(skeleton, 'coincident-root-target')
  }

  const minimumReach = Math.abs(upperLength - lowerLength)
  const maximumReach = upperLength + lowerLength
  const solvedDistance = Math.min(maximumReach, Math.max(minimumReach, requestedDistance))
  const reach: TwoBoneIKReach = requestedDistance > maximumReach
    ? 'too-far'
    : requestedDistance < minimumReach
      ? 'too-close'
      : 'reachable'

  const targetAngle = Math.atan2(deltaY, deltaX)
  const denominator = 2 * upperLength * solvedDistance
  if (denominator <= EPSILON) return failure(skeleton, 'degenerate-chain')

  const cosine = Math.min(1, Math.max(-1,
    (upperLength ** 2 + solvedDistance ** 2 - lowerLength ** 2) / denominator,
  ))
  const bendSign = bendDirection === 'positive' ? 1 : -1
  const upperWorldRotation = radiansToDegrees(
    targetAngle + bendSign * Math.acos(cosine),
  )
  const elbowRadians = (upperWorldRotation * Math.PI) / 180
  const elbow = {
    x: root.x + Math.cos(elbowRadians) * upperLength,
    y: root.y + Math.sin(elbowRadians) * upperLength,
  }
  const clampedTarget = {
    x: root.x + (deltaX / requestedDistance) * solvedDistance,
    y: root.y + (deltaY / requestedDistance) * solvedDistance,
  }
  const lowerWorldRotation = radiansToDegrees(
    Math.atan2(clampedTarget.y - elbow.y, clampedTarget.x - elbow.x),
  )
  const parent = resolved.joints[grapplerJointParents[chain.root]]
  const rootWorldRotation = upperWorldRotation - upperAxisOffset
  const rootRotation = normalizeAngleDegrees(rootWorldRotation - parent.rotation)
  const midRotation = normalizeAngleDegrees(
    lowerWorldRotation - rootWorldRotation - lowerAxisOffset,
  )
  if (!Number.isFinite(rootRotation) || !Number.isFinite(midRotation)) {
    return failure(skeleton, 'degenerate-chain')
  }

  const analytic: GrapplerSkeletonPose = {
    root: {
      position: { ...skeleton.root.position },
      rotation: skeleton.root.rotation,
    },
    joints: {
      ...skeleton.joints,
      [chain.root]: { ...skeleton.joints[chain.root], rotation: rootRotation },
      [chain.mid]: { ...skeleton.joints[chain.mid], rotation: midRotation },
    },
  }
  const constrained = constrainSkeletonPose(analytic)

  return {
    ok: true,
    skeleton: constrained,
    reach,
    constrained:
      constrained.joints[chain.root].rotation !== rootRotation ||
      constrained.joints[chain.mid].rotation !== midRotation,
  }
}
