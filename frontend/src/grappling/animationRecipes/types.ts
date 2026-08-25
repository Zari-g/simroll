import type { MotionPrimitive } from '../motionPrimitives.ts'
import type {
  GrapplerId,
  MotionTimingGroup,
  SkeletonPoseOverride,
} from '../types.ts'

export interface AnimationPlayerChoreography {
  readonly primitives?: readonly MotionPrimitive[]
  /** Escape hatch for silhouettes not yet expressible with shared primitives. */
  readonly override?: SkeletonPoseOverride
}

export interface AnimationPhase {
  /** Global recipe progress. Endpoints are implicit and must not be authored. */
  readonly progress: number
  /** Source-to-destination skeleton blend before primitives; defaults to progress. */
  readonly baseProgress?: number
  readonly playerA?: AnimationPlayerChoreography
  readonly playerB?: AnimationPlayerChoreography
}

/** Reserved declarative metadata for later contact-aware recipe compilation. */
export interface AnimationContactRequirement {
  readonly contactId: string
  readonly maintainedFrom?: number
  readonly maintainedUntil?: number
}

/** Reserved declarative metadata for later semantic-control-aware compilation. */
export interface AnimationControlRequirement {
  readonly controlId: string
  readonly activeFrom?: number
  readonly activeUntil?: number
}

export interface AnimationRecipe {
  /** References an authoritative semantic transition; it does not redefine it. */
  readonly transitionId: string
  readonly recipeId?: string
  readonly family?: string
  readonly durationMs: number
  /** Small local phase offsets; positive values lag and negative values lead. */
  readonly timing?: Readonly<
    Partial<Record<GrapplerId, Readonly<Partial<Record<MotionTimingGroup, number>>>>>
  >
  readonly phases: readonly AnimationPhase[]
  readonly requirements?: {
    readonly contacts?: readonly AnimationContactRequirement[]
    readonly controls?: readonly AnimationControlRequirement[]
  }
}
