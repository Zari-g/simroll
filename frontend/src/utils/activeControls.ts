import type { ActiveControl, GrapplingMode, Grip, PlayerId } from '../types/api'

const playerNames: Record<PlayerId, string> = {
  player_a: 'Player A',
  player_b: 'Player B',
}

// Legacy setup projection: selectors still choose flat control IDs before a
// roll assigns them to the configured Player A starting state.
export function starterControls(controlIds: readonly string[]): ActiveControl[] {
  return controlIds.map((controlId) => ({
    control_id: controlId,
    owner: 'player_a',
    target: 'player_b',
  }))
}

// Legacy setup projection retained for flat-ID selector components.
export function activeControlIds(
  controls: readonly ActiveControl[],
): string[] {
  return [...new Set(controls.map((control) => control.control_id))]
}

export function activeControlKey(control: ActiveControl): string {
  return `${control.control_id}:${control.owner}:${control.target}`
}

export function formatPlayerName(player: PlayerId): string {
  return playerNames[player]
}

export function formatActiveControl(
  control: ActiveControl,
  resolveControlName: (controlId: string) => string,
): string {
  return `${formatPlayerName(control.owner)} — ${resolveControlName(control.control_id)} → ${formatPlayerName(control.target)}`
}

export function formatActiveControls(
  controls: readonly ActiveControl[],
  resolveControlName: (controlId: string) => string,
): string[] {
  return [...controls]
    .sort((left, right) => activeControlKey(left).localeCompare(activeControlKey(right)))
    .map((control) => formatActiveControl(control, resolveControlName))
}

export function filterActiveControlsForMode(
  controls: readonly ActiveControl[],
  grips: readonly Grip[],
  mode: GrapplingMode,
): ActiveControl[] {
  if (mode === 'gi') return [...controls]

  const garmentControlIds = new Set(
    grips.filter((grip) => grip.gi_required).map((grip) => grip.id),
  )
  return controls.filter(
    (control) => !garmentControlIds.has(control.control_id),
  )
}
