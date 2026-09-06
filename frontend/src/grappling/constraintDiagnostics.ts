import { defaultGrapplerAnatomy } from './anatomy.ts'
import type { GrapplerSkeletonPair } from './contactCorrection.ts'
import { resolveContactPoint } from './contactGeometry.ts'
import { skeletonSegmentJoints } from './kinematics.ts'
import { resolveSkeletonPose, skeletonToGrapplerPose } from './kinematics.ts'
import { orderFrameContactConstraints, type ConstraintPriority, type FrameContactConstraint, type FrameGrounding } from './resolveAnimationFrame.ts'
import type { GrapplerJointName } from './skeleton.ts'
import type { GrapplerId, GrapplerSegmentName, PointPose } from './types.ts'

export interface SkeletonJointDiagnostic extends PointPose {
  readonly grapplerId: GrapplerId
  readonly joint: GrapplerJointName
}

export interface SkeletonBoneDiagnostic {
  readonly grapplerId: GrapplerId
  readonly segment: GrapplerSegmentName
  readonly start: PointPose
  readonly end: PointPose
}

export interface ConstraintDiagnostic {
  readonly id: string
  readonly sourceGrapplerId: GrapplerId
  readonly targetGrapplerId: GrapplerId
  readonly source: PointPose
  readonly target: PointPose
  readonly error: number
  readonly priority: ConstraintPriority
  readonly type: FrameContactConstraint['contact']['type']
  readonly relationalAnchor?: NonNullable<FrameContactConstraint['relationalAnchor']>
}

export interface GroundingDiagnostic {
  readonly grapplerId: GrapplerId
  readonly joint: GrapplerJointName
  readonly anchor: PointPose
  readonly baselineY: number
  readonly error: number
}

export interface ConstraintDiagnosticSnapshot {
  readonly joints: readonly SkeletonJointDiagnostic[]
  readonly bones: readonly SkeletonBoneDiagnostic[]
  readonly constraints: readonly ConstraintDiagnostic[]
  readonly grounding: readonly GroundingDiagnostic[]
}

const defaultPriority = {
  grip: 'critical',
  hook: 'high',
  pressure: 'medium',
  control: 'medium',
} as const satisfies Readonly<Record<FrameContactConstraint['contact']['type'], ConstraintPriority>>

const supportedBodyParts = new Set([
  'torso', 'leftUpperArm', 'leftForearm', 'rightUpperArm', 'rightForearm',
  'leftThigh', 'leftShin', 'rightThigh', 'rightShin', 'leftHand', 'rightHand',
  'leftFoot', 'rightFoot', 'head',
])

function isSupportedRelationship(relationship: FrameContactConstraint) {
  const { source, target } = relationship.contact
  return (
    (source.grapplerId === 'playerA' || source.grapplerId === 'playerB') &&
    (target.grapplerId === 'playerA' || target.grapplerId === 'playerB') &&
    source.grapplerId !== target.grapplerId &&
    supportedBodyParts.has(source.bodyPart) &&
    supportedBodyParts.has(target.bodyPart) &&
    Number.isFinite(relationship.strength)
  )
}

/** Build read-only debug geometry from already-resolved production output. */
export function createConstraintDiagnostics(
  skeletons: GrapplerSkeletonPair,
  relationships: readonly FrameContactConstraint[] = [],
  grounding: FrameGrounding = {},
): ConstraintDiagnosticSnapshot {
  const resolved = {
    playerA: resolveSkeletonPose(skeletons.playerA),
    playerB: resolveSkeletonPose(skeletons.playerB),
  }
  const poses = {
    playerA: skeletonToGrapplerPose(resolved.playerA),
    playerB: skeletonToGrapplerPose(resolved.playerB),
  }
  const grapplerIds = ['playerA', 'playerB'] as const
  const joints = grapplerIds.flatMap((grapplerId) =>
    Object.entries(resolved[grapplerId].joints).map(([joint, point]) => ({
      grapplerId,
      joint: joint as GrapplerJointName,
      x: point.x,
      y: point.y,
    })),
  )
  const bones = grapplerIds.flatMap((grapplerId) =>
    Object.entries(skeletonSegmentJoints).map(([segment, endpoints]) => ({
      grapplerId,
      segment: segment as GrapplerSegmentName,
      start: { ...resolved[grapplerId].joints[endpoints.start] },
      end: { ...resolved[grapplerId].joints[endpoints.end] },
    })),
  )
  const constraints = orderFrameContactConstraints(relationships).flatMap((relationship) => {
    if (!isSupportedRelationship(relationship)) return []
    try {
      const geometry = resolveContactPoint(relationship.contact, poses, {
        playerA: defaultGrapplerAnatomy,
        playerB: defaultGrapplerAnatomy,
      })
      const error = Math.hypot(
        geometry.target.x - geometry.source.x,
        geometry.target.y - geometry.source.y,
      )
      if (!Number.isFinite(error)) return []
      return [{
        id: relationship.contact.id,
        sourceGrapplerId: relationship.contact.source.grapplerId,
        targetGrapplerId: relationship.contact.target.grapplerId,
        source: geometry.source,
        target: geometry.target,
        error,
        priority: relationship.priority ?? defaultPriority[relationship.contact.type],
        type: relationship.contact.type,
        ...(relationship.relationalAnchor
          ? { relationalAnchor: relationship.relationalAnchor }
          : {}),
      }]
    } catch {
      return []
    }
  })
  const groundingDiagnostics = grapplerIds.flatMap((grapplerId) =>
    Object.entries(grounding[grapplerId] ?? {}).flatMap(([joint, anchor]) => {
      if (!anchor || !Number.isFinite(anchor.baselineY)) return []
      const point = resolved[grapplerId].joints[joint as GrapplerJointName]
      if (!point) return []
      return [{
        grapplerId,
        joint: joint as GrapplerJointName,
        anchor: { x: point.x, y: point.y },
        baselineY: anchor.baselineY,
        error: Math.abs(point.y - anchor.baselineY),
      }]
    }),
  )

  return { joints, bones, constraints, grounding: groundingDiagnostics }
}
