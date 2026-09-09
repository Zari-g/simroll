import type { AnimationControlRequirement } from './animationRecipes/types.ts'
import type { ActiveVisualControl, ControlTargetDefinition } from './controlTargets.ts'
import type { MotionPrimitive } from './motionPrimitives.ts'
import type { GrapplerJointName } from './skeleton.ts'
import type { GrapplerId } from './types.ts'
import type { GrapplingMode } from '../types/api.ts'

export type AnimationEasing = 'linear' | 'easeInOutCubic'

/** Explicit identities, never actor/defender aliases. */
export type TechniqueParticipants =
  | { readonly controller: 'playerA'; readonly opponent: 'playerB' }
  | { readonly controller: 'playerB'; readonly opponent: 'playerA' }

export type ControlLifecycleChange = TechniqueParticipants &
  Omit<ActiveVisualControl, 'controller' | 'opponent'> & {
    readonly action: NonNullable<AnimationControlRequirement['action']>
    /** Optional restriction; canonical Grip.gi_required always takes precedence. */
    readonly modes?: readonly GrapplingMode[]
  }

/** Existing semantic contacts, bound to an explicit A/B pair. */
export type RelationalTargetDefinition = TechniqueParticipants & ControlTargetDefinition & {
  readonly side?: ActiveVisualControl['side']
  /** Ties this relationship to an active, mode-filtered control when supplied. */
  readonly controlId?: string
}

export interface GroundingIntent {
  readonly grapplerId: GrapplerId
  /** Hands/feet use terminal wrist/ankle joints, as in GroundedAnchorSet. */
  readonly joint: GrapplerJointName
  /** Y only: freeze phase-entry Y, or follow the graph endpoint blend baseline. */
  readonly baseline: 'phaseStart' | 'transitionBlend'
}

export interface GrapplerPhaseActions {
  /** Applied in array order; parameters retain the existing primitive units. */
  readonly primitives?: readonly MotionPrimitive[]
}

export interface TechniqueAnimationPhase {
  readonly id: string
  /** Positive relative weight. Phase fraction = duration / sum of durations. */
  readonly duration: number
  readonly playerA?: GrapplerPhaseActions
  readonly playerB?: GrapplerPhaseActions
  readonly controls?: readonly ControlLifecycleChange[]
  readonly relationalTargets?: readonly RelationalTargetDefinition[]
  /** Phase-local; a later phase replaces these intents rather than accumulating. */
  readonly grounding?: readonly GroundingIntent[]
  /** Optional canonical position anchor at phase end; never a graph edge. */
  readonly targetPosition?: string
  /** Phase-local easing, default easeInOutCubic. */
  readonly easing?: AnimationEasing
}

/** Authoring-only contract for 15B; not registered with the current renderer. */
export interface TechniqueAnimationDefinition {
  readonly transitionId: string
  /** Nonempty, sequential phases. Overall playback milliseconds remain external. */
  readonly phases: readonly [TechniqueAnimationPhase, ...TechniqueAnimationPhase[]]
  readonly metadata?: {
    readonly description?: string
    readonly tags?: readonly string[]
  }
}
