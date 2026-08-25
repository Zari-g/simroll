import assert from 'node:assert/strict'
import test from 'node:test'

import {
  FALLBACK_ANIMATION_DURATION_MS,
  createTransitionAnimationResolver,
  getAnimationCoverage,
  resolveTransitionAnimation,
} from '../src/grappling/animationRecipes/resolver.ts'
import type {
  AnimationRecipe,
  AuthoredAnimationRecipe,
  FamilyBackedAnimationRecipe,
} from '../src/grappling/animationRecipes/types.ts'
import {
  resolveTransitionContactTargets,
  resolveTransitionPoses,
} from '../src/grappling/interpolatePose.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'

const sharedTransitionId = 'resolver_precedence_test'
const explicitRecipe: AnimationRecipe = {
  transitionId: sharedTransitionId,
  recipeId: 'explicit-winner',
  durationMs: 640,
  phases: [{ progress: 0.5, playerA: { primitives: [{ type: 'lift', amount: 3 }] } }],
}
const familyRecipe: FamilyBackedAnimationRecipe = {
  transitionId: sharedTransitionId,
  recipeId: 'family-loser',
  familyId: 'escape.hip',
  params: { side: 'right', escapeDistance: 20 },
}

function poses(positionId: string) {
  const visual = getPositionVisual(positionId)
  assert.ok(visual)
  return { playerA: visual.playerAPose, playerB: visual.playerBPose }
}

function assertFinitePoses(value: ReturnType<typeof poses>) {
  for (const pose of Object.values(value)) {
    assert.ok(Number.isFinite(pose.head.x))
    assert.ok(Number.isFinite(pose.head.y))
    for (const segment of Object.values(pose.segments)) {
      assert.ok(Object.values(segment).every(Number.isFinite))
    }
  }
}

test('resolution precedence is explicit, then family, then fallback', () => {
  const resolver = createTransitionAnimationResolver([
    familyRecipe,
    explicitRecipe,
    { ...familyRecipe, transitionId: 'family_only' },
  ] satisfies readonly AuthoredAnimationRecipe[])

  const explicit = resolver.resolve(sharedTransitionId)
  assert.equal(explicit.source, 'explicit')
  assert.equal(explicit.recipe?.recipeId, 'explicit-winner')
  assert.equal(explicit.durationMs, explicitRecipe.durationMs)

  const family = resolver.resolve('family_only')
  assert.equal(family.source, 'family')
  assert.equal(family.recipe?.family, 'escape.hip')
  assert.equal(family.durationMs, family.recipe?.durationMs)

  const fallback = resolver.resolve('not_authored')
  assert.deepEqual(fallback, {
    source: 'fallback',
    recipe: null,
    durationMs: FALLBACK_ANIMATION_DURATION_MS,
  })
})

test('family resolution compiles one immutable deterministic normal recipe', () => {
  const first = resolveTransitionAnimation('closed_guard_bottom_hip_bump_to_mount_top')
  const second = resolveTransitionAnimation('closed_guard_bottom_hip_bump_to_mount_top')
  assert.equal(first.source, 'family')
  assert.ok(first.recipe)
  assert.equal(first, second)
  assert.equal(first.recipe, second.recipe)
  assert.ok(Object.isFrozen(first))
  assert.ok(Object.isFrozen(first.recipe))

  const start = poses('closed_guard_bottom')
  const end = poses('mount_top')
  assert.deepEqual(resolveTransitionPoses(first.recipe, start, end, 0), start)
  assert.deepEqual(resolveTransitionPoses(first.recipe, start, end, 1), end)
  assertFinitePoses(resolveTransitionPoses(first.recipe, start, end, 0.5))
})

test('fallback resolution is deterministic, finite, and preserves exact endpoints', () => {
  const resolved = resolveTransitionAnimation('valid_semantic_transition_without_visuals')
  const start = poses('mount_top')
  const end = poses('side_control_top')
  assert.equal(resolved.source, 'fallback')
  assert.equal(resolved.recipe, null)
  assert.deepEqual(resolveTransitionPoses(resolved.recipe, start, end, 0), start)
  assert.deepEqual(resolveTransitionPoses(resolved.recipe, start, end, 1), end)
  const middle = resolveTransitionPoses(resolved.recipe, start, end, 0.5)
  assert.deepEqual(middle, resolveTransitionPoses(resolved.recipe, start, end, 0.5))
  assertFinitePoses(middle)
})

test('coverage classification uses playback resolution rules', () => {
  assert.equal(getAnimationCoverage('open_guard_bottom_butterfly_sweep_to_side_control_top'), 'explicit')
  assert.equal(getAnimationCoverage('closed_guard_bottom_hip_bump_to_mount_top'), 'family')
  assert.equal(getAnimationCoverage('not_authored'), 'fallback')
})

test('resolved family recipes retain semantic control lifecycle choreography', () => {
  const resolved = resolveTransitionAnimation('closed_guard_bottom_hip_bump_to_mount_top')
  assert.ok(resolved.recipe)
  const context = {
    startContacts: [], endContacts: [],
    startControls: [{ controlId: 'closed_guard_connection', controller: 'playerA', opponent: 'playerB' }],
    endControls: [{ controlId: 'underhook', controller: 'playerA', opponent: 'playerB', side: 'right' }],
  } as const
  const early = resolveTransitionContactTargets(resolved.recipe, context, 0.2)
  const late = resolveTransitionContactTargets(resolved.recipe, context, 0.8)
  const strength = (targets: typeof early, controlId: string) =>
    targets.find(({ contact }) => contact.id.includes(`control:${controlId}:`))?.strength ?? 0
  assert.ok(strength(early, 'closed_guard_connection') > strength(late, 'closed_guard_connection'))
  assert.ok(strength(late, 'underhook') > strength(early, 'underhook'))
})
