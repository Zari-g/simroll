import type {
  GrapplerSide,
  MotionPrimitive,
  PlanarDirection,
} from '../motionPrimitives.ts'
import type {
  GrapplerId,
  MotionTimingGroup,
  SkeletonPoseOverride,
} from '../types.ts'
import type { GrapplerJointName } from '../skeleton.ts'
import type { ControlSide } from '../controlTargets.ts'

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

/**
 * Phase overlays and supported semantic relationships for recipes that
 * intentionally exercise the centralized constraint pipeline.
 */
export interface AnimationConstraintEnhancements {
  readonly phases?: readonly AnimationPhase[]
  readonly controls?: readonly AnimationControlRequirement[]
  /** Anchors follow the source-to-destination baseline while primitives act. */
  readonly groundedJoints?: Readonly<Partial<Record<GrapplerId, GrapplerJointName>>>
}

/** Reserved declarative metadata for later contact-aware recipe compilation. */
export interface AnimationContactRequirement {
  readonly contactId: string
  readonly maintainedFrom?: number
  readonly maintainedUntil?: number
}

export interface AnimationControlRequirement {
  readonly controlId: string
  /** Visual lifecycle only; it never mutates authoritative semantic state. */
  readonly action?: 'preserve' | 'release' | 'acquire'
  readonly controller?: GrapplerId
  readonly opponent?: GrapplerId
  readonly side?: ControlSide
  readonly strength?: number
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
  readonly constraintEnhancements?: AnimationConstraintEnhancements
  readonly requirements?: {
    readonly contacts?: readonly AnimationContactRequirement[]
    readonly controls?: readonly AnimationControlRequirement[]
  }
}

export type FamilyParameterKind = 'number' | 'side' | 'direction'
export type FamilyParameterValue = number | GrapplerSide | PlanarDirection

export interface FamilyParameterDefinition {
  readonly kind: FamilyParameterKind
  readonly required?: boolean
  readonly default?: FamilyParameterValue
  readonly min?: number
  readonly max?: number
}

export interface FamilyParameterReference {
  readonly $param: string
  /** Numeric references only. */
  readonly scale?: number
  /** Numeric references only. */
  readonly offset?: number
  /** Side references only. */
  readonly opposite?: boolean
}

type ParameterizedValue<T> = T extends number | string
  ? T | FamilyParameterReference
  : T extends readonly (infer Item)[]
    ? readonly ParameterizedValue<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: ParameterizedValue<T[Key]> }
      : T

export type FamilyPhase = ParameterizedValue<AnimationPhase>
export type FamilyControlRequirement = ParameterizedValue<AnimationControlRequirement>

export interface TechniqueFamily {
  readonly id: string
  readonly durationMs: number
  readonly timing?: AnimationRecipe['timing']
  readonly parameters: Readonly<Record<string, FamilyParameterDefinition>>
  readonly phases: readonly FamilyPhase[]
  readonly controls?: readonly FamilyControlRequirement[]
}

export interface FamilyRecipeOverrides {
  readonly durationMs?: number
  readonly timing?: AnimationRecipe['timing']
  readonly requirements?: AnimationRecipe['requirements']
  readonly constraintEnhancements?: AnimationConstraintEnhancements
}

export interface FamilyBackedAnimationRecipe {
  readonly transitionId: string
  readonly recipeId?: string
  readonly familyId: string
  readonly params: Readonly<Record<string, FamilyParameterValue>>
  readonly overrides?: FamilyRecipeOverrides
}

export type AuthoredAnimationRecipe = AnimationRecipe | FamilyBackedAnimationRecipe

export type AnimationCoverage = 'explicit' | 'family' | 'fallback'

export interface ResolvedAnimation {
  readonly source: AnimationCoverage
  readonly recipe: AnimationRecipe | null
  readonly durationMs: number
}
