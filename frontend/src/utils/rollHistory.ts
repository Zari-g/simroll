import type {
  GrapplingStateResponse,
  RollAction,
} from '../types/api'
import { activeControlIds } from './activeControls.ts'

export interface ControlChanges {
  added: string[]
  released: string[]
}

export function getHistoryControlChanges(
  previous: GrapplingStateResponse,
  current: GrapplingStateResponse,
): ControlChanges {
  const previousIds = activeControlIds(previous.active_controls)
  const currentIds = activeControlIds(current.active_controls)
  const previousControls = new Set(previousIds)
  const currentControls = new Set(currentIds)

  return {
    added: currentIds.filter((controlId) => !previousControls.has(controlId)),
    released: previousIds.filter((controlId) => !currentControls.has(controlId)),
  }
}

export function getHistoryActionName(action: RollAction): string {
  return action.name
}
