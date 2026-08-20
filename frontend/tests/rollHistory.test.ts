import assert from 'node:assert/strict'
import test from 'node:test'

import type { ControlChange, GrapplingStateResponse } from '../src/types/api.ts'
import {
  getHistoryActionName,
  getHistoryControlChanges,
} from '../src/utils/rollHistory.ts'

test('history describes a same-position control-change event', () => {
  const before: GrapplingStateResponse = {
    position_id: 'closed_guard_bottom',
    mode: 'no_gi',
    active_controls: [],
  }
  const after: GrapplingStateResponse = {
    ...before,
    active_controls: [
      {
        control_id: 'wrist_control',
        owner: 'player_a',
        target: 'player_b',
      },
    ],
  }
  const action: ControlChange = {
    id: 'establish_limb_control:player_a:wrist_control',
    name: 'Establish Limb Control: Wrist Control',
    action_type: 'control_change',
    template_id: 'establish_limb_control',
    position_id: before.position_id,
    mode: before.mode,
    actor_player: 'player_a',
    required_controls: [],
    created_controls: after.active_controls,
    removed_controls: [],
  }

  assert.equal(before.position_id, after.position_id)
  assert.equal(getHistoryActionName(action), action.name)
  assert.deepEqual(getHistoryControlChanges(before, after), {
    added: after.active_controls,
    released: [],
  })
})
