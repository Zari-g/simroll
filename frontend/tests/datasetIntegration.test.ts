import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { getPositionVisual } from '../src/grappling/positionVisuals.ts'
import { getAnimationRecipe } from '../src/grappling/animationRecipes/registry.ts'
import type {
  GrapplingPath,
  GrapplingStateResponse,
  Grip,
  Position,
  Transition,
} from '../src/types/api.ts'
import {
  filterActiveControlsForMode,
  formatActiveControl,
} from '../src/utils/activeControls.ts'
import { buildGraphElements } from '../src/utils/graphLayout.ts'
import { buildPathPresentation } from '../src/utils/pathPresentation.ts'
import { getHistoricalTransition } from '../src/utils/rollPlayback.ts'

interface Dataset {
  positions: Array<Record<string, unknown>>
  positional_transitions: Array<Record<string, unknown>>
  controls: Array<Record<string, unknown>>
}

const dataset = JSON.parse(
  readFileSync(
    new URL('../../data/generated/simroll_bjj_mvp.normalized.json', import.meta.url),
    'utf8',
  ),
) as Dataset

const positions = dataset.positions.map((raw) => ({
  id: raw.id,
  name: raw.display_name,
  category: raw.family,
  player_role: raw.player_a_role,
  gi_allowed: raw.gi_allowed,
  no_gi_allowed: raw.no_gi_allowed,
  tags: raw.tags,
  description: raw.notes,
})) as Position[]

const transitions = dataset.positional_transitions.map((raw) => ({
  id: raw.id,
  name: raw.display_name,
  action_type: 'transition',
  from_position: raw.source_position,
  to_position: raw.destination_position,
  transition_type: raw.transition_type,
  actor_player: raw.actor_player,
  required_grips: [],
  created_grips: [],
  removed_grips: [],
  required_controls: [],
  created_controls: [],
  removed_controls: [],
  optional_controls: [],
  controls_preserved_if_valid: [],
  reset_controls: false,
  gi_allowed: raw.gi_allowed,
  no_gi_allowed: raw.no_gi_allowed,
  difficulty: 'dataset',
  tags: [],
  notes: raw.notes,
  submission: raw.submission,
  terminal: raw.terminal,
})) as Transition[]

const grips = dataset.controls.map((raw) => ({
  id: raw.id,
  name: raw.display_name,
  grip_type: raw.category,
  gi_required: raw.gi_allowed === true && raw.no_gi_allowed === false,
  control_target: raw.player_relationship,
  dominant_hand: 'none',
  tags: [],
})) as Grip[]

test('complete semantic dataset flows through explorer with safe visual coverage', () => {
  assert.equal(positions.length, 20)
  assert.equal(transitions.length, 65)

  const graph = buildGraphElements(positions, transitions, () => {})
  assert.equal(graph.nodes.length, 20)
  assert.equal(graph.edges.length, 65)
  assert.equal(
    graph.nodes.find((node) => node.id === 'submission_terminal')?.data.position.name,
    positions.find((position) => position.id === 'submission_terminal')?.name,
  )
  assert.equal(
    graph.edges.filter((edge) => edge.data?.isSubmission).length,
    transitions.filter((transition) => transition.submission).length,
  )

  assert.ok(getPositionVisual('closed_guard_bottom'))
  assert.ok(getPositionVisual('mount_top'))
  assert.ok(getPositionVisual('side_control_top'))
  assert.ok(getPositionVisual('open_guard_bottom'))
  assert.ok(getPositionVisual('half_guard_bottom'))
  assert.ok(getPositionVisual('back_control_top'))
  assert.equal(getPositionVisual('turtle_bottom'), null)
})

test('all controls retain readable ownership and No-Gi removes garment controls', () => {
  assert.equal(grips.length, 17)
  const wrist = grips.find((grip) => grip.id === 'wrist_control')
  assert.ok(wrist)
  assert.equal(
    formatActiveControl(
      { control_id: wrist.id, owner: 'player_a', target: 'player_b' },
      (id) => grips.find((grip) => grip.id === id)?.name ?? id,
    ),
    'Player A — Wrist Control → Player B',
  )

  const sleeve = grips.find((grip) => grip.id === 'sleeve_grip')
  assert.ok(sleeve?.gi_required)
  assert.deepEqual(
    filterActiveControlsForMode(
      [
        { control_id: 'sleeve_grip', owner: 'player_a', target: 'player_b' },
        { control_id: 'wrist_control', owner: 'player_b', target: 'player_a' },
      ],
      grips,
      'no_gi',
    ),
    [{ control_id: 'wrist_control', owner: 'player_b', target: 'player_a' }],
  )
})

test('unknown transitions do not borrow choreography and mixed playback keeps endpoints', () => {
  const unknown = transitions.find(
    (transition) => getAnimationRecipe(transition.id) === null,
  )
  assert.ok(unknown)
  assert.equal(getAnimationRecipe(unknown.id), null)

  const states: GrapplingStateResponse[] = [
    { position_id: 'closed_guard_bottom', mode: 'no_gi', active_controls: [] },
    {
      position_id: 'closed_guard_bottom',
      mode: 'no_gi',
      active_controls: [
        { control_id: 'wrist_control', owner: 'player_a', target: 'player_b' },
      ],
    },
    { position_id: 'mount_top', mode: 'no_gi', active_controls: [] },
    { position_id: 'submission_terminal', mode: 'no_gi', active_controls: [] },
  ]
  const actionIds = [
    'establish_limb_control:player_a:wrist_control',
    'closed_guard_bottom_hip_bump_to_mount_top',
    'mount_top_armbar_submission',
  ]

  for (let index = 0; index < actionIds.length; index += 1) {
    const step = getHistoricalTransition(states, actionIds, index)
    assert.ok(step)
    assert.deepEqual(step.startState, states[index])
    assert.deepEqual(step.endState, states[index + 1])
  }
})

test('Pathfinder presentation resolves expanded route names, mode, and ownership', () => {
  const routeTransition = transitions.find(
    (transition) => transition.to_position !== 'submission_terminal',
  )
  assert.ok(routeTransition)
  const path: GrapplingPath = {
    states: [
      {
        position_id: routeTransition.from_position,
        mode: 'gi',
        active_controls: [
          { control_id: 'collar_grip', owner: 'player_b', target: 'player_a' },
        ],
      },
      {
        position_id: routeTransition.to_position,
        mode: 'gi',
        active_controls: [],
      },
    ],
    transition_ids: [routeTransition.id],
    step_count: 1,
  }

  const steps = buildPathPresentation(path, positions, transitions, grips)
  assert.equal(steps[0].modeName, 'Gi')
  assert.equal(
    steps[0].activeControlNames[0],
    'Player B — Collar Grip → Player A',
  )
  assert.equal(steps[1].incomingTransitionName, routeTransition.name)
  assert.equal(
    steps[1].positionName,
    positions.find((position) => position.id === routeTransition.to_position)?.name,
  )
})
