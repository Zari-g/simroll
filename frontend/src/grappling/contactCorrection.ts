import { defaultGrapplerAnatomy } from './anatomy.ts'
import { resolveContactPoint } from './contactGeometry.ts'
import { normalizeAngleDegrees } from './jointConstraints.ts'
import { resolveSkeletonPose, skeletonToGrapplerPose } from './kinematics.ts'
import { constrainSkeletonPose } from './poseValidation.ts'
import type { GrapplerChildJointName, GrapplerSkeletonPose } from './skeleton.ts'
import {
  solveTwoBoneIK,
  twoBoneIKChains,
  type TwoBoneIKChain,
} from './twoBoneIK.ts'
import type {
  GrapplerBodyPartName,
  GrapplerId,
  GrapplingContact,
  PointPose,
} from './types.ts'

export type GrapplerSkeletonPair = Readonly<
  Record<GrapplerId, GrapplerSkeletonPose>
>

/**
 * A small named set of two-anchor relational adjustments. Compatible hand
 * and foot modes first use deterministic two-bone IK; all modes retain the
 * bounded single-joint correction as a safe fallback. Neither path translates
 * the source grappler's root, and both reuse the shared joint constraints.
 */
export type RelationalAnchorMode =
  | 'hand-to-grip-target'
  | 'knee-to-hip-line'
  | 'foot-to-inner-thigh'

export interface ContactCorrectionTarget {
  readonly contact: GrapplingContact
  /** Phase-level influence in the inclusive 0..1 range. */
  readonly strength: number
  /**
   * Opts this contact into a bounded limb-relative adjustment instead of the
   * default whole-root translation. Only applies when the
   * contact's source body part matches the mode's declared anchor pair;
   * otherwise the target is skipped rather than silently falling back to
   * root translation.
   */
  readonly relationalAnchor?: RelationalAnchorMode
}

export interface ContactCorrectionOptions {
  readonly maxContacts?: number
  readonly maxCorrection?: number
  /** Bound, in degrees, for a single relational joint-rotation adjustment. */
  readonly maxAngleCorrection?: number
  /** Keep caller ordering; used by the centralized priority pipeline. */
  readonly preserveTargetOrder?: boolean
}

interface RelationalAnchorRule {
  readonly left: GrapplerBodyPartName
  readonly right: GrapplerBodyPartName
  readonly leftJoint: GrapplerChildJointName
  readonly rightJoint: GrapplerChildJointName
  readonly leftChain?: TwoBoneIKChain
  readonly rightChain?: TwoBoneIKChain
}

const relationalAnchorRules: Readonly<
  Record<RelationalAnchorMode, RelationalAnchorRule>
> = {
  // The elbow's own rotation swings the forearm (and derived hand) around it.
  'hand-to-grip-target': {
    left: 'leftHand',
    right: 'rightHand',
    leftJoint: 'leftElbow',
    rightJoint: 'rightElbow',
    leftChain: twoBoneIKChains.leftArm,
    rightChain: twoBoneIKChains.rightArm,
  },
  // The hip's own rotation swings the thigh (and its knee endpoint) around it.
  'knee-to-hip-line': {
    left: 'leftThigh',
    right: 'rightThigh',
    leftJoint: 'leftHip',
    rightJoint: 'rightHip',
  },
  // The knee's own rotation swings the shin (and derived foot) around it.
  'foot-to-inner-thigh': {
    left: 'leftFoot',
    right: 'rightFoot',
    leftJoint: 'leftKnee',
    rightJoint: 'rightKnee',
    leftChain: twoBoneIKChains.leftLeg,
    rightChain: twoBoneIKChains.rightLeg,
  },
}

function resolveRelationalChain(
  mode: RelationalAnchorMode,
  bodyPart: GrapplerBodyPartName,
): TwoBoneIKChain | null {
  const rule = relationalAnchorRules[mode]
  if (bodyPart === rule.left) return rule.leftChain ?? null
  if (bodyPart === rule.right) return rule.rightChain ?? null
  return null
}

function boundedRotationToward(
  current: number,
  desired: number,
  influence: number,
  maxAngleCorrection: number,
): number {
  const error = normalizeAngleDegrees(desired - current)
  if (!Number.isFinite(error)) return current
  const delta = Math.sign(error) * Math.min(maxAngleCorrection, Math.abs(error) * influence)
  return current + delta
}

function applyTwoBoneRelationalCorrection(
  skeleton: GrapplerSkeletonPose,
  chain: TwoBoneIKChain,
  target: PointPose,
  influence: number,
  maxAngleCorrection: number,
): GrapplerSkeletonPose | null {
  // Stay on the limb's authored side of the analytic triangle. This keeps
  // bent poses continuous while the chain-level default remains available
  // to callers starting from a straight limb.
  const currentMidRotation = normalizeAngleDegrees(
    skeleton.joints[chain.mid].rotation,
  )
  const bendDirection = currentMidRotation === 0
    ? chain.bendDirection
    : currentMidRotation > 0 ? 'negative' : 'positive'
  const solved = solveTwoBoneIK({ skeleton, chain, target, bendDirection })
  if (!solved.ok) return null

  return constrainSkeletonPose({
    root: {
      position: { ...skeleton.root.position },
      rotation: skeleton.root.rotation,
    },
    joints: {
      ...skeleton.joints,
      [chain.root]: {
        ...skeleton.joints[chain.root],
        rotation: boundedRotationToward(
          skeleton.joints[chain.root].rotation,
          solved.skeleton.joints[chain.root].rotation,
          influence,
          maxAngleCorrection,
        ),
      },
      [chain.mid]: {
        ...skeleton.joints[chain.mid],
        rotation: boundedRotationToward(
          skeleton.joints[chain.mid].rotation,
          solved.skeleton.joints[chain.mid].rotation,
          influence,
          maxAngleCorrection,
        ),
      },
    },
  })
}

function resolveRelationalJoint(
  mode: RelationalAnchorMode,
  bodyPart: GrapplerBodyPartName,
): GrapplerChildJointName | null {
  const rule = relationalAnchorRules[mode]
  if (bodyPart === rule.left) return rule.leftJoint
  if (bodyPart === rule.right) return rule.rightJoint
  return null
}

/**
 * Rotate a single named joint's local rotation so the world-space anchor it
 * controls swings toward `target`, bounded by `maxAngleCorrection` degrees
 * and scaled by `influence`. Returns null when the pivot-to-anchor distance
 * or the angular error is degenerate (nothing meaningful to rotate toward).
 */
function applyRelationalCorrection(
  skeleton: GrapplerSkeletonPose,
  jointName: GrapplerChildJointName,
  anchor: PointPose,
  target: PointPose,
  influence: number,
  maxAngleCorrection: number,
): GrapplerSkeletonPose | null {
  const pivot = resolveSkeletonPose(skeleton).joints[jointName]
  const pivotToAnchor = Math.hypot(anchor.x - pivot.x, anchor.y - pivot.y)
  if (pivotToAnchor === 0 || !Number.isFinite(pivotToAnchor)) return null

  const currentAngle =
    (Math.atan2(anchor.y - pivot.y, anchor.x - pivot.x) * 180) / Math.PI
  const desiredAngle =
    (Math.atan2(target.y - pivot.y, target.x - pivot.x) * 180) / Math.PI
  const angularError = normalizeAngleDegrees(desiredAngle - currentAngle)
  if (angularError === 0 || !Number.isFinite(angularError)) return null

  const boundedDelta =
    Math.sign(angularError) *
    Math.min(maxAngleCorrection, Math.abs(angularError) * influence)

  return constrainSkeletonPose({
    root: {
      position: { ...skeleton.root.position },
      rotation: skeleton.root.rotation,
    },
    joints: {
      ...Object.fromEntries(
        Object.entries(skeleton.joints).map(([name, transform]) => [
          name,
          { ...transform },
        ]),
      ),
      [jointName]: {
        ...skeleton.joints[jointName],
        rotation: skeleton.joints[jointName].rotation + boundedDelta,
      },
    } as GrapplerSkeletonPose['joints'],
  })
}

const typePriority: Readonly<Record<GrapplingContact['type'], number>> = {
  grip: 4,
  hook: 3,
  pressure: 2,
  control: 1,
}

const typeStrength: Readonly<Record<GrapplingContact['type'], number>> = {
  grip: 0.82,
  hook: 0.62,
  pressure: 0.48,
  control: 0.38,
}

function cloneSkeleton(pose: GrapplerSkeletonPose): GrapplerSkeletonPose {
  return {
    root: {
      position: { ...pose.root.position },
      rotation: pose.root.rotation,
    },
    joints: Object.fromEntries(
      Object.entries(pose.joints).map(([name, transform]) => [
        name,
        { ...transform },
      ]),
    ) as GrapplerSkeletonPose['joints'],
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

/**
 * Apply a bounded, deterministic correction to the strongest declared
 * contacts. By default this translates a grappler's whole root toward the
 * contact target and never touches local joint transforms. A target that
 * opts into a compatible `relationalAnchor` instead uses two-bone IK, with
 * the Iteration 13C single-joint adjustment retained when IK cannot solve.
 * Both paths stay bounded, deterministic, root-stable, and constrained.
 */
export function correctSkeletonContacts(
  skeletons: GrapplerSkeletonPair,
  targets: readonly ContactCorrectionTarget[],
  options: ContactCorrectionOptions = {},
): GrapplerSkeletonPair {
  const result: Record<GrapplerId, GrapplerSkeletonPose> = {
    playerA: cloneSkeleton(skeletons.playerA),
    playerB: cloneSkeleton(skeletons.playerB),
  }
  const maxContacts = Math.max(0, options.maxContacts ?? 2)
  const maxCorrection = Math.max(0, options.maxCorrection ?? 24)
  const maxAngleCorrection = Math.max(0, options.maxAngleCorrection ?? 30)
  const ranked = targets
    .map((target, index) => ({ ...target, index }))
    .filter(({ contact, strength }) =>
      contact.source.grapplerId !== contact.target.grapplerId &&
      Number.isFinite(strength) &&
      strength > 0,
    )
    .sort(options.preserveTargetOrder
      ? (left, right) => left.index - right.index
      : (left, right) =>
          typePriority[right.contact.type] * clamp01(right.strength) -
            typePriority[left.contact.type] * clamp01(left.strength) ||
          left.contact.id.localeCompare(right.contact.id) ||
          left.index - right.index)
    .slice(0, maxContacts)

  const correctionsBySource = new Map<GrapplerId, number>()
  for (const { contact, strength, relationalAnchor } of ranked) {
    const poses = {
      playerA: skeletonToGrapplerPose(result.playerA),
      playerB: skeletonToGrapplerPose(result.playerB),
    }
    const geometry = resolveContactPoint(contact, poses, {
      playerA: defaultGrapplerAnatomy,
      playerB: defaultGrapplerAnatomy,
    })
    const delta = {
      x: geometry.target.x - geometry.source.x,
      y: geometry.target.y - geometry.source.y,
    }
    const distance = Math.hypot(delta.x, delta.y)
    if (distance === 0 || !Number.isFinite(distance)) continue

    const source = contact.source.grapplerId
    const previousCorrections = correctionsBySource.get(source) ?? 0
    const influence =
      typeStrength[contact.type] * clamp01(strength) * Math.pow(0.55, previousCorrections)

    if (relationalAnchor) {
      const relationalJoint = resolveRelationalJoint(
        relationalAnchor,
        contact.source.bodyPart,
      )
      if (!relationalJoint) continue
      const chain = resolveRelationalChain(relationalAnchor, contact.source.bodyPart)
      const adjusted = chain
        ? applyTwoBoneRelationalCorrection(
            result[source], chain, geometry.target, influence, maxAngleCorrection,
          ) ?? applyRelationalCorrection(
            result[source], relationalJoint, geometry.source, geometry.target,
            influence, maxAngleCorrection,
          )
        : applyRelationalCorrection(
            result[source], relationalJoint, geometry.source, geometry.target,
            influence, maxAngleCorrection,
          )
      if (!adjusted) continue
      result[source] = adjusted
      correctionsBySource.set(source, previousCorrections + 1)
      continue
    }

    const correctionDistance = Math.min(maxCorrection, distance * influence)
    const scale = correctionDistance / distance
    const pose = result[source]
    result[source] = {
      root: {
        position: {
          x: pose.root.position.x + delta.x * scale,
          y: pose.root.position.y + delta.y * scale,
        },
        rotation: pose.root.rotation,
      },
      joints: Object.fromEntries(
        Object.entries(pose.joints).map(([name, transform]) => [name, { ...transform }]),
      ) as GrapplerSkeletonPose['joints'],
    }
    correctionsBySource.set(source, previousCorrections + 1)
  }

  return result
}
