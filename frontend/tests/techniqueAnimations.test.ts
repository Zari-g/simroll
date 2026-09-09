import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { techniqueAnimations } from '../src/grappling/techniqueAnimations.ts'
import { validateTechniqueAnimationDefinition } from '../src/grappling/techniqueAnimationValidation.ts'
import type { TechniqueAnimationDefinition, TechniqueAnimationPhase, RelationalTargetDefinition, TechniqueParticipants } from '../src/grappling/techniqueAnimationTypes.ts'
import type { ActiveControl, Grip } from '../src/types/api.ts'
import { activeVisualControls, filterActiveControlsForMode } from '../src/utils/activeControls.ts'

const dataset = JSON.parse(readFileSync(new URL('../../data/generated/simroll_bjj_mvp.normalized.json', import.meta.url), 'utf8')) as {
  positions: { id: string }[]
  positional_transitions: { id: string; source_position: string; destination_position: string; actor_player: string }[]
  controls: { id: string; gi_allowed: boolean; no_gi_allowed: boolean }[]
}
const context = {
  transitionIds: new Set(dataset.positional_transitions.map((transition) => transition.id)),
  positionIds: new Set(dataset.positions.map((position) => position.id)),
}
const minimal: TechniqueAnimationDefinition = { transitionId: techniqueAnimations[0].transitionId, phases: [{ id: 'move', duration: 1 }] }
function validatePhase(phase: object) {
  return validateTechniqueAnimationDefinition({ ...minimal, phases: [phase] } as TechniqueAnimationDefinition, context)
}

test('minimal and representative definitions validate without mutation; graph owns endpoints', () => {
  assert.equal(validateTechniqueAnimationDefinition(minimal, context), minimal)
  const before = JSON.stringify(techniqueAnimations)
  assert.equal(techniqueAnimations.length, 3)
  const definitions: readonly TechniqueAnimationDefinition[] = techniqueAnimations
  for (const definition of definitions) {
    assert.equal(validateTechniqueAnimationDefinition(definition, context), definition)
    const transition = dataset.positional_transitions.find((entry) => entry.id === definition.transitionId)!
    assert.ok(context.positionIds.has(transition.source_position))
    assert.equal(definition.phases.at(-1)?.targetPosition, transition.destination_position)
  }
  assert.equal(JSON.stringify(techniqueAnimations), before)
})

test('rejects missing phases, duplicate IDs, invalid and overflowing durations', () => {
  for (const phases of [undefined, [], [minimal.phases[0], minimal.phases[0]]]) {
    assert.throws(() => validateTechniqueAnimationDefinition({ ...minimal, phases } as unknown as TechniqueAnimationDefinition, context), /phases|phase ID/)
  }
  for (const duration of [0, -1, NaN, Infinity, '1', undefined]) {
    assert.throws(() => validatePhase({ id: 'move', duration }), /duration/)
  }
  assert.throws(() => validateTechniqueAnimationDefinition({ ...minimal, phases: [{ id: 'a', duration: Number.MAX_VALUE }, { id: 'b', duration: Number.MAX_VALUE }] }, context), /total duration/)
})

test('rejects unknown primitive IDs and malformed parameters using shared validation', () => {
  for (const primitive of [{ type: 'invented' }, { type: 'bridge' }, { type: 'hipEscape', side: 'up', distance: 2 }, { type: 'pull', direction: 'left', distance: Infinity }]) {
    assert.throws(() => validatePhase({ id: 'move', duration: 1, playerA: { primitives: [primitive] } }), /primitives/)
  }
})

test('rejects malformed ownership, lifecycle values, controls, modes, and strengths', () => {
  const control = { controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', action: 'acquire' }
  for (const patch of [{ controller: 'attacker' }, { opponent: 'playerA' }, { controller: undefined }, { action: 'keep' }, { controlId: 'invented' }, { modes: ['nogi'] }, { modes: [] }, { strength: 2 }, { side: 'up' }]) {
    assert.throws(() => validatePhase({ id: 'move', duration: 1, controls: [{ ...control, ...patch }] }))
  }
  assert.throws(() => validatePhase({ id: 'move', duration: 1, playerC: {} }), /unknown field/)
  assert.throws(() => validatePhase({ id: 'move', duration: 1, controls: [control, control] }), /duplicate control/)
})

test('rejects malformed relational contacts, grounding and graph references', () => {
  const relation = techniqueAnimations[0].phases[1].relationalTargets[0]
  for (const patch of [{ contacts: [] }, { controller: 'playerB' }, { controlId: 'missing' }, { contacts: [{ ...relation.contacts[0], target: { participant: 'opponent', landmark: 'tentacle' } }] }, { contacts: [{ ...relation.contacts[0], relationalAnchor: 'full-body' }] }, { contacts: [{ ...relation.contacts[0], target: relation.contacts[0].source }] }]) {
    assert.throws(() => validatePhase({ id: 'move', duration: 1, relationalTargets: [{ ...relation, ...patch }] }))
  }
  for (const patch of [{ grapplerId: 'playerC' }, { joint: 'finger' }, { baseline: 'floor' }]) {
    assert.throws(() => validatePhase({ id: 'move', duration: 1, grounding: [{ grapplerId: 'playerA', joint: 'leftWrist', baseline: 'phaseStart', ...patch }] }))
  }
  assert.throws(() => validatePhase({ id: 'move', duration: 1, targetPosition: 'missing' }), /targetPosition/)
  assert.throws(() => validateTechniqueAnimationDefinition({ ...minimal, transitionId: 'missing' }, context), /transitionId/)
  assert.throws(() => validatePhase({ id: 'move', duration: 1, easing: 'bounce' }), /easing/)
})

test('escape actor remains B and lifecycle includes preserve, acquire and release', () => {
  const escape = techniqueAnimations[2]
  assert.equal(dataset.positional_transitions.find((transition) => transition.id === escape.transitionId)?.actor_player, 'player_b')
  assert.equal(escape.phases[1].playerB.primitives[0].type, 'hipEscape')
  assert.deepEqual(escape.phases[1].controls.map(({ controller, action }) => [controller, action]), [['playerA', 'release'], ['playerB', 'acquire']])
  const definitions: readonly TechniqueAnimationDefinition[] = techniqueAnimations
  assert.deepEqual([...new Set(definitions.flatMap((definition) => definition.phases.flatMap((phase) => (phase.controls ?? []).map((control) => control.action))))].sort(), ['acquire', 'preserve', 'release'])
})

test('Gi-only sample metadata respects the existing canonical No-Gi filtering', () => {
  const controls = techniqueAnimations[0].phases[0].controls
  const semantic: ActiveControl[] = controls.map((control) => ({ control_id: control.controlId, owner: 'player_a', target: 'player_b' }))
  // Only the ID and gi_required projection is used by the existing filter.
  const grips = dataset.controls.map((control) => ({ id: control.id, gi_required: control.gi_allowed && !control.no_gi_allowed })) as Grip[]
  const gi = activeVisualControls(filterActiveControlsForMode(semantic, grips, 'gi'))
  const noGi = activeVisualControls(filterActiveControlsForMode(semantic, grips, 'no_gi'))
  assert.ok(gi.some((control) => control.controlId === 'sleeve_grip'))
  assert.ok(!noGi.some((control) => control.controlId === 'sleeve_grip'))
  assert.deepEqual(noGi.map((control) => control.controlId), ['wrist_control', 'butterfly_hook'])
  assert.deepEqual(controls[2].modes, ['gi'])
})

// Compile-time contracts, checked with tsc alongside this focused suite.
const typedPhase: TechniqueAnimationPhase = { id: 'typed', duration: 1, playerA: { primitives: [
  // @ts-expect-error Primitive vocabulary is shared and closed.
  { type: 'animateButterflySweep' },
] } }
const typedRelationship: RelationalTargetDefinition = {
  id: 'typed', controller: 'playerB', opponent: 'playerA', contacts: [{
    id: 'typed', type: 'control', source: { participant: 'controller', landmark: 'hand' },
    // @ts-expect-error Semantic targets use the existing closed landmark vocabulary.
    target: { participant: 'opponent', landmark: 'tentacle' },
  }],
}
void typedPhase
void typedRelationship
// @ts-expect-error A relationship cannot target its own controller.
const samePlayer: TechniqueParticipants = { controller: 'playerA', opponent: 'playerA' }
const emptyDefinition: TechniqueAnimationDefinition = {
  transitionId: minimal.transitionId,
  // @ts-expect-error At least one phase is required at authoring time too.
  phases: [],
}
void samePlayer
void emptyDefinition
