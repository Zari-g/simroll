import assert from 'node:assert/strict'
import test from 'node:test'

import type { RollSimulationResponse, Transition } from '../src/types/api.ts'
import { formatSimulationResult } from '../src/utils/simulationResult.ts'

const armbar: Transition = {
  id: 'mount_top_armbar_submission',
  name: 'Mounted Armbar',
  action_type: 'transition',
  from_position: 'mount_top',
  to_position: 'submission_terminal',
  transition_type: 'submission',
  actor_player: 'player_a',
  required_grips: [],
  created_grips: [],
  removed_grips: [],
  required_controls: [],
  created_controls: [],
  removed_controls: [],
  optional_controls: [],
  controls_preserved_if_valid: [],
  reset_controls: false,
  gi_allowed: true,
  no_gi_allowed: true,
  difficulty: 'intermediate',
  tags: [],
  notes: '',
  submission: true,
  terminal: true,
}

test('submission result uses the executed transition display name', () => {
  const response = {
    stop_reason: 'submission',
    path: {
      states: [],
      actions: [armbar],
      action_ids: [armbar.id],
      positional_steps: 1,
      control_actions: 0,
      total_events: 1,
      transition_ids: [armbar.id],
      step_count: 1,
    },
  } satisfies RollSimulationResponse

  assert.equal(formatSimulationResult(response), 'Submission — Mounted Armbar')
})
