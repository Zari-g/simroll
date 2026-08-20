import type {
  GrapplingStateResponse,
  RollAction,
} from '../types/api'
import type { ActiveControl } from '../types/api'
import { activeControlKey } from './activeControls.ts'

export interface ControlChanges {
  added: ActiveControl[]
  released: ActiveControl[]
}

export function getHistoryControlChanges(
  previous: GrapplingStateResponse,
  current: GrapplingStateResponse,
): ControlChanges {
  const previousControls = new Set(previous.active_controls.map(activeControlKey))
  const currentControls = new Set(current.active_controls.map(activeControlKey))

  return {
    added: current.active_controls.filter(
      (control) => !previousControls.has(activeControlKey(control)),
    ),
    released: previous.active_controls.filter(
      (control) => !currentControls.has(activeControlKey(control)),
    ),
  }
}

export function getHistoryActionName(action: RollAction): string {
  return action.name
}
