import type { GrapplingMode } from '../../types/api.ts'
import type { ActiveVisualControl } from '../controlTargets.ts'
import { compileFamilyRecipe } from './familyRegistry.ts'
import { authoredAnimationRecipes } from './recipes.ts'
import type {
  AnimationCoverage,
  AnimationRecipe,
  AuthoredAnimationRecipe,
  FamilyBackedAnimationRecipe,
  ResolvedAnimation,
} from './types.ts'
import { validateAnimationRecipe } from './validation.ts'

export const FALLBACK_ANIMATION_DURATION_MS = 300

/** Visual-only inputs reserved for mode-, role-, or control-aware resolution. */
export interface TransitionAnimationContext {
  readonly mode?: GrapplingMode
  readonly sourcePositionId?: string
  readonly destinationPositionId?: string
  readonly playerRoles?: Readonly<Record<'playerA' | 'playerB', string>>
  readonly sourceControls?: readonly ActiveVisualControl[]
  readonly destinationControls?: readonly ActiveVisualControl[]
}

interface AnimationAuthoringRegistries {
  readonly explicit: Readonly<Record<string, AnimationRecipe>>
  readonly family: Readonly<Record<string, FamilyBackedAnimationRecipe>>
}

export interface TransitionAnimationResolver {
  resolve(
    transitionId: string,
    context?: TransitionAnimationContext,
  ): ResolvedAnimation
  getCoverage(
    transitionId: string,
    context?: TransitionAnimationContext,
  ): AnimationCoverage
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) deepFreeze(nested)
  }
  return value
}

function createAuthoringRegistries(
  authoredRecipes: readonly AuthoredAnimationRecipe[],
): AnimationAuthoringRegistries {
  const explicit: Record<string, AnimationRecipe> = Object.create(null)
  const family: Record<string, FamilyBackedAnimationRecipe> = Object.create(null)

  for (const authoring of authoredRecipes) {
    const registry = 'familyId' in authoring ? family : explicit
    if (registry[authoring.transitionId]) {
      throw new Error(
        `Duplicate ${'familyId' in authoring ? 'family' : 'explicit'} animation authoring for transition "${authoring.transitionId}"`,
      )
    }
    if (!('familyId' in authoring)) validateAnimationRecipe(authoring)
    registry[authoring.transitionId] = deepFreeze(authoring)
  }

  return {
    explicit: Object.freeze(explicit),
    family: Object.freeze(family),
  }
}

/**
 * Builds the single policy boundary for visual coverage. It does not validate
 * semantic legality or infer endpoints; those remain backend-owned.
 */
export function createTransitionAnimationResolver(
  authoredRecipes: readonly AuthoredAnimationRecipe[],
  fallbackDurationMs = FALLBACK_ANIMATION_DURATION_MS,
): TransitionAnimationResolver {
  if (!Number.isFinite(fallbackDurationMs) || fallbackDurationMs <= 0) {
    throw new Error('Fallback animation duration must be finite and greater than zero')
  }

  const registries = createAuthoringRegistries(authoredRecipes)
  const cache = new Map<string, ResolvedAnimation>()

  const resolve = (
    transitionId: string,
    context?: TransitionAnimationContext,
  ): ResolvedAnimation => {
    // Context is intentionally visual-only. It is accepted now so later visual
    // variants do not need to move this boundary into playback or semantics.
    void context
    const cached = cache.get(transitionId)
    if (cached) return cached

    const explicit = registries.explicit[transitionId]
    let resolved: ResolvedAnimation
    if (explicit) {
      resolved = { source: 'explicit', recipe: explicit, durationMs: explicit.durationMs }
    } else {
      const familyAuthoring = registries.family[transitionId]
      if (familyAuthoring) {
        const recipe = deepFreeze(compileFamilyRecipe(familyAuthoring))
        resolved = { source: 'family', recipe, durationMs: recipe.durationMs }
      } else {
        resolved = { source: 'fallback', recipe: null, durationMs: fallbackDurationMs }
      }
    }

    const immutable = deepFreeze(resolved)
    cache.set(transitionId, immutable)
    return immutable
  }

  return {
    resolve,
    getCoverage: (transitionId, context) => resolve(transitionId, context).source,
  }
}

const defaultResolver = createTransitionAnimationResolver(authoredAnimationRecipes)

/** Resolves explicit, then family-backed, then safe fallback choreography. */
export function resolveTransitionAnimation(
  transitionId: string,
  context?: TransitionAnimationContext,
): ResolvedAnimation {
  return defaultResolver.resolve(transitionId, context)
}

/** Coverage classification shares the exact playback resolution rules. */
export function getAnimationCoverage(
  transitionId: string,
  context?: TransitionAnimationContext,
): AnimationCoverage {
  return defaultResolver.getCoverage(transitionId, context)
}

/** Legacy recipe lookup kept for authoring tools and focused executor tests. */
export function getAnimationRecipe(transitionId: string): AnimationRecipe | null {
  return resolveTransitionAnimation(transitionId).recipe
}

/** Legacy authored-recipe view; fallback entries are intentionally absent. */
export const animationRecipeRegistry = Object.freeze(
  Object.fromEntries(
    [...new Set(authoredAnimationRecipes.map(({ transitionId }) => transitionId))]
      .map((transitionId) => {
        const recipe = resolveTransitionAnimation(transitionId).recipe
        if (!recipe) throw new Error(`Authored animation "${transitionId}" did not resolve`)
        return [transitionId, recipe]
      }),
  ),
) as Readonly<Record<string, AnimationRecipe>>
