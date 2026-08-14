interface RollPlaybackControlsProps {
  selectedStateIndex: number
  stateCount: number
  outgoingTransitionName: string | null
  isReplaying: boolean
  onPrevious: () => void
  onReplay: () => void
  onNext: () => void
  onReturnToLive: () => void
}

export function RollPlaybackControls({
  selectedStateIndex,
  stateCount,
  outgoingTransitionName,
  isReplaying,
  onPrevious,
  onReplay,
  onNext,
  onReturnToLive,
}: RollPlaybackControlsProps) {
  const isLatestState = selectedStateIndex >= stateCount - 1

  return (
    <div
      className="roll-playback-controls"
      role="group"
      aria-label="History playback controls"
    >
      <div className="roll-playback-controls__navigation">
        <button
          type="button"
          disabled={selectedStateIndex <= 0}
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          className="roll-playback-controls__replay"
          type="button"
          disabled={!outgoingTransitionName || isReplaying}
          aria-label={
            outgoingTransitionName
              ? `Replay ${outgoingTransitionName}`
              : 'No transition to replay from this state'
          }
          onClick={onReplay}
        >
          {isReplaying ? 'Replaying…' : 'Replay'}
        </button>
        <button type="button" disabled={isLatestState} onClick={onNext}>
          Next
        </button>
      </div>
      <button
        className="roll-playback-controls__live"
        type="button"
        onClick={onReturnToLive}
      >
        Return to Live
      </button>
    </div>
  )
}
