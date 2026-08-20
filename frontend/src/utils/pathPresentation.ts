import type { GrapplingPath, Grip, Position, Transition } from '../types/api'
import { formatActiveControls } from './activeControls.ts'
import { formatReadable } from './format.ts'

export interface PathPresentationStep {
  stateNumber: number
  positionName: string
  modeName: string
  activeControlNames: string[]
  incomingTransitionName: string | null
  incomingTransitionType: string | null
  incomingTransitionDifficulty: string | null
}

export function buildPathPresentation(
  path: GrapplingPath,
  positions: readonly Position[],
  transitions: readonly Transition[],
  grips: readonly Grip[],
): PathPresentationStep[] {
  const positionNames = new Map(
    positions.map((position) => [position.id, position.name]),
  )
  const transitionsById = new Map(
    transitions.map((transition) => [transition.id, transition]),
  )
  const gripNames = new Map(grips.map((grip) => [grip.id, grip.name]))
  const resolveGrip = (id: string) => gripNames.get(id) ?? formatReadable(id)

  return path.states.map((state, stateIndex) => {
    const transitionId =
      stateIndex > 0 ? path.transition_ids[stateIndex - 1] : undefined
    const transition = transitionId
      ? transitionsById.get(transitionId)
      : undefined

    return {
      stateNumber: stateIndex + 1,
      positionName:
        positionNames.get(state.position_id) ?? formatReadable(state.position_id),
      modeName: state.mode === 'gi' ? 'Gi' : 'No-Gi',
      activeControlNames: formatActiveControls(
        state.active_controls,
        resolveGrip,
      ),
      incomingTransitionName: transitionId
        ? transition?.name ?? formatReadable(transitionId)
        : null,
      incomingTransitionType: transition
        ? formatReadable(transition.transition_type)
        : null,
      incomingTransitionDifficulty: transition
        ? formatReadable(transition.difficulty)
        : null,
    }
  })
}
