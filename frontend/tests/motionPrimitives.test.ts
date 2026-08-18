import assert from 'node:assert/strict'
import test from 'node:test'
import {
  interpolateGrapplerPose,
  resolveTransitionPoses,
  resolveTransitionSkeletonKeyframes,
} from '../src/grappling/interpolatePose.ts'
import {
  applyMotionPrimitive,
  composeMotionPrimitives,
  type MotionPrimitive,
} from '../src/grappling/motionPrimitives.ts'
import { articulatedPositionSkeletons, getPositionVisual } from '../src/grappling/positionVisuals.ts'
import { validateSkeletonPose } from '../src/grappling/poseValidation.ts'
import { transitionVisuals } from '../src/grappling/transitionVisuals.ts'

const primitives: readonly MotionPrimitive[] = [
  { type: 'hipShift', forward: 9, lateral: -4 },
  { type: 'hipEscape', side: 'right', distance: 18 },
  { type: 'bridge', lift: 12, extension: 8 },
  { type: 'sitUp', amount: 16, drive: 5 },
  { type: 'postHand', side: 'left', shoulder: 18, elbow: -12 },
  { type: 'torsoTurn', spine: 5, chest: -11 },
  { type: 'pelvisRotation', amount: 14 },
  { type: 'kneeDrive', side: 'right', hip: -20, knee: 16 },
  { type: 'legPummel', side: 'left', hip: 22, knee: -18 },
  { type: 'weightShift', forward: -7, lateral: 8, torso: 6 },
]

test('every motion primitive is deterministic, immutable, and skeleton-based', () => {
  const source = articulatedPositionSkeletons.closed_guard_bottom.playerA
  const snapshot = structuredClone(source)

  for (const primitive of primitives) {
    assert.deepEqual(
      applyMotionPrimitive(source, primitive),
      applyMotionPrimitive(source, primitive),
    )
  }
  assert.deepEqual(source, snapshot)
})

test('motion primitives compose without mutating their input', () => {
  const source = articulatedPositionSkeletons.mount_top.playerB
  const snapshot = structuredClone(source)
  const result = composeMotionPrimitives(source, primitives)

  assert.notDeepEqual(result, source)
  assert.deepEqual(source, snapshot)
  assert.equal(validateSkeletonPose(result).violations.some(
    (violation) => violation.category === 'structure',
  ), false)
})

const choreographyEndpoints = {
  hip_bump_sweep: ['closed_guard_bottom', 'mount_top'],
  flower_sweep: ['closed_guard_bottom', 'mount_top'],
  elbow_escape: ['mount_top', 'closed_guard_bottom'],
  mount_to_side_control: ['mount_top', 'side_control_top'],
} as const

test('composed choreography preserves endpoints and produces valid phases', () => {
  for (const [transitionId, [sourceId, destinationId]] of Object.entries(
    choreographyEndpoints,
  )) {
    const source = getPositionVisual(sourceId)
    const destination = getPositionVisual(destinationId)
    const transition = transitionVisuals[transitionId]
    assert.ok(source)
    assert.ok(destination)
    assert.ok(transition)
    const start = { playerA: source.playerAPose, playerB: source.playerBPose }
    const end = { playerA: destination.playerAPose, playerB: destination.playerBPose }

    assert.deepEqual(resolveTransitionPoses(transition, start, end, 0), start)
    assert.deepEqual(resolveTransitionPoses(transition, start, end, 1), end)

    for (const phase of resolveTransitionSkeletonKeyframes(transition, start, end)) {
      for (const skeleton of [phase.skeletons.playerA, phase.skeletons.playerB]) {
        assert.equal(validateSkeletonPose(skeleton).valid, true)
      }
    }
  }
})

test('authored phases depart meaningfully from direct pose interpolation', () => {
  for (const [transitionId, [sourceId, destinationId]] of Object.entries(
    choreographyEndpoints,
  )) {
    const source = getPositionVisual(sourceId)
    const destination = getPositionVisual(destinationId)
    const transition = transitionVisuals[transitionId]
    assert.ok(source)
    assert.ok(destination)
    const phase = transition.keyframes[Math.floor(transition.keyframes.length / 2)]
    const choreographed = resolveTransitionPoses(
      transition,
      { playerA: source.playerAPose, playerB: source.playerBPose },
      { playerA: destination.playerAPose, playerB: destination.playerBPose },
      phase.progress,
    )
    const direct = interpolateGrapplerPose(
      source.playerAPose,
      destination.playerAPose,
      phase.progress,
    )
    const displacement = Math.hypot(
      choreographed.playerA.segments.torso.x - direct.segments.torso.x,
      choreographed.playerA.segments.torso.y - direct.segments.torso.y,
    )

    assert.ok(displacement > 3, `${transitionId} should not read as a direct slide`)
  }
})

test('authored actions use individually tuned durations and phase timing', () => {
  assert.ok(new Set(Object.values(transitionVisuals).map((item) => item.durationMs)).size > 1)
  for (const transition of Object.values(transitionVisuals)) {
    assert.ok(transition.keyframes.length >= 3)
    assert.deepEqual(
      transition.keyframes.map((phase) => phase.progress),
      [...transition.keyframes].sort((left, right) => left.progress - right.progress).map((phase) => phase.progress),
    )
  }
})
