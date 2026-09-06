import type { ContactCorrectionOptions, GrapplerSkeletonPair } from './contactCorrection.ts'
import type { FrameContactConstraint, FrameGrounding } from './resolveAnimationFrame.ts'
import { resolveGrapplerPairFrame } from './resolveGrapplerPairFrame.ts'
import type { GrapplerId, PointPose } from './types.ts'

/** Deliberately small static-position authoring contract. */
export interface ConstraintDrivenPosition {
  /** Rough authored postures, expressed without scene placement. */
  readonly basePose: GrapplerSkeletonPair
  /** Scene-space pelvis placement for the two rough postures. */
  readonly placement: Readonly<Record<GrapplerId, PointPose>>
  readonly grounding?: FrameGrounding
  /** Supported semantic limb relationships refined by the shared pair solver. */
  readonly relationships?: readonly FrameContactConstraint[]
  readonly contactOptions?: ContactCorrectionOptions
}

function cloneAtPlacement(
  skeleton: GrapplerSkeletonPair[GrapplerId],
  placement: PointPose,
) {
  return {
    root: {
      position: { ...placement },
      rotation: skeleton.root.rotation,
    },
    joints: Object.fromEntries(
      Object.entries(skeleton.joints).map(([name, joint]) => [name, { ...joint }]),
    ) as GrapplerSkeletonPair[GrapplerId]['joints'],
  }
}

/**
 * Resolve a static pair through the same bounded grounding, priority,
 * relational-contact, IK, joint-limit, and validation stack as animation.
 */
export function resolveConstraintDrivenPosition(
  definition: ConstraintDrivenPosition,
): GrapplerSkeletonPair {
  return resolveGrapplerPairFrame({
    skeletons: {
      playerA: cloneAtPlacement(definition.basePose.playerA, definition.placement.playerA),
      playerB: cloneAtPlacement(definition.basePose.playerB, definition.placement.playerB),
    },
    grounding: definition.grounding,
    contactTargets: definition.relationships,
    contactOptions: definition.contactOptions,
  })
}

/** Separate posture from placement without changing authored articulation. */
export function createUnplacedBasePair(
  pair: GrapplerSkeletonPair,
): GrapplerSkeletonPair {
  const unplace = (skeleton: GrapplerSkeletonPair[GrapplerId]) =>
    cloneAtPlacement(skeleton, { x: 0, y: 0 })
  return {
    playerA: unplace(pair.playerA),
    playerB: unplace(pair.playerB),
  }
}
