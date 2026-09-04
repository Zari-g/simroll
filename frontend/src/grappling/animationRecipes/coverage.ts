import { compileFamilyRecipe } from './familyRegistry.ts'
import { authoredAnimationRecipes } from './recipes.ts'
import {
  createTransitionAnimationResolver,
  resolveTransitionAnimation,
} from './resolver.ts'
import type {
  AnimationCoverage,
  AuthoredAnimationRecipe,
  ResolvedAnimation,
} from './types.ts'
import { validateAnimationRecipe } from './validation.ts'

export interface AnimationCoverageTransition {
  readonly id: string
  readonly sourcePositionId: string
  readonly destinationPositionId: string
  readonly name?: string
}

export interface AnimationCoverageEntry extends AnimationCoverageTransition {
  readonly coverage: AnimationCoverage
  readonly familyId?: string
  readonly durationMs: number
  readonly constraintEnhanced: boolean
}

export interface AnimationCoverageReport {
  readonly total: number
  readonly explicit: number
  readonly family: number
  readonly fallback: number
  readonly constraintEnhanced: number
  readonly transitions: readonly AnimationCoverageEntry[]
}

export type AnimationAuthoringIssueCode =
  | 'duplicate-transition'
  | 'duplicate-ownership'
  | 'unknown-transition'
  | 'invalid-definition'

export interface AnimationAuthoringIssue {
  readonly code: AnimationAuthoringIssueCode
  readonly transitionId: string
  readonly message: string
}

interface CoverageResolver {
  resolve(transitionId: string): ResolvedAnimation
}

interface CoverageOptions {
  readonly authoredRecipes?: readonly AuthoredAnimationRecipe[]
  readonly resolver?: CoverageResolver
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) freeze(nested)
  }
  return value
}

/** Audits authored ownership against the supplied authoritative graph. */
export function getAnimationAuthoringIssues(
  transitions: readonly AnimationCoverageTransition[],
  authoredRecipes: readonly AuthoredAnimationRecipe[] = authoredAnimationRecipes,
): readonly AnimationAuthoringIssue[] {
  const issues: AnimationAuthoringIssue[] = []
  const transitionIds = new Set<string>()
  for (const transition of transitions) {
    if (transitionIds.has(transition.id)) {
      issues.push({
        code: 'duplicate-transition',
        transitionId: transition.id,
        message: `Authoritative graph contains duplicate transition "${transition.id}"`,
      })
    }
    transitionIds.add(transition.id)
  }

  const owners = new Set<string>()
  for (const authoring of authoredRecipes) {
    if (owners.has(authoring.transitionId)) {
      issues.push({
        code: 'duplicate-ownership',
        transitionId: authoring.transitionId,
        message: `Transition "${authoring.transitionId}" has more than one animation owner`,
      })
    }
    owners.add(authoring.transitionId)

    if (!transitionIds.has(authoring.transitionId)) {
      issues.push({
        code: 'unknown-transition',
        transitionId: authoring.transitionId,
        message: `Animation definition references unknown transition "${authoring.transitionId}"`,
      })
    }

    try {
      if ('familyId' in authoring) compileFamilyRecipe(authoring)
      else validateAnimationRecipe(authoring)
    } catch (error) {
      issues.push({
        code: 'invalid-definition',
        transitionId: authoring.transitionId,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return freeze(issues)
}

export function assertAnimationAuthoringIsCurrent(
  transitions: readonly AnimationCoverageTransition[],
  authoredRecipes: readonly AuthoredAnimationRecipe[] = authoredAnimationRecipes,
): void {
  const issues = getAnimationAuthoringIssues(transitions, authoredRecipes)
  if (issues.length > 0) {
    throw new Error(`Animation authoring validation failed:\n${issues.map(({ message }) => `- ${message}`).join('\n')}`)
  }
}

/**
 * Classifies the supplied authoritative graph through the playback resolver.
 * No transition catalog or coverage precedence is maintained here.
 */
export function createAnimationCoverageReport(
  transitions: readonly AnimationCoverageTransition[],
  options: CoverageOptions = {},
): AnimationCoverageReport {
  const authoredRecipes = options.authoredRecipes ?? authoredAnimationRecipes
  assertAnimationAuthoringIsCurrent(transitions, authoredRecipes)
  const resolver = options.resolver
    ?? (options.authoredRecipes
      ? createTransitionAnimationResolver(authoredRecipes)
      : { resolve: resolveTransitionAnimation })

  const entries = transitions.map((transition): AnimationCoverageEntry => {
    const resolved = resolver.resolve(transition.id)
    if (!['explicit', 'family', 'fallback'].includes(resolved.source)) {
      throw new Error(`Transition "${transition.id}" has invalid animation coverage`)
    }
    if (!Number.isFinite(resolved.durationMs) || resolved.durationMs <= 0) {
      throw new Error(`Transition "${transition.id}" has invalid animation duration`)
    }
    if (resolved.source === 'family' && !resolved.recipe?.family) {
      throw new Error(`Transition "${transition.id}" resolved as family without a family ID`)
    }
    return {
      ...transition,
      coverage: resolved.source,
      ...(resolved.recipe?.family ? { familyId: resolved.recipe.family } : {}),
      durationMs: resolved.durationMs,
      constraintEnhanced: Boolean(resolved.recipe?.constraintEnhancements),
    }
  })

  const count = (coverage: AnimationCoverage) =>
    entries.filter((entry) => entry.coverage === coverage).length
  const report = {
    total: entries.length,
    explicit: count('explicit'),
    family: count('family'),
    fallback: count('fallback'),
    constraintEnhanced: entries.filter((entry) => entry.constraintEnhanced).length,
    transitions: entries,
  }
  if (report.explicit + report.family + report.fallback !== report.total) {
    throw new Error('Animation coverage counts do not equal the graph transition total')
  }
  return freeze(report)
}
