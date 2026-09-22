import assert from 'node:assert/strict'
import test from 'node:test'
import dataset from '../../data/generated/simroll_bjj_mvp.normalized.json' with { type: 'json' }
import { resolveTransitionAnimation } from '../src/grappling/animationRecipes/resolver.ts'
import { interpolateSkeletonPose } from '../src/grappling/animationInterpolation.ts'
import { sampleDenseContinuity } from '../src/grappling/denseContinuity.ts'
import { resolveTransitionPoses } from '../src/grappling/interpolatePose.ts'
import { grapplerPoseToSkeleton, resolveSkeletonPose } from '../src/grappling/kinematics.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'
import { getTechniqueAnimation } from '../src/grappling/techniqueAnimationRegistry.ts'
import { techniqueAnimations } from '../src/grappling/techniqueAnimations.ts'
import { resolveTechniqueSkeletons } from '../src/grappling/techniqueRuntime.ts'
import { solveTwoBoneIK, twoBoneIKChains } from '../src/grappling/twoBoneIK.ts'
import type { GrapplingMode, GrapplingStateResponse } from '../src/types/api.ts'
import { getHistoricalTransition, resolveStateVisual } from '../src/utils/rollPlayback.ts'

function scenario(id: string, mode: GrapplingMode) {
  const transition = dataset.positional_transitions.find(entry => entry.id === id)!
  const states: GrapplingStateResponse[] = [
    transition.source_position,
    transition.destination_position,
  ].map(position_id => ({ position_id, mode, active_controls: [] }))
  const start = resolveStateVisual(states[0])!
  const end = resolveStateVisual(states[1])!
  return {
    states,
    start,
    end,
    context: {
      transitionId: id,
      mode,
      startContacts: start.contacts,
      endContacts: end.contacts,
      startControls: start.controls,
      endControls: end.controls,
    },
  }
}

for (const definition of techniqueAnimations) {
  test(`15E dense independent seeking: ${definition.transitionId}`, () => {
    for (const mode of ['gi', 'no_gi'] as const) {
      const { start, end, context } = scenario(definition.transitionId, mode)
      const compiled = getTechniqueAnimation(definition.transitionId)!
      const solve = (progress: number) => resolveTechniqueSkeletons(
        compiled, start.poses, end.poses, progress, context,
      )
      const metrics = sampleDenseContinuity(solve)
      assert.ok(metrics.joint <= 5, `${mode}: ${JSON.stringify(metrics)}`)
      assert.ok(metrics.endEffector <= 5)
      assert.ok(metrics.root <= 5)
      const progressValues = [0, 0.02, 0.25, 0.5, 0.75, 0.98, 1]
      const expected = progressValues.map(solve)
      progressValues.forEach((progress, index) => {
        solve(1 - progress)
        assert.deepEqual(solve(progress), expected[index])
      })
    }
  })
}

test('constrained interpolation crosses zero instead of the forbidden seam', () => {
  const { start } = scenario(techniqueAnimations[0].transitionId, 'gi')
  const base = grapplerPoseToSkeleton(start.poses.playerA)
  const a = {
    ...base,
    joints: {
      ...base.joints,
      leftShoulder: { ...base.joints.leftShoulder, rotation: 160 },
    },
  }
  const b = {
    ...base,
    joints: {
      ...base.joints,
      leftShoulder: { ...base.joints.leftShoulder, rotation: -160 },
    },
  }
  assert.equal(interpolateSkeletonPose(a, b, 0.5).joints.leftShoulder.rotation, 0)
  assert.deepEqual(interpolateSkeletonPose(a, b, 0), a)
  assert.deepEqual(interpolateSkeletonPose(a, b, 1), b)
})

test('mixed graph sequences and history reconstruct frames without leaked state', () => {
  const kinds = new Set<string>()
  for (const definition of techniqueAnimations) {
    for (const mode of ['gi', 'no_gi'] as const) {
      const edge = dataset.positional_transitions.find(
        entry => entry.id === definition.transitionId,
      )!
      const next = dataset.positional_transitions.filter(entry =>
        entry.source_position === edge.destination_position &&
        getPositionVisual(entry.destination_position),
      )
      for (const following of next) {
        const followingKind = getTechniqueAnimation(following.id)
          ? 'technique'
          : 'legacy'
        kinds.add(`technique->${followingKind}`)
        const a = scenario(edge.id, mode)
        const b = scenario(following.id, mode)
        const sample = (value: ReturnType<typeof scenario>, progress: number) =>
          resolveTransitionPoses(
            resolveTransitionAnimation(value.context.transitionId).recipe,
            value.start.poses,
            value.end.poses,
            progress,
            value.context,
          )
        const original = sample(a, 0.4)
        sample(b, 0.8)
        sample(b, 0)
        sample(b, 1)
        const historical = getHistoricalTransition(a.states, [edge.id], 0)!
        const replayStart = resolveStateVisual(historical.startState)!
        const replayEnd = resolveStateVisual(historical.endState)!
        assert.deepEqual(
          resolveTransitionPoses(
            resolveTransitionAnimation(edge.id).recipe,
            replayStart.poses,
            replayEnd.poses,
            0.4,
            a.context,
          ),
          original,
        )
        assert.deepEqual(sample(a, 0.4), original)
        assert.deepEqual(sample(a, 1), sample(b, 0))
        if (!getTechniqueAnimation(following.id)) kinds.add('legacy->technique')
      }
    }
  }
  assert.deepEqual(
    [...kinds].sort(),
    ['legacy->technique', 'technique->legacy', 'technique->technique'],
  )
})

test('opposite graph orientations preserve fixed A/B assignments', () => {
  for (const position_id of [
    'mount_bottom', 'open_guard_top', 'mount_top', 'open_guard_bottom',
  ]) {
    const state: GrapplingStateResponse = {
      position_id,
      mode: 'gi',
      active_controls: [{
        control_id: 'wrist_control', owner: 'player_b', target: 'player_a',
      }],
    }
    const resolved = resolveStateVisual(state)!
    assert.equal(resolved.controls[0].controller, 'playerB')
    assert.equal(resolved.controls[0].opponent, 'playerA')
    assert.equal(resolved.displayState.positionId, position_id)
    assert.notDeepEqual(resolved.poses.playerA, resolved.poses.playerB)
    assert.deepEqual(resolveStateVisual(structuredClone(state)), resolved)
  }
})

test('folded two-bone reach preserves either selected bend branch', () => {
  const { start } = scenario(techniqueAnimations[0].transitionId, 'gi')
  const skeleton = grapplerPoseToSkeleton(start.poses.playerA)
  const chain = twoBoneIKChains.leftLeg
  const root = resolveSkeletonPose(skeleton).joints[chain.root]
  for (const bendDirection of ['positive', 'negative'] as const) {
    for (const y of [-1e-8, 0, 1e-8]) {
      const result = solveTwoBoneIK({
        skeleton,
        chain,
        bendDirection,
        target: { x: root.x + 1, y: root.y + y },
      })
      assert.ok(result.ok)
      assert.equal(result.reach, 'too-close')
      assert.equal(
        Math.sign(result.skeleton.joints.leftKnee.rotation),
        bendDirection === 'positive' ? -1 : 1,
      )
    }
  }
})

test('butterfly incoming underhook stays continuous through folded reach', () => {
  const { start, end, context } = scenario(techniqueAnimations[0].transitionId, 'gi')
  const compiled = getTechniqueAnimation(techniqueAnimations[0].transitionId)!
  const metrics = sampleDenseContinuity(progress => resolveTechniqueSkeletons(
    compiled,
    start.poses,
    end.poses,
    progress,
    {
      ...context,
      startControls: [{
        controlId: 'underhook', controller: 'playerA', opponent: 'playerB',
      }],
    },
  ))
  assert.ok(metrics.joint <= 5, JSON.stringify(metrics))
})
