import type { GrapplingStateResponse } from '../types/api'

interface RollHistoryProps {
  states: GrapplingStateResponse[]
  transitionIds: string[]
  resolvePositionName: (positionId: string) => string
  resolveGripName: (gripId: string) => string
  resolveTransitionName: (transitionId: string) => string
}

interface GripChanges {
  added: string[]
  released: string[]
}

function getGripChanges(
  previous: GrapplingStateResponse,
  current: GrapplingStateResponse,
): GripChanges {
  const previousGrips = new Set(previous.active_grips)
  const currentGrips = new Set(current.active_grips)

  return {
    added: current.active_grips.filter((gripId) => !previousGrips.has(gripId)),
    released: previous.active_grips.filter((gripId) => !currentGrips.has(gripId)),
  }
}

export function RollHistory({
  states,
  transitionIds,
  resolvePositionName,
  resolveGripName,
  resolveTransitionName,
}: RollHistoryProps) {
  return (
    <section className="roll-history" aria-labelledby="roll-history-heading">
      <div className="roll-history__heading">
        <div>
          <p className="section-label">Roll history</p>
          <h3 id="roll-history-heading">
            {transitionIds.length}{' '}
            {transitionIds.length === 1 ? 'step' : 'steps'}
          </h3>
        </div>
        <span>Authoritative states</span>
      </div>

      <ol className="roll-history__timeline">
        {states.map((state, stateIndex) => {
          const isStart = stateIndex === 0
          const isCurrent = stateIndex === states.length - 1
          const transitionId = transitionIds[stateIndex - 1]
          const changes = isStart
            ? null
            : getGripChanges(states[stateIndex - 1], state)
          const hasGripChanges =
            changes !== null &&
            (changes.added.length > 0 || changes.released.length > 0)

          return (
            <li
              className={isCurrent ? 'roll-history__item--current' : undefined}
              key={`${stateIndex}-${transitionId ?? 'start'}`}
            >
              {!isStart && (
                <div className="roll-history__transition">
                  <span aria-hidden="true">↓</span>
                  <strong>{resolveTransitionName(transitionId)}</strong>
                </div>
              )}

              <article className="roll-history__state">
                <div className="roll-history__state-heading">
                  <p>{isStart ? 'Start' : `Step ${stateIndex}`}</p>
                  {isCurrent && <span>Current</span>}
                </div>
                <h4>{resolvePositionName(state.position_id)}</h4>
                <dl>
                  <div>
                    <dt>Mode</dt>
                    <dd>{state.mode === 'gi' ? 'Gi' : 'No-Gi'}</dd>
                  </div>
                  <div>
                    <dt>Grips</dt>
                    <dd>
                      {state.active_grips.length > 0
                        ? state.active_grips.map(resolveGripName).join(', ')
                        : 'None'}
                    </dd>
                  </div>
                </dl>

                {hasGripChanges && changes && (
                  <div className="roll-history__grip-changes">
                    <strong>Grip changes</strong>
                    {changes.added.length > 0 && (
                      <p>
                        <span className="roll-history__grip-added">Added</span>{' '}
                        {changes.added.map(resolveGripName).join(', ')}
                      </p>
                    )}
                    {changes.released.length > 0 && (
                      <p>
                        <span className="roll-history__grip-released">
                          Released
                        </span>{' '}
                        {changes.released.map(resolveGripName).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </article>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
