import type { ActiveControl, GrapplingMode, GrapplingStateResponse } from '../types/api'

export interface GrapplingDisplayState {
  readonly positionId: string
  readonly mode: GrapplingMode
  readonly activeGripIds: readonly string[]
  readonly activeControls: readonly ActiveControl[]
}

interface DisplayStateSources {
  configured: GrapplingDisplayState
  live?: GrapplingDisplayState | null
  playback?: GrapplingDisplayState | null
  transition?: GrapplingDisplayState | null
}

// Keep source metadata until the movement is nearly settled. Contacts still
// follow the interpolated pose, while destination apparel, grips, contacts,
// and occlusion arrive together near the stable destination frame.
export const TRANSITION_DESTINATION_STATE_PROGRESS = 0.8

export function createGrapplingDisplayState(
  positionId: string,
  mode: GrapplingMode,
  activeGripIds: readonly string[],
  activeControls: readonly ActiveControl[] = [],
): GrapplingDisplayState {
  return {
    positionId,
    mode,
    activeGripIds: [...activeGripIds],
    activeControls: [...activeControls],
  }
}

export function displayStateFromResponse(
  state: GrapplingStateResponse,
): GrapplingDisplayState {
  return createGrapplingDisplayState(
    state.position_id,
    state.mode,
    [...new Set(state.active_controls.map((control) => control.control_id))],
    state.active_controls,
  )
}

export function resolveGrapplingDisplayState({
  configured,
  live,
  playback,
  transition,
}: DisplayStateSources): GrapplingDisplayState {
  return transition ?? playback ?? live ?? configured
}

export function resolveTransitionDisplayState(
  start: GrapplingDisplayState,
  end: GrapplingDisplayState,
  progress: number,
): GrapplingDisplayState {
  return progress >= TRANSITION_DESTINATION_STATE_PROGRESS ? end : start
}
