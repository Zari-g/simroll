import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveTransitionAnimation } from '../src/grappling/animationRecipes/resolver.ts'
import { createConstraintDiagnostics } from '../src/grappling/constraintDiagnostics.ts'
import { resolveConstraintDrivenPosition } from '../src/grappling/constraintDrivenPositions.ts'
import {
  resolveAuthoredTransitionSkeletons,
  resolveTransitionConstraintInputs,
  resolveTransitionPoses,
} from '../src/grappling/interpolatePose.ts'
import { grapplerPoseToSkeleton } from '../src/grappling/kinematics.ts'
import {
  articulatedPositionSkeletons, constraintDrivenPositionIds,
  constraintDrivenPositions, getPositionVisual,
} from '../src/grappling/positionVisuals.ts'
import { createShowcaseValidationReport } from '../src/grappling/showcaseValidation.ts'
import {
  animationValidationTolerances, endpointMatches, hasFiniteGeometry,
  jointConstraintsAreValid, maxBoneLengthDrift, measureEndEffectorJump,
  measureGroundingErrors, measurePairSeparation, measureRelationalTargetErrors,
  measureRootDisplacementJump,
} from '../src/grappling/validationMetrics.ts'

function poses(positionId: string) {
  const visual = getPositionVisual(positionId)
  assert.ok(visual, `missing visual for ${positionId}`)
  return { playerA: visual.playerAPose, playerB: visual.playerBPose }
}

function skeletons(pair: ReturnType<typeof poses>) {
  return {
    playerA: grapplerPoseToSkeleton(pair.playerA),
    playerB: grapplerPoseToSkeleton(pair.playerB),
  }
}

test('reusable metrics validate all solved showcase samples', () => {
  const report = createShowcaseValidationReport()
  assert.equal(report.length, 3)
  for (const result of report) {
    assert.equal(result.constraintEnhanced, true)
    assert.equal(result.finiteGeometryValid, true)
    assert.equal(result.jointConstraintsValid, true)
    assert.equal(result.boneLengthsValid, true)
    assert.equal(result.groundingValid, true)
    assert.equal(result.phaseContinuityValid, true)
    assert.equal(result.pairSeparationValid, true)
    assert.equal(result.endpointValid, true)
    assert.equal(result.giValid, true)
    assert.equal(result.noGiValid, true)
    if (result.supportedRelationalControls.length) {
      assert.ok(result.maxRelationalTargetError !== null)
      assert.ok(result.maxRelationalTargetError <= animationValidationTolerances.relationalTargetError)
    } else {
      assert.equal(result.maxRelationalTargetError, null)
    }
  }
})

test('constraint-driven positions expose finite bone, grounding, and relationship measurements', () => {
  for (const positionId of constraintDrivenPositionIds) {
    const definition = constraintDrivenPositions[positionId]
    const snapshot = structuredClone(definition)
    const solved = resolveConstraintDrivenPosition(definition)
    const repeat = resolveConstraintDrivenPosition(definition)
    const diagnosticsSnapshot = structuredClone(solved)

    assert.deepEqual(solved, repeat)
    assert.deepEqual(definition, snapshot)
    assert.equal(hasFiniteGeometry(solved), true)
    assert.equal(jointConstraintsAreValid(solved), true)
    assert.ok(maxBoneLengthDrift(solved, definition.basePose) <= animationValidationTolerances.boneLengthDrift)
    assert.ok(measureGroundingErrors(solved, definition.grounding ?? {})
      .every(({ error }) => error <= animationValidationTolerances.groundingError))
    assert.ok(measureRelationalTargetErrors(solved, definition.relationships ?? [])
      .every(({ error }) => error <= animationValidationTolerances.relationalTargetError))
    assert.ok(measurePairSeparation(solved) <= animationValidationTolerances.pairSeparation)
    createConstraintDiagnostics(solved, definition.relationships, definition.grounding)
    assert.deepEqual(solved, diagnosticsSnapshot)
    assert.deepEqual(solved, articulatedPositionSkeletons[positionId])
  }
})

test('a 12-transition animation-layer roll remains finite and endpoint-consistent', () => {
  const sequence = [
    ['closed_guard_bottom_opponent_stand_open_to_open_guard_bottom', 'closed_guard_bottom', 'open_guard_bottom'],
    ['open_guard_bottom_recover_closed_guard', 'open_guard_bottom', 'closed_guard_bottom'],
    ['closed_guard_bottom_hip_bump_to_mount_top', 'closed_guard_bottom', 'mount_top'],
    ['mount_top_gift_wrap_to_back_control', 'mount_top', 'back_control_top'],
    ['back_control_top_opponent_turn_in_to_half_guard_bottom', 'back_control_top', 'half_guard_bottom'],
    ['half_guard_bottom_recover_closed_guard', 'half_guard_bottom', 'closed_guard_bottom'],
    ['closed_guard_bottom_opponent_stand_open_to_open_guard_bottom', 'closed_guard_bottom', 'open_guard_bottom'],
    ['open_guard_bottom_butterfly_sweep_to_side_control_top', 'open_guard_bottom', 'side_control_top'],
    ['side_control_top_step_over_to_mount', 'side_control_top', 'mount_top'],
    ['mount_top_gift_wrap_to_back_control', 'mount_top', 'back_control_top'],
    ['back_control_top_opponent_turn_in_to_half_guard_bottom', 'back_control_top', 'half_guard_bottom'],
    ['half_guard_bottom_old_school_sweep_to_side_control_top', 'half_guard_bottom', 'side_control_top'],
  ] as const
  let previousEndpoint = skeletons(poses(sequence[0][1]))

  for (const [transitionId, sourceId, destinationId] of sequence) {
    const start = poses(sourceId)
    const end = poses(destinationId)
    const recipe = resolveTransitionAnimation(transitionId).recipe
    const startSkeletons = skeletons(start)
    const endSkeletons = skeletons(end)
    assert.equal(endpointMatches(previousEndpoint, startSkeletons), true)
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const solved = recipe
        ? resolveAuthoredTransitionSkeletons(recipe, start, end, progress)
        : skeletons(resolveTransitionPoses(recipe, start, end, progress))
      assert.equal(hasFiniteGeometry(solved), true)
      if (recipe) assert.equal(jointConstraintsAreValid(solved), true)
      if (progress === 0) assert.equal(endpointMatches(solved, startSkeletons), true)
      if (progress === 1) assert.equal(endpointMatches(solved, endSkeletons), true)
    }
    previousEndpoint = endSkeletons
  }
})

test('jump and target metrics use final production-solved geometry', () => {
  const start = poses('open_guard_bottom')
  const end = poses('side_control_top')
  const recipe = resolveTransitionAnimation('open_guard_bottom_butterfly_sweep_to_side_control_top').recipe
  assert.ok(recipe)
  const before = skeletons(resolveTransitionPoses(recipe, start, end, 0.479))
  const after = skeletons(resolveTransitionPoses(recipe, start, end, 0.481))
  const inputs = resolveTransitionConstraintInputs(recipe, start, end, 0.481)
  assert.ok(Number.isFinite(measureRootDisplacementJump(before, after)))
  assert.ok(Number.isFinite(measureEndEffectorJump(before, after)))
  assert.ok(measureRelationalTargetErrors(after, inputs.contactTargets)
    .every(({ error }) => Number.isFinite(error)))
})
