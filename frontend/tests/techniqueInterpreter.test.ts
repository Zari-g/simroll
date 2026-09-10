import assert from 'node:assert/strict'
import test from 'node:test'
import { compileTechniqueAnimation, interpretTechniqueAnimation, normalizePhaseTiming } from '../src/grappling/techniqueInterpreter.ts'
import { getTechniqueAnimation, techniqueGrips } from '../src/grappling/techniqueAnimationRegistry.ts'
import { techniqueAnimations } from '../src/grappling/techniqueAnimations.ts'
import type { TechniqueAnimationDefinition } from '../src/grappling/techniqueAnimationTypes.ts'
import type { MotionPrimitive } from '../src/grappling/motionPrimitives.ts'
import { resolveTechniqueFrameInputs, resolveTechniqueSkeletons } from '../src/grappling/techniqueRuntime.ts'
import { resolveTransitionPoses, interpolateGrapplerPose, easeInOutCubic, interpolateSkeletonPose } from '../src/grappling/interpolatePose.ts'
import { resolveTransitionAnimation } from '../src/grappling/animationRecipes/resolver.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'
import { grapplerPoseToSkeleton, resolveSkeletonPose, skeletonToGrapplerPose } from '../src/grappling/kinematics.ts'
import { resolveGrapplerPairFrame } from '../src/grappling/resolveGrapplerPairFrame.ts'
import { hasFiniteGeometry, jointConstraintsAreValid, maxBoneLengthDrift, maxSolvedGeometryDelta } from '../src/grappling/validationMetrics.ts'

const definition: TechniqueAnimationDefinition = {
  transitionId: 'test', phases: [
    { id: 'first', duration: 1, easing: 'linear', playerA: { primitives: [{ type: 'reach', side: 'right', path: 'under', amount: 16, bend: 8 }] } },
    { id: 'second', duration: 2, playerB: { primitives: [{ type: 'offBalance', direction: 'forward', amount: 12, turn: 8 }] } },
    { id: 'last', duration: 1 },
  ],
}
const validation = { transitionIds: new Set(['test']), positionIds: new Set(['mount_top']) }
const compiled = compileTechniqueAnimation(definition, validation)
const context = { mode: 'gi' as const, grips: techniqueGrips }
const read = (p: number) => interpretTechniqueAnimation(compiled, p, context)
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)
function poses(id: string) {
  const visual = getPositionVisual(id)!
  return { playerA: visual.playerAPose, playerB: visual.playerBPose }
}
const empty = { startContacts: [], endContacts: [] }

const normalizedCompositions = {
  sweep: [
    { type: 'sitUp', amount: 16, intensity: 0.7 },
    { type: 'hipShift', lateral: 8, intensity: 0.7 },
    { type: 'kneeDrive', side: 'left', hip: 0, knee: -12, intensity: 0.5 },
    { type: 'torsoTurn', chest: 10, intensity: 0.5 },
    { type: 'weightShift', forward: 5, intensity: 0.6 },
  ],
  escape: [
    { type: 'frame', side: 'right', amount: 14, intensity: 0.7 },
    { type: 'hipEscape', side: 'left', distance: 10, intensity: 0.6 },
    { type: 'kneeInsert', side: 'left', amount: 12, intensity: 0.6 },
    { type: 'bodyRotation', amount: -12, intensity: 0.5 },
  ],
  pass: [
    { type: 'postHand', side: 'left', shoulder: 12, elbow: -6, intensity: 0.5 },
    { type: 'kneeDrive', side: 'right', hip: -12, knee: 10, intensity: 0.7 },
    { type: 'weightShift', forward: 6, intensity: 0.6 },
    { type: 'torsoTurn', chest: 8, intensity: 0.5 },
  ],
} as const satisfies Record<string, readonly MotionPrimitive[]>

test('sweep, escape and pass compositions isolate either owner and survive seeking and endpoints', () => {
  const start = poses('open_guard_bottom'), end = poses('side_control_top')
  const snapshot = structuredClone({ start, end })
  const baseline = compileTechniqueAnimation({ transitionId: 'test', phases: [{ id: 'motion', duration: 1 }] }, validation)
  for (const primitives of Object.values(normalizedCompositions)) for (const owner of ['playerA', 'playerB'] as const) {
    const other = owner === 'playerA' ? 'playerB' : 'playerA'
    const program = compileTechniqueAnimation({ transitionId: 'test', phases: [{ id: 'motion', duration: 1, [owner]: { primitives } }] }, validation)
    const sample = (progress: number) => resolveTechniqueFrameInputs(program, start, end, progress, empty).skeletons
    const middle = sample(0.5)
    const neutral = resolveTechniqueFrameInputs(baseline, start, end, 0.5, empty).skeletons
    assert.deepEqual(middle[other], neutral[other])
    assert.notDeepEqual(middle[owner], neutral[owner])
    for (const progress of [0.9, 0.1, 0.7, 0.5]) {
      const solved = resolveTechniqueSkeletons(program, start, end, progress, empty)
      assert.ok(hasFiniteGeometry(solved))
      assert.ok(jointConstraintsAreValid(solved))
      assert.ok(maxBoneLengthDrift(solved, middle) < 1e-8)
    }
    assert.deepEqual(sample(0.5), middle)
    assert.deepEqual(resolveTechniqueSkeletons(program, start, end, 0, empty), { playerA: grapplerPoseToSkeleton(start.playerA), playerB: grapplerPoseToSkeleton(start.playerB) })
    assert.deepEqual(resolveTechniqueSkeletons(program, start, end, 1, empty), { playerA: grapplerPoseToSkeleton(end.playerA), playerB: grapplerPoseToSkeleton(end.playerB) })
  }
  assert.deepEqual({ start, end }, snapshot)
})

test('weighted timing preserves order, endpoints, exact boundaries and local progress', () => {
  assert.deepEqual(compiled.timing, [{ start: 0, end: 0.25 }, { start: 0.25, end: 0.75 }, { start: 0.75, end: 1 }])
  assert.deepEqual(normalizePhaseTiming([{ duration: 0.3 }, { duration: 0.6 }, { duration: 0.3 }]), compiled.timing)
  assert.equal(read(0).phaseId, 'first'); assert.equal(read(0).phaseProgress, 0)
  assert.equal(read(1).phaseId, 'last'); assert.equal(read(1).phaseProgress, 1)
  for (const [p, index] of [[0.25, 1], [0.75, 2]]) {
    assert.equal(read(p).phaseIndex, index); assert.equal(read(p).phaseProgress, 0)
    assert.equal(read(p - 1e-12).phaseIndex, index - 1)
  }
  near(read(0.5).phaseProgress, 0.5)
  assert.deepEqual(read(-Infinity), read(0)); assert.deepEqual(read(Infinity), read(1)); assert.deepEqual(read(NaN), read(0))
})

test('compilation validates once, snapshots immutably, and rejects invalid or raw authoring', () => {
  for (const duration of [0, -1, NaN, Infinity]) assert.throws(() => compileTechniqueAnimation({ ...definition, phases: [{ id: 'bad', duration }] }, validation))
  assert.throws(() => normalizePhaseTiming([{ duration: 1 }, { duration: Number.MIN_VALUE }]), /too small/)
  assert.throws(() => compileTechniqueAnimation({ ...definition, transitionId: 'unknown' }, validation))
  // @ts-expect-error Raw authoring cannot bypass compilation.
  assert.throws(() => interpretTechniqueAnimation(definition, 0, context), /Compile/)
  assert.notEqual(compiled.definition, definition)
  assert.ok(Object.isFrozen(compiled.definition.phases[0]))
  assert.deepEqual(compiled.definition, definition)
})

test('active actions retain parameters and fixed identities, with raw and eased progress', () => {
  assert.deepEqual(read(0.125).playerA, definition.phases[0].playerA)
  assert.deepEqual(read(0.125).playerB, {})
  assert.equal(read(0.125).easedPhaseProgress, 0.5)
  assert.deepEqual(read(0.375).playerB, definition.phases[1].playerB)
  assert.deepEqual(read(0.375).playerA, {})
  assert.equal(read(0.375).phaseProgress, 0.25)
  assert.equal(read(0.375).easedPhaseProgress, 0.0625)
  const escape = interpretTechniqueAnimation(getTechniqueAnimation(techniqueAnimations[2].transitionId)!, 0.5, context)
  assert.equal(escape.playerB.primitives?.[0].type, 'hipEscape')
  assert.deepEqual(escape.playerA, {})
  assert.equal(escape.relationships[0].contact.source.grapplerId, 'playerB')
  assert.equal(escape.relationships[0].contact.target.grapplerId, 'playerA')
})

test('control lifecycle replays from authoritative entry state without inventing preserved controls', () => {
  const technique = getTechniqueAnimation(techniqueAnimations[0].transitionId)!
  const initial = [{ controlId: 'wrist_control', controller: 'playerA' as const, opponent: 'playerB' as const, side: 'right' as const, strength: 0.4 }]
  const snapshot = structuredClone(initial)
  const sample = (p: number) => interpretTechniqueAnimation(technique, p, { ...context, controls: initial })
  assert.deepEqual(sample(0).controls.map(c => c.controlId), ['wrist_control', 'butterfly_hook'])
  assert.equal(sample(0.5).controls[0].strength, 0.4)
  assert.ok(sample(0.5).controls.some(c => c.controlId === 'butterfly_hook'))
  assert.ok(!sample(5 / 7).controls.some(c => c.controlId === 'butterfly_hook'))
  const beforeSeek = sample(0.2)
  sample(0.9); assert.deepEqual(sample(0.2), beforeSeek)
  assert.deepEqual(initial, snapshot)
  assert.ok(!sample(0).controls.some(c => c.controlId === 'sleeve_grip'))
})

test('canonical No-Gi filtering applies to acquired, preserved and incoming controls and gated relationships', () => {
  const participants = { controller: 'playerB' as const, opponent: 'playerA' as const }
  const restricted: TechniqueAnimationDefinition = { transitionId: 'test', phases: [{ id: 'acquire', duration: 1,
    controls: [
      { ...participants, controlId: 'collar_grip', action: 'acquire', modes: ['gi', 'no_gi'] },
      { ...participants, controlId: 'sleeve_grip', action: 'preserve' },
      { ...participants, controlId: 'wrist_control', action: 'acquire' },
      { ...participants, controlId: 'underhook', action: 'acquire', modes: ['gi'] },
    ],
    relationalTargets: [{ ...participants, id: 'collar-target', controlId: 'collar_grip', contacts: [{ id: 'hand', type: 'grip', source: { participant: 'controller', landmark: 'hand' }, target: { participant: 'opponent', landmark: 'chest' } }] }],
  }] }
  const program = compileTechniqueAnimation(restricted, validation)
  const controls = [{ ...participants, controlId: 'sleeve_grip' }]
  const gi = interpretTechniqueAnimation(program, 0.5, { ...context, controls })
  const noGi = interpretTechniqueAnimation(program, 0.5, { ...context, mode: 'no_gi', controls })
  assert.equal(gi.controls.length, 4); assert.equal(gi.relationships.length, 1)
  assert.deepEqual(noGi.controls.map(c => c.controlId), ['wrist_control']); assert.deepEqual(noGi.relationships, [])
})

test('relationships and grounding resolve directly to existing solver contracts', () => {
  const technique = getTechniqueAnimation(techniqueAnimations[1].transitionId)!
  const start = poses('half_guard_bottom'), end = poses('side_control_top')
  const inputs = resolveTechniqueFrameInputs(technique, start, end, 0.1, empty)
  assert.equal(inputs.intent.relationships[0].relationalAnchor, 'hand-to-grip-target')
  assert.equal(inputs.intent.relationships[0].contact.source.bodyPart, 'rightHand')
  assert.equal(inputs.intent.relationships[0].contact.target.bodyPart, 'leftShin')
  const expectedY = resolveSkeletonPose(grapplerPoseToSkeleton(start.playerB)).joints.leftAnkle.y
  near(inputs.grounding.playerB!.leftAnkle!.baselineY, expectedY)
  assert.deepEqual(resolveTechniqueSkeletons(technique, start, end, 0.1, empty), resolveGrapplerPairFrame(inputs))
  const later = resolveTechniqueFrameInputs(technique, start, end, 0.5, empty)
  assert.deepEqual(later.grounding, {}); assert.deepEqual(later.intent.relationships, [])
  assert.equal(resolveTechniqueFrameInputs(technique, start, end, 0.9, empty).intent.targetPosition, 'side_control_top')
})

test('phase target anchors affect geometry and final-phase primitives execute without endpoint drift', () => {
  const start = poses('open_guard_bottom'), end = poses('side_control_top')
  const anchored = compileTechniqueAnimation({ transitionId: 'test', phases: [
    { id: 'anchor', duration: 1, targetPosition: 'mount_top' },
    { id: 'settle', duration: 1, playerB: { primitives: [{ type: 'baseAdjust', forward: 12 }] } },
  ] }, validation)
  const boundary = resolveTechniqueFrameInputs(anchored, start, end, 0.5, empty)
  assert.deepEqual(boundary.skeletons.playerA, grapplerPoseToSkeleton(poses('mount_top').playerA))
  const without = compileTechniqueAnimation({ transitionId: 'test', phases: [
    { id: 'anchor', duration: 1, targetPosition: 'mount_top' }, { id: 'settle', duration: 1 },
  ] }, validation)
  assert.notDeepEqual(resolveTechniqueFrameInputs(anchored, start, end, 0.75, empty).skeletons.playerB, resolveTechniqueFrameInputs(without, start, end, 0.75, empty).skeletons.playerB)
  assert.deepEqual(resolveTechniqueSkeletons(anchored, start, end, 1, empty).playerB, grapplerPoseToSkeleton(end.playerB))
})

test('all three definitions execute through production playback, preserve endpoints and remain deterministic', () => {
  const sources = ['open_guard_bottom', 'half_guard_bottom', 'back_control_top']
  const destinations = ['side_control_top', 'side_control_top', 'half_guard_bottom']
  techniqueAnimations.forEach((definition, index) => {
    const technique = getTechniqueAnimation(definition.transitionId)!
    const recipe = resolveTransitionAnimation(definition.transitionId).recipe!
    const start = poses(sources[index]), end = poses(destinations[index])
    const snapshot = structuredClone({ start, end, definition })
    for (const mode of ['gi', 'no_gi'] as const) {
      const contacts = { ...empty, mode, transitionId: definition.transitionId }
      assert.deepEqual(resolveTransitionPoses(recipe, start, end, 0, contacts), start)
      assert.deepEqual(resolveTransitionPoses(recipe, start, end, 1, contacts), end)
      for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const solved = resolveTechniqueSkeletons(technique, start, end, p, contacts)
        const actual = resolveTransitionPoses(recipe, start, end, p, contacts)
        assert.deepEqual(actual, { playerA: skeletonToGrapplerPose(solved.playerA), playerB: skeletonToGrapplerPose(solved.playerB) })
        // Technique selection works even without an old recipe.
        assert.deepEqual(resolveTransitionPoses(null, start, end, p, contacts), actual)
        assert.ok(hasFiniteGeometry(solved)); assert.ok(jointConstraintsAreValid(solved))
        assert.ok(maxBoneLengthDrift(solved, { playerA: grapplerPoseToSkeleton(start.playerA), playerB: grapplerPoseToSkeleton(start.playerB) }) < 1e-8)
        assert.deepEqual(resolveTechniqueSkeletons(technique, start, end, p, contacts), solved)
      }
    }
    for (const range of technique.timing.slice(0, -1)) {
      const before = resolveTechniqueFrameInputs(technique, start, end, range.end - 1e-8, empty)
      const after = resolveTechniqueFrameInputs(technique, start, end, range.end, empty)
      assert.ok(maxSolvedGeometryDelta(before.skeletons, after.skeletons) < 0.001)
    }
    assert.deepEqual({ start, end, definition }, snapshot)
  })
})

test('unmigrated recipes and plain interpolation retain the legacy fallback path', () => {
  const start = poses('open_guard_bottom'), end = poses('side_control_top')
  assert.equal(getTechniqueAnimation('unmigrated'), null)
  const actual = resolveTransitionPoses(null, start, end, 0.4, { ...empty, transitionId: 'unmigrated' })
  assert.deepEqual(actual, { playerA: interpolateGrapplerPose(start.playerA, end.playerA, easeInOutCubic(0.4)), playerB: interpolateGrapplerPose(start.playerB, end.playerB, easeInOutCubic(0.4)) })
  const recipe = resolveTransitionAnimation('open_guard_bottom_butterfly_sweep_to_side_control_top').recipe!
  const legacy = { ...recipe, transitionId: 'unmigrated' }
  assert.deepEqual(resolveTransitionPoses(legacy, start, end, 0.4), resolveTransitionPoses(recipe, start, end, 0.4, { ...empty, transitionId: 'unmigrated' }))
  assert.notDeepEqual(resolveTransitionPoses(legacy, start, end, 0.4), resolveTransitionPoses(recipe, start, end, 0.4))
})

test('transition-blend grounding follows the interpolated skeleton and bindings ease at boundaries', () => {
  const technique = getTechniqueAnimation(techniqueAnimations[0].transitionId)!
  const start = poses('open_guard_bottom'), end = poses('side_control_top')
  const inputs = resolveTechniqueFrameInputs(technique, start, end, 0.5, empty)
  const baseline = interpolateSkeletonPose(grapplerPoseToSkeleton(start.playerA), grapplerPoseToSkeleton(end.playerA), 0.5)
  near(inputs.grounding.playerA!.pelvis!.baselineY, resolveSkeletonPose(baseline).joints.pelvis.y)
  assert.equal(inputs.intent.constraintInfluence, 1)
  const boundary = resolveTechniqueFrameInputs(technique, start, end, 2 / 7, empty)
  assert.equal(boundary.intent.constraintInfluence, 0)
  assert.ok(boundary.intent.controls.some(control => control.controlId === 'butterfly_hook'))
  assert.ok(boundary.contactTargets.every(target => target.strength === 0))
  near(boundary.grounding.playerA!.pelvis!.baselineY, resolveSkeletonPose(boundary.skeletons.playerA).joints.pelvis.y)
})
