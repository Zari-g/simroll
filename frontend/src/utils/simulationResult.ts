import type { RollSimulationResponse } from '../types/api'

export function formatSimulationResult(response: RollSimulationResponse) {
  const { path, stop_reason: stopReason } = response

  if (stopReason === 'submission') {
    const submission = path.actions.at(-1)
    return submission?.action_type === 'transition' && submission.submission
      ? `Submission — ${submission.name}`
      : 'Submission'
  }

  if (stopReason === 'no_available_transitions') {
    return path.total_events === 0
      ? 'Auto Roll could not begin because no valid moves remain.'
      : `Auto Roll stopped after ${path.total_events} ${
          path.total_events === 1 ? 'event' : 'events'
        } because no valid moves remain.`
  }

  return `Auto Roll completed ${path.total_events} events (${path.positional_steps} positional, ${path.control_actions} control). You can choose the next move or Auto Roll again.`
}
