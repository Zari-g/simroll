import { resolvePositionContacts } from '../grappling/contacts.ts'
import { displayStateFromResponse } from '../grappling/displayState.ts'
import { getPositionVisual } from '../grappling/positionVisuals.ts'
import { resolveVisualPose } from '../grappling/resolveVisualPose.ts'
import type { GrapplingStateResponse } from '../types/api'
import { activeControlIds, activeVisualControls } from './activeControls.ts'

export interface HistoricalTransition {
  transitionIndex: number
  transitionId: string
  startState: GrapplingStateResponse
  endState: GrapplingStateResponse
}

/*
 * History indexing is fixed: transitionIds[n] connects states[n] to
 * states[n + 1]. Returning null keeps incomplete history safely inert.
 */
export function getHistoricalTransition(
  states: readonly GrapplingStateResponse[],
  transitionIds: readonly string[],
  stateIndex: number,
): HistoricalTransition | null {
  const transitionId = transitionIds[stateIndex]
  const startState = states[stateIndex]
  const endState = states[stateIndex + 1]

  if (!transitionId || !startState || !endState) return null

  return {
    transitionIndex: stateIndex,
    transitionId,
    startState,
    endState,
  }
}

/** Shared authoritative endpoint preparation for manual, Auto Roll and replay. */
export function resolveStateVisual(state: GrapplingStateResponse) {
  const visual = getPositionVisual(state.position_id)
  if (!visual) return null
  const resolved = resolveVisualPose(
    visual,
    activeControlIds(state.active_controls),
  )
  return {
    displayState: displayStateFromResponse(state),
    poses: resolved.poses,
    contacts: [...resolvePositionContacts(visual), ...resolved.gripContacts],
    controls: activeVisualControls(state.active_controls),
  }
}
