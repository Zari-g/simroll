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
import { authoredAnimationRecipes } from '../src/grappling/animationRecipes/recipes.ts'
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
  const mount = getAnimationRecipe('mount_bottom_elbow_knee_escape_to_half_guard')
  const sideControl = getAnimationRecipe('side_control_bottom_elbow_escape_to_closed_guard')
  assert.ok(mount)
  assert.ok(sideControl)
  assert.equal(mount.family, 'escape.hip')
  assert.equal(sideControl.family, 'escape.hip')
  assert.notDeepEqual(mount.phases, sideControl.phases)
})

test('12F families validate parameters, compile deterministically, mirror, and serve multiple transitions', () => {
  for (const familyId of [
    'pass.pressure',
    'guard.recovery',
    'advance.spinBehind',
    'backTake.rotation',
  ]) {
    const authorings = authoredAnimationRecipes.filter(
      (entry): entry is FamilyBackedAnimationRecipe =>
        'familyId' in entry && entry.familyId === familyId,
    )
    assert.ok(authorings.length >= 2, `${familyId} should be reused`)
    const first = compileFamilyRecipe(authorings[0])
    assert.deepEqual(first, compileFamilyRecipe(authorings[0]))
    assert.equal(first.family, familyId)
    assert.notDeepEqual(first.phases, compileFamilyRecipe(authorings[1]).phases)

    const paramsWithoutSide = Object.fromEntries(
      Object.entries(authorings[0].params).filter(([name]) => name !== 'side'),
    )
    assert.throws(
      () => compileFamilyRecipe({ ...authorings[0], params: paramsWithoutSide }),
      /required parameter "side"/,
    )
    const numericParameter = Object.entries(authorings[0].params)
      .find(([, value]) => typeof value === 'number')?.[0]
    assert.ok(numericParameter)
    assert.throws(() => compileFamilyRecipe({
      ...authorings[0],
      params: { ...authorings[0].params, [numericParameter]: Number.NaN },
    }), /must be number/)
    const side = authorings[0].params.side
    assert.ok(side === 'left' || side === 'right')
    const mirrored = compileFamilyRecipe({
      ...authorings[0],
      transitionId: `${authorings[0].transitionId}:mirrored`,
      params: { ...authorings[0].params, side: side === 'left' ? 'right' : 'left' },
    })
    assert.notDeepEqual(first.phases, mirrored.phases)
  }
})

test('family-backed recipes preserve endpoints, constraints, and control lifecycle', () => {
  const recipe = getAnimationRecipe('closed_guard_bottom_hip_bump_to_mount_top')
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
  const butterfly = getAnimationRecipe('open_guard_bottom_butterfly_sweep_to_side_control_top')
  assert.ok(butterfly)
  assert.equal(butterfly.family, undefined)
  assert.equal(butterfly.recipeId, 'butterfly-sweep-v1')
})
