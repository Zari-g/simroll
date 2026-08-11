import type { GrapplingMode, Grip, Position } from '../types/api'

export function getInitialMode(position: Position): GrapplingMode {
  return position.gi_allowed ? 'gi' : 'no_gi'
}

export function filterGripIdsForMode(
  gripIds: string[],
  grips: Grip[],
  mode: GrapplingMode,
) {
  if (mode === 'gi') return gripIds

  const giOnlyGripIds = new Set(
    grips.filter((grip) => grip.gi_required).map((grip) => grip.id),
  )
  return gripIds.filter((gripId) => !giOnlyGripIds.has(gripId))
}
