import type {
  GrapplingPath,
  Grip,
  Position,
  Transition,
} from '../types/api'
import { formatReadable } from '../utils/format'
import { buildPathPresentation } from '../utils/pathPresentation'

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
  const transitionsById = new Map(
    transitions.map((transition) => [transition.id, transition]),
  )
  const extraTransitionIds = path.transition_ids.slice(
    Math.max(0, path.states.length - 1),
  )
  const presentationSteps = buildPathPresentation(
    path,
    positions,
    transitions,
    grips,
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
            const presentation = presentationSteps[stateIndex]
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
                        {presentation.incomingTransitionName}
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
                  <span className="path-state__number">State {presentation.stateNumber}</span>
                  <h5>{presentation.positionName}</h5>
                  <p>{presentation.modeName}</p>
                  <p>
                    <strong>Active controls:</strong>{' '}
                    {presentation.activeControlNames.length > 0
                      ? presentation.activeControlNames.join('; ')
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
