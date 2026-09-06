import type { GrapplerSkeletonPair } from './contactCorrection.ts'
import { createConstraintDiagnostics } from './constraintDiagnostics.ts'
import { resolveSkeletonPose } from './kinematics.ts'
import { validateSkeletonPose } from './poseValidation.ts'
import type { FrameContactConstraint, FrameGrounding } from './resolveAnimationFrame.ts'
import type { GrapplerChildJointName, GrapplerJointName } from './skeleton.ts'
import type { GrapplerId } from './types.ts'

export const animationValidationTolerances = {
  boneLengthDrift: 0.001,
  relationalTargetError: 250,
  groundingError: 25,
  phaseBoundaryDelta: 5,
  pairSeparation: 190,
  endpointDelta: 0.001,
} as const

const grapplerIds = ['playerA', 'playerB'] as const
const measuredBones = {
  leftUpperArm: 'leftElbow',
  rightUpperArm: 'rightElbow',
  leftForearm: 'leftWrist',
  rightForearm: 'rightWrist',
  leftThigh: 'leftKnee',
  rightThigh: 'rightKnee',
  leftLowerLeg: 'leftAnkle',
  rightLowerLeg: 'rightAnkle',
} as const satisfies Readonly<Record<string, GrapplerChildJointName>>

const endEffectorJoints = [
  'leftWrist', 'rightWrist', 'leftAnkle', 'rightAnkle',
] as const satisfies readonly GrapplerJointName[]

export interface BoneLengthDriftMetric {
  readonly grapplerId: GrapplerId
  readonly bone: keyof typeof measuredBones
  readonly referenceLength: number
  readonly solvedLength: number
  readonly drift: number
}

export function hasFiniteGeometry(skeletons: GrapplerSkeletonPair): boolean {
  return grapplerIds.every((grapplerId) => {
    const skeleton = skeletons[grapplerId]
    return Number.isFinite(skeleton.root.position.x) &&
      Number.isFinite(skeleton.root.position.y) &&
      Number.isFinite(skeleton.root.rotation) &&
      Object.values(skeleton.joints).every((joint) =>
        Number.isFinite(joint.x) &&
        Number.isFinite(joint.y) &&
        Number.isFinite(joint.rotation))
  })
}

export function measureBoneLengthDrift(
  skeletons: GrapplerSkeletonPair,
  reference: GrapplerSkeletonPair,
): readonly BoneLengthDriftMetric[] {
  return grapplerIds.flatMap((grapplerId) =>
    Object.entries(measuredBones).map(([bone, joint]) => {
      const solvedTransform = skeletons[grapplerId].joints[joint]
      const referenceTransform = reference[grapplerId].joints[joint]
      const solvedLength = Math.hypot(solvedTransform.x, solvedTransform.y)
      const referenceLength = Math.hypot(referenceTransform.x, referenceTransform.y)
      return {
        grapplerId,
        bone: bone as keyof typeof measuredBones,
        referenceLength,
        solvedLength,
        drift: Math.abs(solvedLength - referenceLength),
      }
    }),
  )
}

export function maxBoneLengthDrift(
  skeletons: GrapplerSkeletonPair,
  reference: GrapplerSkeletonPair,
): number {
  return Math.max(...measureBoneLengthDrift(skeletons, reference).map(({ drift }) => drift))
}

export function measureRelationalTargetErrors(
  skeletons: GrapplerSkeletonPair,
  relationships: readonly FrameContactConstraint[],
) {
  return createConstraintDiagnostics(skeletons, relationships).constraints
    .filter(({ relationalAnchor }) => relationalAnchor !== undefined)
    .map(({ id, sourceGrapplerId, targetGrapplerId, relationalAnchor, error }) => ({
      id, sourceGrapplerId, targetGrapplerId, relationalAnchor, error,
    }))
}

export function measureGroundingErrors(
  skeletons: GrapplerSkeletonPair,
  grounding: FrameGrounding,
) {
  return createConstraintDiagnostics(skeletons, [], grounding).grounding
}

export function jointConstraintsAreValid(skeletons: GrapplerSkeletonPair): boolean {
  return grapplerIds.every((grapplerId) => validateSkeletonPose(skeletons[grapplerId]).valid)
}

function pointDistance(left: { x: number; y: number }, right: { x: number; y: number }) {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

export function maxSolvedGeometryDelta(
  left: GrapplerSkeletonPair,
  right: GrapplerSkeletonPair,
): number {
  return Math.max(...grapplerIds.flatMap((grapplerId) => {
    const leftResolved = resolveSkeletonPose(left[grapplerId])
    const rightResolved = resolveSkeletonPose(right[grapplerId])
    return Object.keys(leftResolved.joints).map((joint) => pointDistance(
      leftResolved.joints[joint as GrapplerJointName],
      rightResolved.joints[joint as GrapplerJointName],
    ))
  }))
}

export function measureRootDisplacementJump(
  left: GrapplerSkeletonPair,
  right: GrapplerSkeletonPair,
): number {
  return Math.max(...grapplerIds.map((grapplerId) => pointDistance(
    left[grapplerId].root.position,
    right[grapplerId].root.position,
  )))
}

export function measureEndEffectorJump(
  left: GrapplerSkeletonPair,
  right: GrapplerSkeletonPair,
): number {
  return Math.max(...grapplerIds.flatMap((grapplerId) => {
    const leftResolved = resolveSkeletonPose(left[grapplerId])
    const rightResolved = resolveSkeletonPose(right[grapplerId])
    return endEffectorJoints.map((joint) => pointDistance(
      leftResolved.joints[joint], rightResolved.joints[joint],
    ))
  }))
}

export function measurePairSeparation(skeletons: GrapplerSkeletonPair): number {
  const resolvedA = resolveSkeletonPose(skeletons.playerA)
  const resolvedB = resolveSkeletonPose(skeletons.playerB)
  return pointDistance(resolvedA.joints.pelvis, resolvedB.joints.pelvis)
}

export function endpointMatches(
  solved: GrapplerSkeletonPair,
  expected: GrapplerSkeletonPair,
  tolerance = animationValidationTolerances.endpointDelta,
): boolean {
  return maxSolvedGeometryDelta(solved, expected) <= tolerance
}
