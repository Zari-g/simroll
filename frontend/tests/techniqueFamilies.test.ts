import assert from 'node:assert/strict'
import test from 'node:test'

import {
  compileFamilyRecipe,
  createTechniqueFamilyRegistry,
  getTechniqueFamily,
  techniqueFamilyRegistry,
} from '../src/grappling/animationRecipes/familyRegistry.ts'
import type { FamilyBackedAnimationRecipe } from '../src/grappling/animationRecipes/types.ts'
import { getAnimationRecipe } from '../src/grappling/animationRecipes/registry.ts'
import {
  resolveTransitionContactTargets,
  resolveTransitionSkeletonKeyframes,
} from '../src/grappling/interpolatePose.ts'
import { validateSkeletonPose } from '../src/grappling/poseValidation.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'

const rightEscape: FamilyBackedAnimationRecipe = {
  transitionId: 'right_escape_test',
  familyId: 'escape.hip',
  params: { side: 'right', escapeDistance: 24 },
}

test('family registry supports known and unknown lookup, deep immutability, and duplicate rejection', () => {
  const family = getTechniqueFamily('escape.hip')
  assert.ok(family)
  assert.equal(family, techniqueFamilyRegistry['escape.hip'])
  assert.equal(getTechniqueFamily('not-a-family'), null)
  assert.ok(Object.isFrozen(techniqueFamilyRegistry))
  assert.ok(Object.isFrozen(family))
  assert.ok(Object.isFrozen(family.phases))
  assert.throws(() => createTechniqueFamilyRegistry([family, family]), /duplicate family ID/)
})

test('family compilation enforces references and required typed parameters', () => {
  assert.throws(() => compileFamilyRecipe({
    transitionId: 'missing_side', familyId: 'escape.hip', params: { escapeDistance: 20 },
  }), /required parameter "side"/)
  assert.throws(() => compileFamilyRecipe({
    transitionId: 'unknown_family', familyId: 'escape.unknown', params: {},
  }), /Unknown technique family/)
  assert.throws(() => compileFamilyRecipe({
    ...rightEscape, params: { ...rightEscape.params, surprise: 1 },
  }), /unknown parameter/)
})

test('compilation is deterministic, parameterized by side, and does not mutate families', () => {
  const family = getTechniqueFamily('escape.hip')
  assert.ok(family)
  const before = structuredClone(family)
  const first = compileFamilyRecipe(rightEscape)
  const second = compileFamilyRecipe(rightEscape)
  const left = compileFamilyRecipe({
    ...rightEscape,
    transitionId: 'left_escape_test',
    params: { side: 'left', escapeDistance: 18 },
  })
  assert.deepEqual(first, second)
  assert.notEqual(first, second)
  assert.deepEqual(family, before)
  assert.equal(first.family, 'escape.hip')
  assert.notDeepEqual(first.phases, left.phases)
  assert.equal(first.phases[1].playerB?.primitives?.[0].type, 'hipEscape')
  assert.deepEqual(first.phases[1].playerB?.primitives?.[0], {
    type: 'hipEscape', side: 'right', distance: 24, turn: 18,
  })
  assert.deepEqual(left.phases[1].playerB?.primitives?.[0], {
    type: 'hipEscape', side: 'left', distance: 18, turn: 18,
  })
})

test('distinct transitions reuse one family and compile different choreography', () => {
  const mount = getAnimationRecipe('elbow_escape')
  const sideControl = getAnimationRecipe('side_control_bottom_elbow_escape_to_closed_guard')
  assert.ok(mount)
  assert.ok(sideControl)
  assert.equal(mount.family, 'escape.hip')
  assert.equal(sideControl.family, 'escape.hip')
  assert.notDeepEqual(mount.phases, sideControl.phases)
})

test('family-backed recipes preserve endpoints, constraints, and control lifecycle', () => {
  const recipe = getAnimationRecipe('hip_bump_sweep')
  const startVisual = getPositionVisual('closed_guard_bottom')
  const endVisual = getPositionVisual('mount_top')
  assert.ok(recipe)
  assert.ok(startVisual)
  assert.ok(endVisual)
  const start = { playerA: startVisual.playerAPose, playerB: startVisual.playerBPose }
  const end = { playerA: endVisual.playerAPose, playerB: endVisual.playerBPose }
  const context = {
    startContacts: [], endContacts: [],
    startControls: [{ controlId: 'closed_guard_connection', controller: 'playerA', opponent: 'playerB' }],
    endControls: [{ controlId: 'underhook', controller: 'playerA', opponent: 'playerB', side: 'right' }],
  } as const
  for (const frame of resolveTransitionSkeletonKeyframes(recipe, start, end, context)) {
    assert.equal(validateSkeletonPose(frame.skeletons.playerA).valid, true)
    assert.equal(validateSkeletonPose(frame.skeletons.playerB).valid, true)
  }
  const early = resolveTransitionContactTargets(recipe, context, 0.2)
  const late = resolveTransitionContactTargets(recipe, context, 0.8)
  const strength = (targets: typeof early, controlId: string) =>
    targets.find(({ contact }) => contact.id.includes(`control:${controlId}:`))?.strength ?? 0
  assert.ok(strength(early, 'closed_guard_connection') > strength(late, 'closed_guard_connection'))
  assert.ok(strength(late, 'underhook') > strength(early, 'underhook'))
})

test('explicit recipes compile through the same registry shape', () => {
  const flower = getAnimationRecipe('flower_sweep')
  assert.ok(flower)
  assert.equal(flower.family, undefined)
  assert.equal(flower.recipeId, 'flower-sweep-v1')
})
