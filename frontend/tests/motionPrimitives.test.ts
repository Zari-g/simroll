import { getTechniqueAnimation } from '../src/grappling/techniqueAnimationRegistry.ts'
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
  motionPrimitiveCatalog,
  type MotionPrimitive,
} from '../src/grappling/motionPrimitives.ts'
import type { AnimationRecipe } from '../src/grappling/animationRecipes/types.ts'
import { validateAnimationRecipe, validateMotionPrimitive } from '../src/grappling/animationRecipes/validation.ts'
import { articulatedPositionSkeletons, getPositionVisual } from '../src/grappling/positionVisuals.ts'
import { validateSkeletonPose } from '../src/grappling/poseValidation.ts'
import { animationRecipeRegistry } from '../src/grappling/animationRecipes/registry.ts'

const establishedPrimitives: readonly MotionPrimitive[] = [
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

const expandedPrimitives: readonly MotionPrimitive[] = [
  { type: 'hipSwitch', side: 'left', amount: 18, drive: 4 },
  { type: 'hipDrive', distance: 9, lift: 3, extension: 6 },
  { type: 'baseAdjust', forward: 4, lateral: -3, rotation: 5 },
  { type: 'postRetract', side: 'right', amount: 16 },
  { type: 'torsoLean', amount: 9, lateral: -4 },
  { type: 'bodyRotation', amount: 12, torsoFollow: 0.25 },
  { type: 'reach', side: 'left', path: 'under', amount: 20, bend: 8 },
  { type: 'retractArm', side: 'right', amount: 14 },
  { type: 'frame', side: 'left', amount: 22, angle: 12 },
  { type: 'armPummel', side: 'right', direction: 'inside', amount: 18 },
  { type: 'armDrag', side: 'left', amount: 16, turn: 5 },
  { type: 'kneeInsert', side: 'right', amount: 18, bend: 14 },
  { type: 'kneeRetract', side: 'left', amount: 15 },
  { type: 'kneeSlide', side: 'right', distance: 12, angle: 9 },
  { type: 'legHook', side: 'left', amount: 17, bend: 20 },
  { type: 'legUnhook', side: 'right', amount: 14 },
  { type: 'step', side: 'left', path: 'over', amount: 19, bend: 12 },
  { type: 'hookElevation', side: 'right', amount: 16, extension: 12 },
  { type: 'push', side: 'left', direction: 'forward', distance: 10 },
  { type: 'pull', side: 'right', direction: 'backward', distance: 9 },
  { type: 'drag', direction: 'left', distance: 8, turn: -4 },
  { type: 'lift', amount: 6, extension: 4 },
  { type: 'follow', direction: 'right', distance: 7 },
  { type: 'dropWeight', amount: 5, lean: 4 },
  { type: 'offBalance', direction: 'left', amount: 8, turn: -6 },
]

const primitives = [...establishedPrimitives, ...expandedPrimitives]

test('canonical inventory is unique, exhaustive, and every payload validates', () => {
  assert.equal(new Set(primitives.map(p => p.type)).size, primitives.length)
  assert.deepEqual(Object.keys(motionPrimitiveCatalog).sort(), primitives.map(p => p.type).sort())
  for (const primitive of primitives) validateMotionPrimitive({ transitionId: 'inventory' }, primitive, primitive.type)
  assert.throws(() => validateMotionPrimitive({ transitionId: 'invalid' }, { type: 'unknown' } as unknown as MotionPrimitive, 'primitive'), /unsupported/)
})

test('intensity has one bounded meaning for every action, including coupled defaults', () => {
  const source = articulatedPositionSkeletons.closed_guard_bottom.playerA
  for (const primitive of primitives) {
    const full = applyMotionPrimitive(source, primitive)
    for (const intensity of [0, 0.5, 1]) {
      const action = { ...primitive, intensity }
      validateMotionPrimitive({ transitionId: 'intensity' }, action, 'primitive')
      const result = applyMotionPrimitive(source, action)
      if (intensity === 0) assert.deepEqual(result, source)
      if (intensity === 1) assert.deepEqual(result, full)
      const near = (actual: number, start: number, end: number) => assert.ok(Math.abs(actual - (start + (end - start) * intensity)) < 1e-10, primitive.type)
      near(result.root.position.x, source.root.position.x, full.root.position.x)
      near(result.root.position.y, source.root.position.y, full.root.position.y)
      near(result.root.rotation, source.root.rotation, full.root.rotation)
      for (const name of Object.keys(source.joints) as (keyof typeof source.joints)[]) near(result.joints[name].rotation, source.joints[name].rotation, full.joints[name].rotation)
    }
    for (const intensity of [-0.1, 1.1, NaN, Infinity]) {
      assert.throws(() => validateMotionPrimitive({ transitionId: 'intensity' }, { ...primitive, intensity }, 'primitive'), /intensity/)
      assert.throws(() => applyMotionPrimitive(source, { ...primitive, intensity }), /intensity/)
    }
  }
})

test('composition results detach every joint even for empty and zero-intensity actions', () => {
  const source = articulatedPositionSkeletons.closed_guard_bottom.playerA
  for (const actions of [[], ...primitives.map(p => [p]), [{ type: 'bridge', lift: 8, intensity: 0 }]] as readonly (readonly MotionPrimitive[])[]) {
    const result = composeMotionPrimitives(source, actions)
    assert.notEqual(result, source)
    assert.notEqual(result.root.position, source.root.position)
    for (const name of Object.keys(source.joints) as (keyof typeof source.joints)[]) assert.notEqual(result.joints[name], source.joints[name])
  }
})

test('root-local directions and semantic compositions preserve their conventions', () => {
  const source = articulatedPositionSkeletons.closed_guard_bottom.playerA
  for (const rotation of [0, 90, -45]) for (const direction of ['forward', 'backward', 'left', 'right'] as const) {
    const pose = { ...source, root: { ...source.root, rotation } }
    const forward = direction === 'forward' ? 8 : direction === 'backward' ? -8 : 0
    const lateral = direction === 'right' ? 8 : direction === 'left' ? -8 : 0
    assert.deepEqual(applyMotionPrimitive(pose, { type: 'follow', direction, distance: 8, intensity: 0.5 }), applyMotionPrimitive(pose, { type: 'hipShift', forward, lateral, intensity: 0.5 }))
    assert.deepEqual(applyMotionPrimitive(pose, { type: 'drag', direction, distance: 8, turn: 4 }), applyMotionPrimitive(pose, { type: 'weightShift', forward, lateral, torso: 4 }))
  }
  assert.deepEqual(applyMotionPrimitive(source, { type: 'lift', amount: 8, extension: 6, intensity: 0.5 }), applyMotionPrimitive(source, { type: 'hipDrive', distance: 0, lift: 8, extension: 6, intensity: 0.5 }))
})

test('authored order rotates subsequent translations and joint deltas add exactly once', () => {
  const source = articulatedPositionSkeletons.closed_guard_bottom.playerA
  const pose = { ...source, root: { position: { x: 0, y: 0 }, rotation: 0 } }
  const turn: MotionPrimitive = { type: 'pelvisRotation', amount: 90 }
  const shift: MotionPrimitive = { type: 'hipShift', forward: 10 }
  const first = composeMotionPrimitives(pose, [turn, shift])
  const reversed = composeMotionPrimitives(pose, [shift, turn])
  assert.ok(Math.abs(first.root.position.x) < 1e-10)
  assert.equal(first.root.position.y, 10)
  assert.deepEqual(reversed.root.position, { x: 10, y: 0 })
  const torso = composeMotionPrimitives(pose, [{ type: 'sitUp', amount: 20, intensity: 0.5 }, { type: 'torsoTurn', chest: 3 }])
  assert.equal(torso.joints.chest.rotation, pose.joints.chest.rotation + 7)
  assert.deepEqual(composeMotionPrimitives(pose, [turn, shift]), first)
})

function assertFiniteSkeleton(skeleton: ReturnType<typeof applyMotionPrimitive>) {
  assert.ok(Object.values(skeleton.root.position).every(Number.isFinite))
  assert.ok(Number.isFinite(skeleton.root.rotation))
  for (const joint of Object.values(skeleton.joints)) {
    assert.ok(Object.values(joint).every(Number.isFinite))
  }
}

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

test('every expanded primitive produces deterministic finite skeleton values', () => {
  const source = articulatedPositionSkeletons.closed_guard_bottom.playerA
  const snapshot = structuredClone(source)

  for (const primitive of expandedPrimitives) {
    const first = applyMotionPrimitive(source, primitive)
    const second = applyMotionPrimitive(source, primitive)
    assert.deepEqual(first, second, primitive.type)
    assertFiniteSkeleton(first)
  }
  assert.deepEqual(source, snapshot)
})

test('side-aware arm, leg, and core primitives isolate and mirror their side', () => {
  const source = articulatedPositionSkeletons.closed_guard_bottom.playerA
  const leftReach = applyMotionPrimitive(source, {
    type: 'reach', side: 'left', path: 'straight', amount: 20,
  })
  const rightReach = applyMotionPrimitive(source, {
    type: 'reach', side: 'right', path: 'straight', amount: 20,
  })
  assert.notEqual(leftReach.joints.leftShoulder.rotation, source.joints.leftShoulder.rotation)
  assert.equal(leftReach.joints.rightShoulder.rotation, source.joints.rightShoulder.rotation)
  assert.notEqual(rightReach.joints.rightShoulder.rotation, source.joints.rightShoulder.rotation)
  assert.equal(rightReach.joints.leftShoulder.rotation, source.joints.leftShoulder.rotation)

  const leftKnee = applyMotionPrimitive(source, {
    type: 'kneeInsert', side: 'left', amount: 16,
  })
  const rightKnee = applyMotionPrimitive(source, {
    type: 'kneeInsert', side: 'right', amount: 16,
  })
  assert.equal(
    leftKnee.joints.leftHip.rotation - source.joints.leftHip.rotation,
    -(rightKnee.joints.rightHip.rotation - source.joints.rightHip.rotation),
  )

  const leftSwitch = applyMotionPrimitive(source, {
    type: 'hipSwitch', side: 'left', amount: 15,
  })
  const rightSwitch = applyMotionPrimitive(source, {
    type: 'hipSwitch', side: 'right', amount: 15,
  })
  assert.equal(
    leftSwitch.root.rotation - source.root.rotation,
    -(rightSwitch.root.rotation - source.root.rotation),
  )
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

const representativeRecipes = [
  {
    label: 'sweep-like',
    sourceId: 'closed_guard_bottom',
    destinationId: 'mount_top',
    recipe: {
      transitionId: 'test_sweep_like', durationMs: 700, phases: [{
        progress: 0.5,
        playerA: { primitives: [
          { type: 'hookElevation', side: 'left', amount: 14 },
          { type: 'hipSwitch', side: 'right', amount: 16 },
          { type: 'pull', side: 'right', direction: 'backward', distance: 9 },
        ] },
        playerB: { primitives: [{ type: 'offBalance', direction: 'left', amount: 8 }] },
      }],
    },
  },
  {
    label: 'guard-pass-like',
    sourceId: 'closed_guard_bottom',
    destinationId: 'side_control_top',
    recipe: {
      transitionId: 'test_pass_like', durationMs: 700, phases: [{
        progress: 0.5,
        playerA: { primitives: [
          { type: 'frame', side: 'left', amount: 14 },
          { type: 'kneeSlide', side: 'right', distance: 10 },
          { type: 'reach', side: 'left', path: 'across', amount: 12 },
          { type: 'dropWeight', amount: 3 },
        ] },
      }],
    },
  },
  {
    label: 'escape-like',
    sourceId: 'mount_top',
    destinationId: 'closed_guard_bottom',
    recipe: {
      transitionId: 'test_escape_like', durationMs: 700, phases: [{
        progress: 0.5,
        playerB: { primitives: [
          { type: 'frame', side: 'right', amount: 13 },
          { type: 'hipDrive', distance: -7, lift: 3 },
          { type: 'kneeInsert', side: 'left', amount: 15 },
          { type: 'follow', direction: 'backward', distance: 5 },
        ] },
      }],
    },
  },
  {
    label: 'positional-advance',
    sourceId: 'mount_top',
    destinationId: 'side_control_top',
    recipe: {
      transitionId: 'test_advance', durationMs: 700, phases: [{
        progress: 0.5,
        playerA: { primitives: [
          { type: 'baseAdjust', forward: 5, lateral: -4 },
          { type: 'step', side: 'left', path: 'around', amount: 12 },
          { type: 'armPummel', side: 'right', direction: 'inside', amount: 10 },
          { type: 'drag', direction: 'forward', distance: 5 },
        ] },
      }],
    },
  },
] as const satisfies readonly {
  readonly label: string
  readonly sourceId: string
  readonly destinationId: string
  readonly recipe: AnimationRecipe
}[]

test('representative recipes compose reusable primitives into valid choreography', () => {
  for (const example of representativeRecipes) {
    const source = getPositionVisual(example.sourceId)
    const destination = getPositionVisual(example.destinationId)
    assert.ok(source, example.label)
    assert.ok(destination, example.label)
    const recipe = validateAnimationRecipe(example.recipe)
    const keyframes = resolveTransitionSkeletonKeyframes(
      recipe,
      { playerA: source.playerAPose, playerB: source.playerBPose },
      { playerA: destination.playerAPose, playerB: destination.playerBPose },
    )
    assert.equal(keyframes.length, recipe.phases.length)
    for (const keyframe of keyframes) {
      assert.equal(validateSkeletonPose(keyframe.skeletons.playerA).valid, true, example.label)
      assert.equal(validateSkeletonPose(keyframe.skeletons.playerB).valid, true, example.label)
      assertFiniteSkeleton(keyframe.skeletons.playerA)
      assertFiniteSkeleton(keyframe.skeletons.playerB)
    }
  }
})

const choreographyEndpoints = {
  closed_guard_bottom_hip_bump_to_mount_top: ['closed_guard_bottom', 'mount_top'],
  open_guard_bottom_butterfly_sweep_to_side_control_top: ['closed_guard_bottom', 'side_control_top'],
  mount_bottom_elbow_knee_escape_to_half_guard: ['mount_top', 'closed_guard_bottom'],
  side_control_top_step_over_to_mount: ['side_control_top', 'mount_top'],
} as const

test('composed choreography preserves endpoints and produces valid phases', () => {
  for (const [transitionId, [sourceId, destinationId]] of Object.entries(
    choreographyEndpoints,
  )) {
    const source = getPositionVisual(sourceId)
    const destination = getPositionVisual(destinationId)
    const transition = animationRecipeRegistry[transitionId]
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
    const transition = animationRecipeRegistry[transitionId]
    assert.ok(source)
    assert.ok(destination)
    const phase = transition.phases[Math.floor(transition.phases.length / 2)]
    const timing = getTechniqueAnimation(transitionId)?.timing
    const middle = timing?.[Math.floor(timing.length / 2)]
    const progress = middle ? (middle.start + middle.end) / 2 : phase.progress
    const choreographed = resolveTransitionPoses(
      transition,
      { playerA: source.playerAPose, playerB: source.playerBPose },
      { playerA: destination.playerAPose, playerB: destination.playerBPose },
      progress,
    )
    // Limb motion and Player B motion also distinguish choreography from a slide.
    const displacement = Math.max(...(['playerA', 'playerB'] as const).flatMap(player => {
      const direct = interpolateGrapplerPose(
        player === 'playerA' ? source.playerAPose : source.playerBPose,
        player === 'playerA' ? destination.playerAPose : destination.playerBPose,
        progress,
      )
      return Object.entries(choreographed[player].segments).map(([name, segment]) => {
        const baseline = direct.segments[name as keyof typeof direct.segments]
        const endpoint = (pose: typeof segment) => ({
          x: pose.x + Math.cos(pose.rotation * Math.PI / 180) * pose.length,
          y: pose.y + Math.sin(pose.rotation * Math.PI / 180) * pose.length,
        })
        const moved = endpoint(segment), original = endpoint(baseline)
        return Math.hypot(moved.x - original.x, moved.y - original.y)
      })
    }))

    assert.ok(displacement > 3, `${transitionId} should not read as a direct slide`)
  }
})

test('authored actions use individually tuned durations and phase timing', () => {
  assert.ok(new Set(Object.values(animationRecipeRegistry).map((item) => item.durationMs)).size > 1)
  for (const transition of Object.values(animationRecipeRegistry)) {
    assert.ok(transition.phases.length >= 3)
    assert.deepEqual(
      transition.phases.map((phase) => phase.progress),
      [...transition.phases].sort((left, right) => left.progress - right.progress).map((phase) => phase.progress),
    )
  }
})
