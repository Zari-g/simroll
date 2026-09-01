import type { AnimationPlayerChoreography } from './animationRecipes/types.ts'
import {
  correctSkeletonContacts,
  type ContactCorrectionOptions,
  type ContactCorrectionTarget,
  type GrapplerSkeletonPair,
} from './contactCorrection.ts'
import {
  groundSkeletonPose,
  type GroundedAnchorSet,
} from './groundedAnchors.ts'
import { composeMotionPrimitives } from './motionPrimitives.ts'
import { constrainSkeletonPose, validateSkeletonPose } from './poseValidation.ts'
import type {
  GrapplerChildJointName,
  GrapplerSkeletonPose,
} from './skeleton.ts'
import type { GrapplerId, SkeletonPoseOverride } from './types.ts'

export type ConstraintPriority = 'critical' | 'high' | 'medium' | 'low'

export interface FrameContactConstraint extends ContactCorrectionTarget {
  /** Explicit reusable importance; contact type supplies the generic default. */
  readonly priority?: ConstraintPriority
}

export type FrameGrounding = Readonly<
  Partial<Record<GrapplerId, GroundedAnchorSet>>
>

export interface ResolveAnimationFrameInput {
  /** Base/interpolated local skeletons for this frame. */
  readonly skeletons: GrapplerSkeletonPair
  /** Optional per-player primitive/override result composed before grounding. */
  readonly choreography?: Readonly<
    Partial<Record<GrapplerId, AnimationPlayerChoreography>>
  >
  readonly grounding?: FrameGrounding
  /** Already lifecycle- and mode-filtered active contact/control targets. */
  readonly contactTargets?: readonly FrameContactConstraint[]
  readonly contactOptions?: ContactCorrectionOptions
  /** Enables exact authoritative endpoint bypass when endpoints are supplied. */
  readonly progress?: number
  readonly sourceSkeletons?: GrapplerSkeletonPair
  readonly destinationSkeletons?: GrapplerSkeletonPair
}

/**
 * The authoritative per-frame order. Base interpolation happens at the call
 * site because recipes interpolate between authored phase results; every
 * constraint-bearing production frame enters here immediately afterward.
 */
export const animationFrameSolveOrder = [
  'base/interpolated skeleton',
  'motion primitives and authored override',
  'grounding',
  'priority-ordered relational/contact correction (two-bone IK with fallback)',
  'joint constraints',
  'finite/structural validation',
] as const

const priorityRank: Readonly<Record<ConstraintPriority, number>> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const defaultContactPriority = {
  grip: 'critical',
  hook: 'high',
  pressure: 'medium',
  control: 'medium',
} as const satisfies Readonly<
  Record<FrameContactConstraint['contact']['type'], ConstraintPriority>
>

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

function clonePair(skeletons: GrapplerSkeletonPair): GrapplerSkeletonPair {
  return {
    playerA: cloneSkeleton(skeletons.playerA),
    playerB: cloneSkeleton(skeletons.playerB),
  }
}

function applySkeletonOverride(
  pose: GrapplerSkeletonPose,
  override?: SkeletonPoseOverride,
): GrapplerSkeletonPose {
  if (!override) return cloneSkeleton(pose)
  const joints = { ...pose.joints }
  for (const [name, transform] of Object.entries(override.joints ?? {})) {
    const jointName = name as GrapplerChildJointName
    joints[jointName] = { ...joints[jointName], ...transform }
  }
  return {
    root: {
      position: { ...pose.root.position, ...override.root?.position },
      rotation: override.root?.rotation ?? pose.root.rotation,
    },
    joints,
  }
}

/** Compose the non-constraint choreography stage without mutating its input. */
export function composeAnimationSkeleton(
  skeleton: GrapplerSkeletonPose,
  choreography?: AnimationPlayerChoreography,
): GrapplerSkeletonPose {
  const moved = composeMotionPrimitives(
    cloneSkeleton(skeleton),
    choreography?.primitives ?? [],
  )
  return applySkeletonOverride(moved, choreography?.override)
}

function constraintKey(target: FrameContactConstraint) {
  const { contact } = target
  return [
    contact.id,
    contact.type,
    contact.source.grapplerId,
    contact.source.bodyPart,
    contact.source.anchor ?? '',
    contact.source.offset?.x ?? '',
    contact.source.offset?.y ?? '',
    contact.target.grapplerId,
    contact.target.bodyPart,
    contact.target.anchor ?? '',
    contact.target.offset?.x ?? '',
    contact.target.offset?.y ?? '',
    target.relationalAnchor ?? '',
    target.strength,
  ].join(':')
}

/** Generic priority first, then a canonical semantic key, then input order. */
export function orderFrameContactConstraints(
  targets: readonly FrameContactConstraint[],
): readonly FrameContactConstraint[] {
  return targets
    .map((target, index) => ({ target, index }))
    .sort((left, right) => {
      const leftPriority = left.target.priority ??
        defaultContactPriority[left.target.contact.type]
      const rightPriority = right.target.priority ??
        defaultContactPriority[right.target.contact.type]
      const leftKey = constraintKey(left.target)
      const rightKey = constraintKey(right.target)
      return priorityRank[leftPriority] - priorityRank[rightPriority] ||
        (leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0) ||
        left.index - right.index
    })
    .map(({ target }) => target)
}

function assertResolvedSkeleton(
  skeleton: GrapplerSkeletonPose,
  grapplerId: GrapplerId,
) {
  const validation = validateSkeletonPose(skeleton)
  if (!validation.valid) {
    throw new Error(
      `Resolved animation frame for ${grapplerId} is invalid: ${validation.violations
        .map(({ message }) => message)
        .join('; ')}`,
    )
  }
}

/**
 * Resolve one immutable animation frame through the single ordered constraint
 * pipeline. Grounding remains root-translation based; conflicting multiple
 * anchors are therefore sequential rather than a simultaneous solve.
 */
export function resolveAnimationFrame({
  skeletons,
  choreography = {},
  grounding = {},
  contactTargets = [],
  contactOptions,
  progress,
  sourceSkeletons,
  destinationSkeletons,
}: ResolveAnimationFrameInput): GrapplerSkeletonPair {
  if (progress !== undefined && progress <= 0 && sourceSkeletons) {
    return clonePair(sourceSkeletons)
  }
  if (progress !== undefined && progress >= 1 && destinationSkeletons) {
    return clonePair(destinationSkeletons)
  }

  const composed: GrapplerSkeletonPair = {
    playerA: composeAnimationSkeleton(skeletons.playerA, choreography.playerA),
    playerB: composeAnimationSkeleton(skeletons.playerB, choreography.playerB),
  }
  const grounded: GrapplerSkeletonPair = {
    playerA: groundSkeletonPose(composed.playerA, grounding.playerA),
    playerB: groundSkeletonPose(composed.playerB, grounding.playerB),
  }
  const corrected = correctSkeletonContacts(
    grounded,
    orderFrameContactConstraints(contactTargets),
    { ...contactOptions, preserveTargetOrder: true },
  )
  const constrained: GrapplerSkeletonPair = {
    playerA: constrainSkeletonPose(corrected.playerA),
    playerB: constrainSkeletonPose(corrected.playerB),
  }

  assertResolvedSkeleton(constrained.playerA, 'playerA')
  assertResolvedSkeleton(constrained.playerB, 'playerB')
  return constrained
}
