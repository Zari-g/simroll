import type {
  GrapplingPath,
  Grip,
  Position,
  Transition,
} from '../types/api'
import { formatReadable } from '../utils/format'
import { activeControlIds } from '../utils/activeControls'

interface PathResultProps {
  path: GrapplingPath
  positions: Position[]
  transitions: Transition[]
  grips: Grip[]
  title: string
  onShowOnMap: (path: GrapplingPath) => void
}

export function PathResult({
  path,
  positions,
  transitions,
  grips,
  title,
  onShowOnMap,
}: PathResultProps) {
  const positionNames = new Map(
    positions.map((position) => [position.id, position.name]),
  )
  const transitionsById = new Map(
    transitions.map((transition) => [transition.id, transition]),
  )
  const gripNames = new Map(grips.map((grip) => [grip.id, grip.name]))
  const resolvePosition = (id: string) =>
    positionNames.get(id) ?? formatReadable(id)
  const resolveGrip = (id: string) => gripNames.get(id) ?? formatReadable(id)
  const extraTransitionIds = path.transition_ids.slice(
    Math.max(0, path.states.length - 1),
  )

  return (
    <article className="path-card">
      <header className="path-card__heading">
        <div>
          <h4>{title}</h4>
          <p>
            {path.step_count} {path.step_count === 1 ? 'step' : 'steps'}
          </p>
        </div>
        <button type="button" onClick={() => onShowOnMap(path)}>
          Show on grappling map
        </button>
      </header>

      {path.states.length === 0 ? (
        <p className="path-card__warning">No states were returned for this path.</p>
      ) : (
        <ol className="path-sequence">
          {path.states.map((state, stateIndex) => {
            const transitionId =
              stateIndex > 0 ? path.transition_ids[stateIndex - 1] : undefined
            const transition = transitionId
              ? transitionsById.get(transitionId)
              : undefined

            return (
              <li key={`${stateIndex}-${state.position_id}`}>
                {transitionId && (
                  <div className="path-transition">
                    <span className="path-transition__arrow" aria-hidden="true">
                      ↓
                    </span>
                    <div>
                      <strong>
                        {transition?.name ?? formatReadable(transitionId)}
                      </strong>
                      {transition && (
                        <span>
                          {formatReadable(transition.transition_type)} ·{' '}
                          {formatReadable(transition.difficulty)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="path-state">
                  <span className="path-state__number">State {stateIndex + 1}</span>
                  <h5>{resolvePosition(state.position_id)}</h5>
                  <p>{state.mode === 'gi' ? 'Gi' : 'No-Gi'}</p>
                  <p>
                    <strong>Active grips:</strong>{' '}
                    {state.active_controls.length > 0
                      ? activeControlIds(state.active_controls)
                          .map(resolveGrip)
                          .join(', ')
                      : 'None'}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {extraTransitionIds.length > 0 && (
        <p className="path-card__warning">
          Additional returned transitions:{' '}
          {extraTransitionIds
            .map(
              (transitionId) =>
                transitionsById.get(transitionId)?.name ??
                formatReadable(transitionId),
            )
            .join(', ')}
        </p>
      )}
    </article>
  )
}
