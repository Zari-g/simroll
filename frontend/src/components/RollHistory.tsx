import type { GrapplingStateResponse, RollAction } from '../types/api'
import { activeControlIds } from '../utils/activeControls'
import {
  getHistoryActionName,
  getHistoryControlChanges,
} from '../utils/rollHistory'
import { RollPlaybackControls } from './RollPlaybackControls'

interface RollHistoryProps {
  states: GrapplingStateResponse[]
  actions: RollAction[]
  resolvePositionName: (positionId: string) => string
  resolveGripName: (gripId: string) => string
  resolveTransitionName: (transitionId: string) => string
  selectedStateIndex: number | null
  isReplaying: boolean
  isSelectionDisabled: boolean
  onSelectState: (stateIndex: number) => void
  onPrevious: () => void
  onReplay: () => void
  onNext: () => void
  onReturnToLive: () => void
}

export function RollHistory({
  states,
  actions,
  resolvePositionName,
  resolveGripName,
  resolveTransitionName,
  selectedStateIndex,
  isReplaying,
  isSelectionDisabled,
  onSelectState,
  onPrevious,
  onReplay,
  onNext,
  onReturnToLive,
}: RollHistoryProps) {
  const selectedLabel =
    selectedStateIndex === null
      ? 'Live state'
      : selectedStateIndex === 0
        ? 'Reviewing Start'
        : `Reviewing Step ${selectedStateIndex}`
  const outgoingTransitionId =
    selectedStateIndex === null
      ? undefined
      : actions[selectedStateIndex]?.id

  return (
    <section className="roll-history" aria-labelledby="roll-history-heading">
      <div className="roll-history__heading">
        <div>
          <p className="section-label">Roll history</p>
          <h3 id="roll-history-heading">
            {actions.length}{' '}
            {actions.length === 1 ? 'event' : 'events'}
          </h3>
        </div>
        <span>{selectedLabel}</span>
      </div>

      {selectedStateIndex !== null && (
        <RollPlaybackControls
          selectedStateIndex={selectedStateIndex}
          stateCount={states.length}
          outgoingTransitionName={
            outgoingTransitionId
              ? resolveTransitionName(outgoingTransitionId)
              : null
          }
          isReplaying={isReplaying}
          onPrevious={onPrevious}
          onReplay={onReplay}
          onNext={onNext}
          onReturnToLive={onReturnToLive}
        />
      )}

      <ol className="roll-history__timeline">
        {states.map((state, stateIndex) => {
          const isStart = stateIndex === 0
          const isCurrent = stateIndex === states.length - 1
          const isSelected = selectedStateIndex === stateIndex
          const action = actions[stateIndex - 1]
          const transitionId = action?.id
          const changes = isStart
            ? null
            : getHistoryControlChanges(states[stateIndex - 1], state)
          const hasGripChanges =
            changes !== null &&
            (changes.added.length > 0 || changes.released.length > 0)

          return (
            <li
              className={[
                isCurrent ? 'roll-history__item--current' : '',
                isSelected ? 'roll-history__item--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={`${stateIndex}-${transitionId ?? 'start'}`}
            >
              {!isStart && (
                <div className="roll-history__transition">
                  <span aria-hidden="true">↓</span>
                  <strong>
                    {action
                      ? getHistoryActionName(action)
                      : resolveTransitionName(transitionId)}
                  </strong>
                  {action?.action_type === 'control_change' && <span>Control change</span>}
                </div>
              )}

              <article className="roll-history__state">
                <button
                  className="roll-history__state-select"
                  type="button"
                  disabled={isSelectionDisabled}
                  aria-pressed={isSelected}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={
                    isCurrent
                      ? 'View Current state and return to Live'
                      : isStart
                        ? 'View Start state'
                        : `View Step ${stateIndex}`
                  }
                  onClick={() => onSelectState(stateIndex)}
                >
                  <span className="roll-history__state-heading">
                    <span>{isStart ? 'Start' : `Step ${stateIndex}`}</span>
                    {isCurrent && <span>Current</span>}
                    {isSelected && <span>Selected</span>}
                  </span>
                  <strong>{resolvePositionName(state.position_id)}</strong>
                </button>
                <dl>
                  <div>
                    <dt>Mode</dt>
                    <dd>{state.mode === 'gi' ? 'Gi' : 'No-Gi'}</dd>
                  </div>
                  <div>
                    <dt>Grips</dt>
                    <dd>
                      {state.active_controls.length > 0
                        ? activeControlIds(state.active_controls)
                            .map(resolveGripName)
                            .join(', ')
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
