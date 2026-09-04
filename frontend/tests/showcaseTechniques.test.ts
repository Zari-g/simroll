import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { defaultGrapplerAnatomy } from '../src/grappling/anatomy.ts'
import { createAnimationCoverageReport } from '../src/grappling/animationRecipes/coverage.ts'
import { getAnimationRecipe } from '../src/grappling/animationRecipes/registry.ts'
import { resolveTransitionAnimation } from '../src/grappling/animationRecipes/resolver.ts'
import { resolveContactPoint } from '../src/grappling/contactGeometry.ts'
import { compileControlsToContacts } from '../src/grappling/controlTargets.ts'
import {
  resolveTransitionContactTargets,
  resolveTransitionPoses,
  resolveTransitionSkeletonKeyframes,
  type GrapplerPosePair,
} from '../src/grappling/interpolatePose.ts'
import { grapplerPoseToSkeleton } from '../src/grappling/kinematics.ts'
import { validateSkeletonPose } from '../src/grappling/poseValidation.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'
import type { GrapplerPose, TransitionContactContext } from '../src/grappling/types.ts'

const showcases = {
  open_guard_bottom_butterfly_sweep_to_side_control_top: {
    source: 'open_guard_bottom', destination: 'side_control_top', family: undefined,
  },
  half_guard_bottom_old_school_sweep_to_side_control_top: {
    source: 'half_guard_bottom', destination: 'side_control_top', family: 'sweep.rotation',
  },
  back_control_top_opponent_turn_in_to_half_guard_bottom: {
    source: 'back_control_top', destination: 'half_guard_bottom', family: 'escape.hip',
  },
} as const

const emptyContext: TransitionContactContext = { startContacts: [], endContacts: [] }

function endpoints(sourceId: string, destinationId: string) {
  const source = getPositionVisual(sourceId)
  const destination = getPositionVisual(destinationId)
  assert.ok(source)
  assert.ok(destination)
  return {
    start: { playerA: source.playerAPose, playerB: source.playerBPose },
    end: { playerA: destination.playerAPose, playerB: destination.playerBPose },
  }
}

function distance(left: { x: number; y: number }, right: { x: number; y: number }) {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function pelvis(pose: GrapplerPose) {
  assert.ok(pose.core)
  return pose.core.pelvis
}

function assertFiniteAndValid(pair: GrapplerPosePair) {
  for (const pose of Object.values(pair)) {
    const skeleton = grapplerPoseToSkeleton(pose)
    assert.ok(Number.isFinite(skeleton.root.position.x))
    assert.ok(Number.isFinite(skeleton.root.position.y))
    assert.ok(Object.values(skeleton.joints).every((joint) =>
      Number.isFinite(joint.x) && Number.isFinite(joint.y) && Number.isFinite(joint.rotation),
    ))
  }
}

function assertBoneLengths(pair: GrapplerPosePair, reference: GrapplerPosePair) {
  for (const player of ['playerA', 'playerB'] as const) {
    for (const [name, segment] of Object.entries(pair[player].segments)) {
      if (name === 'torso') continue
      assert.ok(Math.abs(segment.length - reference[player].segments[
        name as keyof GrapplerPose['segments']
      ].length) < 0.001)
    }
  }
}

function maxPointDelta(left: GrapplerPosePair, right: GrapplerPosePair) {
  const deltas: number[] = []
  for (const player of ['playerA', 'playerB'] as const) {
    deltas.push(distance(left[player].head, right[player].head))
    for (const segment of Object.keys(left[player].segments) as (keyof GrapplerPose['segments'])[]) {
      deltas.push(distance(left[player].segments[segment], right[player].segments[segment]))
    }
  }
  return Math.max(...deltas)
}

test('exactly the three canonical showcase recipes are constraint-enhanced', () => {
  const transitionIds = Object.keys(showcases)
  const enhanced = transitionIds.map((transitionId) => {
    const recipe = getAnimationRecipe(transitionId)
    assert.ok(recipe?.constraintEnhancements)
    assert.equal(recipe.family, showcases[transitionId as keyof typeof showcases].family)
    return transitionId
  })
  assert.deepEqual(enhanced.sort(), transitionIds.sort())

  const dataset = JSON.parse(readFileSync(
    new URL('../../data/generated/simroll_bjj_mvp.normalized.json', import.meta.url),
    'utf8',
  )) as { positional_transitions: { id: string; source_position: string; destination_position: string }[] }
  const report = createAnimationCoverageReport(dataset.positional_transitions.map((transition) => ({
    id: transition.id,
    sourcePositionId: transition.source_position,
    destinationPositionId: transition.destination_position,
  })))
  assert.deepEqual(
    { total: report.total, explicit: report.explicit, family: report.family, fallback: report.fallback },
    { total: 65, explicit: 1, family: 27, fallback: 37 },
  )
  assert.equal(report.constraintEnhanced, 3)
  assert.deepEqual(
    report.transitions.filter(({ constraintEnhanced }) => constraintEnhanced).map(({ id }) => id).sort(),
    transitionIds.sort(),
  )
})

test('butterfly hook follows the moving thigh with bounded target error', () => {
  const transitionId = 'open_guard_bottom_butterfly_sweep_to_side_control_top'
  const recipe = getAnimationRecipe(transitionId)
  assert.ok(recipe)
  const { start, end } = endpoints('open_guard_bottom', 'side_control_top')
  const context: TransitionContactContext = {
    startContacts: [], endContacts: [],
    startControls: [{ controlId: 'underhook', controller: 'playerA', opponent: 'playerB' }],
    endControls: [],
  }
  const compiled = compileControlsToContacts([{
    controlId: 'butterfly_hook', controller: 'playerA', opponent: 'playerB', side: 'right',
  }])[0]
  assert.ok(compiled)
  assert.equal(compiled.relationalAnchor, 'foot-to-inner-thigh')
  const withoutHook = {
    ...recipe,
    constraintEnhancements: { ...recipe.constraintEnhancements, controls: [] },
  }

  for (const progress of [0.2, 0.4, 0.6, 0.8]) {
    const frame = resolveTransitionPoses(recipe, start, end, progress, context)
    const baseline = resolveTransitionPoses(withoutHook, start, end, progress, context)
    const geometry = resolveContactPoint(compiled.contact, frame, {
      playerA: defaultGrapplerAnatomy, playerB: defaultGrapplerAnatomy,
    })
    const baselineGeometry = resolveContactPoint(compiled.contact, baseline, {
      playerA: defaultGrapplerAnatomy, playerB: defaultGrapplerAnatomy,
    })
    const error = distance(geometry.source, geometry.target)
    assert.ok(error <= 150, `hook error ${error} exceeded the 150px rig-scale tolerance`)
    assert.ok(error < distance(baselineGeometry.source, baselineGeometry.target))
    assertFiniteAndValid(frame)
  }
})

test('showcases preserve endpoints, bones, determinism, immutability, and connected pair motion', () => {
  for (const [transitionId, definition] of Object.entries(showcases)) {
    const recipe = getAnimationRecipe(transitionId)
    assert.ok(recipe)
    const { start, end } = endpoints(definition.source, definition.destination)
    const snapshot = structuredClone({ start, end })
    assert.deepEqual(resolveTransitionPoses(recipe, start, end, 0), start)
    assert.deepEqual(resolveTransitionPoses(recipe, start, end, 1), end)
    for (const keyframe of resolveTransitionSkeletonKeyframes(recipe, start, end, emptyContext)) {
      assert.equal(validateSkeletonPose(keyframe.skeletons.playerA).valid, true)
      assert.equal(validateSkeletonPose(keyframe.skeletons.playerB).valid, true)
    }
    let previous = resolveTransitionPoses(recipe, start, end, 0.2, emptyContext)
    for (const progress of [0.2, 0.4, 0.6, 0.8]) {
      const frame = resolveTransitionPoses(recipe, start, end, progress, emptyContext)
      assert.deepEqual(frame, resolveTransitionPoses(recipe, start, end, progress, emptyContext))
      assertFiniteAndValid(frame)
      assertBoneLengths(frame, start)
      assert.ok(distance(pelvis(frame.playerA), pelvis(start.playerA)) > 0.5)
      assert.ok(distance(pelvis(frame.playerB), pelvis(start.playerB)) > 0.5)
      assert.ok(distance(pelvis(frame.playerA), pelvis(frame.playerB)) < 190)
      const frameDelta = maxPointDelta(previous, frame)
      assert.ok(frameDelta < 260, `${transitionId} frame delta ${frameDelta} at ${progress}`)
      previous = frame
    }
    assert.deepEqual({ start, end }, snapshot)
  }
})

test('showcase phase overlays stay continuous at their existing boundaries', () => {
  for (const [transitionId, definition] of Object.entries(showcases)) {
    const recipe = getAnimationRecipe(transitionId)
    assert.ok(recipe)
    const { start, end } = endpoints(definition.source, definition.destination)
    for (const { progress } of recipe.constraintEnhancements?.phases ?? []) {
      const before = resolveTransitionPoses(recipe, start, end, progress - 0.001, emptyContext)
      const boundary = resolveTransitionPoses(recipe, start, end, progress, emptyContext)
      const after = resolveTransitionPoses(recipe, start, end, progress + 0.001, emptyContext)
      assert.ok(maxPointDelta(before, boundary) < 5)
      assert.ok(maxPointDelta(boundary, after) < 5)
    }
  }
})

test('showcase controls stay mode-compatible and unsupported seatbelt avoids limb IK', () => {
  for (const transitionId of Object.keys(showcases)) {
    const controls = getAnimationRecipe(transitionId)?.constraintEnhancements?.controls ?? []
    assert.ok(controls.every(({ controlId }) =>
      !['collar_grip', 'sleeve_grip', 'pants_grip'].includes(controlId)))
  }
  const back = getAnimationRecipe('back_control_top_opponent_turn_in_to_half_guard_bottom')
  assert.ok(back)
  const seatbeltTargets = resolveTransitionContactTargets(back, emptyContext, 0.3)
    .filter(({ contact }) => contact.id.includes('control:seatbelt:'))
  assert.ok(seatbeltTargets.length > 0)
  assert.ok(seatbeltTargets.every(({ relationalAnchor }) => relationalAnchor === undefined))

  const pairSolver = readFileSync(
    new URL('../src/grappling/resolveGrapplerPairFrame.ts', import.meta.url),
    'utf8',
  )
  assert.ok(!Object.keys(showcases).some((transitionId) => pairSolver.includes(transitionId)))
  assert.equal(resolveTransitionAnimation(
    'half_guard_bottom_old_school_sweep_to_side_control_top',
    { mode: 'gi' },
  ).recipe, resolveTransitionAnimation(
    'half_guard_bottom_old_school_sweep_to_side_control_top',
    { mode: 'no_gi' },
  ).recipe)
})
