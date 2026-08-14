import type { GrapplingStateResponse } from '../types/api'

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
