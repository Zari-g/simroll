import type { GrapplingDisplayState } from '../grappling/displayState'
import type { GrapplerId, GrapplerPose } from '../grappling/types'
import { formatActiveControls } from '../utils/activeControls'
import { GrapplingPositionVisual } from './grappling/GrapplingPositionVisual'

interface GrapplingStageProps {
  displayState: GrapplingDisplayState
  isRollActive: boolean
  isPlaybackActive: boolean
  playbackStateIndex: number | null
  stepCount: number
  isMutationLoading: boolean
  animatedPoses: Record<GrapplerId, GrapplerPose> | null
  animatedTransitionName: string | null
  resolvePositionName: (positionId: string) => string
  resolveGripName: (gripId: string) => string
}

export function GrapplingStage({
  displayState,
  isRollActive,
  isPlaybackActive,
  playbackStateIndex,
  stepCount,
  isMutationLoading,
  animatedPoses,
  animatedTransitionName,
  resolvePositionName,
  resolveGripName,
}: GrapplingStageProps) {
  const positionName = resolvePositionName(displayState.positionId)
  const activeControlNames = formatActiveControls(
    displayState.activeControls,
    resolveGripName,
  )
  const playbackStepLabel =
    playbackStateIndex === 0 ? 'Start' : `Step ${playbackStateIndex}`

  return (
    <section className="grappling-stage" aria-labelledby="grappling-stage-heading">
      <div className="grappling-stage__status" role="status" aria-live="polite">
        <span
          className={`stage-status-dot ${isPlaybackActive ? 'is-playback' : isRollActive ? 'is-active' : ''}`}
          aria-hidden="true"
        />
        <span>
          {animatedTransitionName
            ? `${isPlaybackActive ? 'Replaying' : 'Transitioning'} · ${animatedTransitionName}`
            : isPlaybackActive
              ? 'History playback'
              : isMutationLoading
                ? 'Updating roll'
                : isRollActive
                  ? 'Roll in progress'
                  : 'Ready to roll'}
        </span>
        {isPlaybackActive ? (
          <span className="grappling-stage__step">
            {playbackStepLabel} of {stepCount}
          </span>
        ) : (
          isRollActive && (
            <span className="grappling-stage__step">Step {stepCount}</span>
          )
        )}
      </div>

      <div className="grappling-stage__mat">
        <div className="grappling-stage__position">
          <p className="section-label">
            {isPlaybackActive
              ? 'History position'
              : isRollActive
                ? 'Current position'
                : 'Starting position'}
          </p>
          <h3 id="grappling-stage-heading">{positionName}</h3>
          <p>
            {isPlaybackActive
              ? `Reviewing ${playbackStepLabel}`
              : isRollActive
                ? 'Authoritative simulator state'
                : 'Configured starting state'}
          </p>
        </div>

        <GrapplingPositionVisual
          positionId={displayState.positionId}
          positionName={positionName}
          activeGripIds={displayState.activeGripIds}
          mode={displayState.mode}
          displayPoses={animatedPoses ?? undefined}
        />

        <dl className="grappling-stage__details">
          <div>
            <dt>Mode</dt>
            <dd>{displayState.mode === 'gi' ? 'Gi' : 'No-Gi'}</dd>
          </div>
          <div>
            <dt>
              {isPlaybackActive
                ? 'Recorded grips'
                : isRollActive
                  ? 'Active grips'
                  : 'Starting grips'}
            </dt>
            <dd>
              {activeControlNames.length > 0
                ? activeControlNames.join('; ')
                : 'No active controls'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
