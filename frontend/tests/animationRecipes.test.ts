import assert from 'node:assert/strict'
import test from 'node:test'

import {
  animationRecipeRegistry,
  getAnimationRecipe,
} from '../src/grappling/animationRecipes/registry.ts'
import type { AnimationRecipe } from '../src/grappling/animationRecipes/types.ts'
import { validateAnimationRecipe } from '../src/grappling/animationRecipes/validation.ts'
import { resolveTransitionPoses } from '../src/grappling/interpolatePose.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'

const validRecipe: AnimationRecipe = {
  transitionId: 'test_transition',
  durationMs: 500,
  phases: [
    {
      progress: 0.5,
      baseProgress: 0.4,
      playerA: { primitives: [{ type: 'hipShift', forward: 4 }] },
    },
  ],
}

function poses(positionId: string) {
  const visual = getPositionVisual(positionId)
  assert.ok(visual)
  return { playerA: visual.playerAPose, playerB: visual.playerBPose }
}

test('registry resolves known recipes, returns null for unknown transitions, and is immutable', () => {
  const recipe = getAnimationRecipe('hip_bump_sweep')
  assert.ok(recipe)
  assert.equal(recipe, animationRecipeRegistry.hip_bump_sweep)
  assert.equal(getAnimationRecipe('not_authored'), null)
  assert.ok(Object.isFrozen(animationRecipeRegistry))
  assert.ok(Object.isFrozen(recipe))
  assert.ok(Object.isFrozen(recipe.phases))
  assert.throws(() => {
    ;(recipe.phases as AnimationRecipe['phases'] & unknown[]).push(validRecipe.phases[0])
  }, TypeError)
  assert.equal(getAnimationRecipe('hip_bump_sweep'), recipe)
})

test('valid recipes pass focused validation', () => {
  assert.equal(validateAnimationRecipe(validRecipe), validRecipe)
})

test('validation rejects invalid duration and phase progress', () => {
  assert.throws(
    () => validateAnimationRecipe({ ...validRecipe, durationMs: 0 }),
    /durationMs/,
  )
  assert.throws(
    () => validateAnimationRecipe({ ...validRecipe, phases: [{ progress: 1 }] }),
    /progress/,
  )
})

test('validation rejects malformed primitive data', () => {
  const malformed = {
    ...validRecipe,
    phases: [{
      progress: 0.5,
      playerA: { primitives: [{ type: 'bridge', lift: Number.NaN }] },
    }],
  } as AnimationRecipe
  assert.throws(() => validateAnimationRecipe(malformed), /lift must be finite/)
})

test('validation rejects duplicate and out-of-order phases', () => {
  for (const phases of [
    [{ progress: 0.4 }, { progress: 0.4 }],
    [{ progress: 0.7 }, { progress: 0.3 }],
  ]) {
    assert.throws(
      () => validateAnimationRecipe({ ...validRecipe, phases }),
      /strictly ordered and unique/,
    )
  }
})

test('migrated recipes preserve endpoints and deterministic finite intermediate poses', () => {
  const endpoints = {
    hip_bump_sweep: ['closed_guard_bottom', 'mount_top'],
    flower_sweep: ['closed_guard_bottom', 'mount_top'],
    elbow_escape: ['mount_top', 'closed_guard_bottom'],
    mount_to_side_control: ['mount_top', 'side_control_top'],
  } as const
  for (const [transitionId, [startId, endId]] of Object.entries(endpoints)) {
    const start = poses(startId)
    const end = poses(endId)
    const recipe = getAnimationRecipe(transitionId)
    assert.ok(recipe)
    assert.deepEqual(resolveTransitionPoses(recipe, start, end, 0), start)
    assert.deepEqual(resolveTransitionPoses(recipe, start, end, 1), end)
    const first = resolveTransitionPoses(recipe, start, end, 0.5)
    const second = resolveTransitionPoses(recipe, start, end, 0.5)
    assert.deepEqual(first, second)
    for (const pose of [first.playerA, first.playerB]) {
      assert.ok(Number.isFinite(pose.head.x))
      assert.ok(Number.isFinite(pose.head.y))
      for (const segment of Object.values(pose.segments)) {
        assert.ok(Object.values(segment).every(Number.isFinite))
      }
    }
  }
})

test('missing recipes use safe interpolation and preserve exact endpoints', () => {
  const start = poses('mount_top')
  const end = poses('side_control_top')
  assert.deepEqual(resolveTransitionPoses(null, start, end, 0), start)
  assert.deepEqual(resolveTransitionPoses(null, start, end, 1), end)
  const middle = resolveTransitionPoses(null, start, end, 0.5)
  assert.deepEqual(middle, resolveTransitionPoses(null, start, end, 0.5))
  assert.notDeepEqual(middle, start)
  assert.notDeepEqual(middle, end)
})
