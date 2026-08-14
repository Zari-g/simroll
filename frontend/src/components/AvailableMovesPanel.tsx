import type { Transition } from '../types/api'
import { RollTransitionCard } from './RollTransitionCard'

interface StatusMessage {
  kind: 'completed' | 'dead_end'
  message: string
}

interface AvailableMovesPanelProps {
  transitions: Transition[]
  currentPositionName: string | null
  isRollActive: boolean
  isPlaybackActive: boolean
  isLoading: boolean
  isStepLoading: boolean
  isMutationLoading: boolean
  isDeadEnd: boolean
  availabilityError: string | null
  stepError: string | null
  autoRollError: string | null
  autoRollStatus: StatusMessage | null
  failedTransitionId: string | null | undefined
  resolvePositionName: (positionId: string) => string
  resolveGripName: (gripId: string) => string
  onUseTransition: (transitionId: string) => void
  onRetryStep: () => void
  onRetryAvailability: () => void
  onRetryAutoRoll: () => void
  onReset: () => void
  onReturnToLive: () => void
}

export function AvailableMovesPanel({
  transitions,
  currentPositionName,
  isRollActive,
  isPlaybackActive,
  isLoading,
  isStepLoading,
  isMutationLoading,
  isDeadEnd,
  availabilityError,
  stepError,
  autoRollError,
  autoRollStatus,
  failedTransitionId,
  resolvePositionName,
  resolveGripName,
  onUseTransition,
  onRetryStep,
  onRetryAvailability,
  onRetryAutoRoll,
  onReset,
  onReturnToLive,
}: AvailableMovesPanelProps) {
  return (
    <aside className="available-moves-panel" aria-labelledby="available-moves-heading">
      <div className="simulator-panel-heading available-moves-panel__heading">
        <div>
          <p className="section-label">
            {isPlaybackActive ? 'History playback' : 'Available moves'}
          </p>
          <h3 id="available-moves-heading">
            {isPlaybackActive ? 'Live moves paused' : 'Choose a transition'}
          </h3>
        </div>
        {isRollActive &&
          !isPlaybackActive &&
          !isLoading &&
          !availabilityError &&
          !isDeadEnd && <span>{transitions.length}</span>}
      </div>

      <div className="available-moves-panel__content" aria-live="polite">
        {isPlaybackActive ? (
          <div className="roll-playback-message">
            <strong>Reviewing recorded roll history</strong>
            <p>
              Return to Live to continue from the authoritative current state.
            </p>
            <button type="button" onClick={onReturnToLive}>
              Return to Live
            </button>
          </div>
        ) : (
          <>
        {!isRollActive && (
          <div className="roll-panel-empty">
            <strong>Moves load when the roll starts</strong>
            <p>Configure the starting state, then select Start Roll.</p>
          </div>
        )}

        {isStepLoading && (
          <p className="roll-progress" role="status">
            <span className="spinner" aria-hidden="true" />
            Applying move...
          </p>
        )}

        {stepError && (
          <div className="scoped-error" role="alert">
            <span>{stepError} Your current state has not changed.</span>
            <button type="button" disabled={isMutationLoading} onClick={onRetryStep}>Try again</button>
          </div>
        )}

        {isLoading && (
          <div className="roll-moves-loading" role="status">
            <span className="spinner" aria-hidden="true" />
            <strong>Loading available moves</strong>
            <span>Checking the authoritative state...</span>
          </div>
        )}

        {availabilityError && (
          <div className="scoped-error" role="alert">
            <span>{availabilityError}</span>
            <button type="button" disabled={isMutationLoading} onClick={onRetryAvailability}>Retry</button>
          </div>
        )}

        {isRollActive && isDeadEnd && (
          <div className="roll-dead-end">
            <p className="section-label">No valid moves</p>
            <strong>
              {currentPositionName
                ? `${currentPositionName} has no currently available transitions.`
                : 'This state has no currently available transitions.'}
            </strong>
            <p>Reset or start from another position.</p>
            <button type="button" onClick={onReset}>Reset Roll</button>
          </div>
        )}

        {isRollActive && !isLoading && !availabilityError && !isDeadEnd && (
          <ul className="roll-transition-list">
            {transitions.map((transition) => (
              <li key={transition.id}>
                <RollTransitionCard
                  transition={transition}
                  destinationName={resolvePositionName(transition.to_position)}
                  resolveGripName={resolveGripName}
                  isDisabled={isMutationLoading}
                  isFailed={failedTransitionId === transition.id}
                  onUse={onUseTransition}
                />
              </li>
            ))}
          </ul>
        )}

        {autoRollError && (
          <div className="scoped-error" role="alert">
            <span>{autoRollError}</span>
            <button type="button" disabled={isMutationLoading} onClick={onRetryAutoRoll}>Try again</button>
          </div>
        )}

        {autoRollStatus && (
          <p className={`roll-auto__status roll-auto__status--${autoRollStatus.kind}`} role="status">
            {autoRollStatus.message}
          </p>
        )}
          </>
        )}
      </div>
    </aside>
  )
}
