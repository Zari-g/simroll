import assert from 'node:assert/strict'
import test from 'node:test'

import {
  animationRecipeRegistry,
  getAnimationRecipe,
} from '../src/grappling/animationRecipes/registry.ts'
import type { AnimationRecipe } from '../src/grappling/animationRecipes/types.ts'
import { validateAnimationRecipe } from '../src/grappling/animationRecipes/validation.ts'
import { resolveTransitionPoses } from '../src/grappling/interpolatePose.ts'
import type { MotionPrimitive } from '../src/grappling/motionPrimitives.ts'
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

test('validation accepts every expanded primitive payload', () => {
  const expanded: readonly MotionPrimitive[] = [
    { type: 'hipSwitch', side: 'left', amount: 12 },
    { type: 'hipDrive', distance: 8, lift: 2 },
    { type: 'baseAdjust', forward: 3, rotation: 4 },
    { type: 'postRetract', side: 'right', amount: 10 },
    { type: 'torsoLean', amount: 8, lateral: 3 },
    { type: 'bodyRotation', amount: 10, torsoFollow: 0.2 },
    { type: 'reach', side: 'left', path: 'across', amount: 14 },
    { type: 'retractArm', side: 'right', amount: 9 },
    { type: 'frame', side: 'left', amount: 12 },
    { type: 'armPummel', side: 'right', direction: 'outside', amount: 10 },
    { type: 'armDrag', side: 'left', amount: 11 },
    { type: 'kneeInsert', side: 'right', amount: 13 },
    { type: 'kneeRetract', side: 'left', amount: 9 },
    { type: 'kneeSlide', side: 'right', distance: 10 },
    { type: 'legHook', side: 'left', amount: 12 },
    { type: 'legUnhook', side: 'right', amount: 8 },
    { type: 'step', side: 'left', path: 'around', amount: 11 },
    { type: 'hookElevation', side: 'right', amount: 10 },
    { type: 'push', side: 'left', direction: 'forward', distance: 7 },
    { type: 'pull', direction: 'backward', distance: 6 },
    { type: 'drag', direction: 'left', distance: 5 },
    { type: 'lift', amount: 4 },
    { type: 'follow', direction: 'right', distance: 5 },
    { type: 'dropWeight', amount: 3 },
    { type: 'offBalance', direction: 'left', amount: 6 },
  ]
  const recipe = {
    ...validRecipe,
    phases: [{ progress: 0.5, playerA: { primitives: expanded } }],
  }
  assert.equal(validateAnimationRecipe(recipe), recipe)
})

test('validation rejects invalid expanded primitive parameters and enums', () => {
  const invalidPrimitives = [
    { type: 'reach', side: 'middle', path: 'straight', amount: 10 },
    { type: 'reach', side: 'left', path: 'diagonal', amount: 10 },
    { type: 'step', side: 'right', path: 'through', amount: 10 },
    { type: 'armPummel', side: 'left', direction: 'up', amount: 10 },
    { type: 'follow', direction: 'diagonal', distance: 10 },
    { type: 'kneeSlide', side: 'left', distance: Number.POSITIVE_INFINITY },
    { type: 'dropWeight' },
  ]
  for (const primitive of invalidPrimitives) {
    const malformed = {
      ...validRecipe,
      phases: [{ progress: 0.5, playerA: { primitives: [primitive] } }],
    } as AnimationRecipe
    assert.throws(() => validateAnimationRecipe(malformed))
  }
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
