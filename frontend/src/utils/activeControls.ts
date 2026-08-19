import type { ActiveControl } from '../types/api'

export function starterControls(controlIds: readonly string[]): ActiveControl[] {
  return controlIds.map((controlId) => ({
    control_id: controlId,
    owner: 'player_a',
    target: 'player_b',
  }))
}

export function activeControlIds(
  controls: readonly ActiveControl[],
): string[] {
  return [...new Set(controls.map((control) => control.control_id))]
}

export function activeControlKey(control: ActiveControl): string {
  return `${control.control_id}:${control.owner}:${control.target}`
}
