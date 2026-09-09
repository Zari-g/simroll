import { getTechniqueAnimation } from './techniqueAnimationRegistry.ts'
import { resolveTransitionAnimation } from './animationRecipes/resolver.ts'
import type { AnimationRecipe } from './animationRecipes/types.ts'
import type { GrapplerSkeletonPair } from './contactCorrection.ts'
import {
  resolveTransitionConstraintInputs,
  resolveAuthoredTransitionSkeletons,
  type GrapplerPosePair,
} from './interpolatePose.ts'
import { grapplerPoseToSkeleton } from './kinematics.ts'
import { getPositionVisual } from './positionVisuals.ts'
import type { TransitionContactContext } from './types.ts'
import {
  animationValidationTolerances,
  endpointMatches,
  hasFiniteGeometry,
  jointConstraintsAreValid,
  maxBoneLengthDrift,
  maxSolvedGeometryDelta,
  measureGroundingErrors,
  measurePairSeparation,
  measureRelationalTargetErrors,
} from './validationMetrics.ts'

export const showcaseTechniqueDefinitions = {
  open_guard_bottom_butterfly_sweep_to_side_control_top: {
    name: 'Butterfly Sweep',
    sourcePositionId: 'open_guard_bottom',
    destinationPositionId: 'side_control_top',
  },
  half_guard_bottom_old_school_sweep_to_side_control_top: {
    name: 'Half Guard Old-School Sweep',
    sourcePositionId: 'half_guard_bottom',
    destinationPositionId: 'side_control_top',
  },
  back_control_top_opponent_turn_in_to_half_guard_bottom: {
    name: 'Back-Control Turn-In Escape',
    sourcePositionId: 'back_control_top',
    destinationPositionId: 'half_guard_bottom',
  },
} as const

export const showcaseSampleProgress = [0, 0.2, 0.4, 0.6, 0.8, 1] as const
const emptyContext: TransitionContactContext = { startContacts: [], endContacts: [] }

function skeletons(poses: GrapplerPosePair): GrapplerSkeletonPair {
  return {
    playerA: grapplerPoseToSkeleton(poses.playerA),
    playerB: grapplerPoseToSkeleton(poses.playerB),
  }
}

function endpoints(sourcePositionId: string, destinationPositionId: string) {
  const source = getPositionVisual(sourcePositionId)
  const destination = getPositionVisual(destinationPositionId)
  if (!source || !destination) {
    throw new Error(`Showcase endpoint visuals are missing: ${sourcePositionId} -> ${destinationPositionId}`)
  }
  return {
    start: { playerA: source.playerAPose, playerB: source.playerBPose },
    end: { playerA: destination.playerAPose, playerB: destination.playerBPose },
  }
}

function relationalControlIds(recipe: AnimationRecipe) {
  return (recipe.constraintEnhancements?.controls ?? [])
    .filter(({ controlId }) => [
      'wrist_control', 'sleeve_grip', 'collar_grip', 'ankle_control', 'butterfly_hook',
    ].includes(controlId))
    .map(({ controlId }) => controlId)
}

export interface ShowcaseValidationResult {
  readonly transitionId: string
  readonly name: string
  readonly techniqueFamily: string | null
  readonly constraintEnhanced: boolean
  readonly supportedRelationalControls: readonly string[]
  readonly maxRelationalTargetError: number | null
  readonly groundingValid: boolean
  readonly boneLengthsValid: boolean
  readonly phaseContinuityValid: boolean
  readonly pairSeparationValid: boolean
  readonly endpointValid: boolean
  readonly finiteGeometryValid: boolean
  readonly jointConstraintsValid: boolean
  readonly giValid: boolean
  readonly noGiValid: boolean
}

export function createShowcaseValidationReport(): readonly ShowcaseValidationResult[] {
  return Object.entries(showcaseTechniqueDefinitions).map(([transitionId, definition]) => {
    const resolved = resolveTransitionAnimation(transitionId)
    const recipe = resolved.recipe
    if (!recipe) throw new Error(`Showcase recipe is missing: ${transitionId}`)
    const { start, end } = endpoints(
      definition.sourcePositionId, definition.destinationPositionId,
    )
    const startSkeletons = skeletons(start)
    const endSkeletons = skeletons(end)
    const samples = showcaseSampleProgress.map((progress) => {
      const solved = resolveAuthoredTransitionSkeletons(recipe, start, end, progress, emptyContext)
      const inputs = resolveTransitionConstraintInputs(
        recipe, start, end, progress, emptyContext,
      )
      return { progress, solved, inputs }
    })
    const relationalErrors = samples.flatMap(({ solved, inputs }) =>
      measureRelationalTargetErrors(solved, inputs.contactTargets)
        .map(({ error }) => error))
    const groundingErrors = samples.flatMap(({ solved, inputs }) =>
      measureGroundingErrors(solved, inputs.grounding).map(({ error }) => error))
    const technique = getTechniqueAnimation(transitionId)
    const boundaries = technique
      ? technique.timing.slice(0, -1).map(range => range.end)
      : (recipe.constraintEnhancements?.phases ?? []).map(phase => phase.progress)
    const boundaryDeltas = boundaries.flatMap((progress) => {
      const epsilon = 0.001
      const before = resolveAuthoredTransitionSkeletons(recipe, start, end, progress - epsilon, emptyContext)
      const boundary = resolveAuthoredTransitionSkeletons(recipe, start, end, progress, emptyContext)
      const after = resolveAuthoredTransitionSkeletons(recipe, start, end, progress + epsilon, emptyContext)
      return [
        maxSolvedGeometryDelta(before, boundary),
        maxSolvedGeometryDelta(boundary, after),
      ]
    })
    const modeRecipe = (mode: 'gi' | 'no_gi') =>
      resolveTransitionAnimation(transitionId, { mode }).recipe

    return {
      transitionId,
      name: definition.name,
      techniqueFamily: recipe.family ?? null,
      constraintEnhanced: Boolean(recipe.constraintEnhancements),
      supportedRelationalControls: relationalControlIds(recipe),
      maxRelationalTargetError: relationalErrors.length
        ? Math.max(...relationalErrors)
        : null,
      groundingValid: groundingErrors.every((error) =>
        error <= animationValidationTolerances.groundingError),
      boneLengthsValid: samples.every(({ solved }) =>
        maxBoneLengthDrift(solved, startSkeletons) <=
          animationValidationTolerances.boneLengthDrift),
      phaseContinuityValid: boundaryDeltas.every((delta) =>
        delta <= animationValidationTolerances.phaseBoundaryDelta),
      pairSeparationValid: samples.every(({ solved }) =>
        measurePairSeparation(solved) <= animationValidationTolerances.pairSeparation),
      endpointValid:
        endpointMatches(samples[0].solved, startSkeletons) &&
        endpointMatches(samples[samples.length - 1].solved, endSkeletons),
      finiteGeometryValid: samples.every(({ solved }) => hasFiniteGeometry(solved)),
      jointConstraintsValid: samples.every(({ solved }) => jointConstraintsAreValid(solved)),
      giValid: modeRecipe('gi') === recipe,
      noGiValid: modeRecipe('no_gi') === recipe,
    }
  })
}
