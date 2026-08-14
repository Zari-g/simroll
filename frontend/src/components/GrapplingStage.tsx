import type { GrapplerId, GrapplerPose } from '../grappling/types'
import type { GrapplingMode, GrapplingStateResponse } from '../types/api'
import { GrapplingPositionVisual } from './grappling/GrapplingPositionVisual'

interface GrapplingStageProps {
  currentState: GrapplingStateResponse | null
  playbackState: GrapplingStateResponse | null
  playbackStateIndex: number | null
  configuredPositionId: string
  configuredPositionName: string
  configuredMode: GrapplingMode
  configuredGripIds: string[]
  configuredGripNames: string[]
  stepCount: number
  isMutationLoading: boolean
  animatedPoses: Record<GrapplerId, GrapplerPose> | null
  animatedTransitionName: string | null
  resolvePositionName: (positionId: string) => string
  resolveGripName: (gripId: string) => string
}

export function GrapplingStage({
  currentState,
  playbackState,
  playbackStateIndex,
  configuredPositionId,
  configuredPositionName,
  configuredMode,
  configuredGripIds,
  configuredGripNames,
  stepCount,
  isMutationLoading,
  animatedPoses,
  animatedTransitionName,
  resolvePositionName,
  resolveGripName,
}: GrapplingStageProps) {
  const isActive = currentState !== null
  const isPlayback = playbackState !== null && playbackStateIndex !== null
  const stageState = playbackState ?? currentState
  const positionName = stageState
    ? resolvePositionName(stageState.position_id)
    : configuredPositionName
  const positionId = stageState?.position_id ?? configuredPositionId
  const displayMode = stageState?.mode ?? configuredMode
  const activeGripIds = stageState?.active_grips ?? configuredGripIds
  const activeGripNames = stageState
    ? stageState.active_grips.map(resolveGripName)
    : configuredGripNames
  const playbackStepLabel =
    playbackStateIndex === 0 ? 'Start' : `Step ${playbackStateIndex}`

  return (
    <section className="grappling-stage" aria-labelledby="grappling-stage-heading">
      <div className="grappling-stage__status" role="status" aria-live="polite">
        <span
          className={`stage-status-dot ${isPlayback ? 'is-playback' : isActive ? 'is-active' : ''}`}
          aria-hidden="true"
        />
        <span>
          {animatedTransitionName
            ? `${isPlayback ? 'Replaying' : 'Transitioning'} · ${animatedTransitionName}`
            : isPlayback
              ? 'History playback'
            : isMutationLoading
              ? 'Updating roll'
              : isActive
                ? 'Roll in progress'
                : 'Ready to roll'}
        </span>
        {isPlayback ? (
          <span className="grappling-stage__step">
            {playbackStepLabel} of {stepCount}
          </span>
        ) : (
          isActive && <span className="grappling-stage__step">Step {stepCount}</span>
        )}
      </div>

      <div className="grappling-stage__mat">
        <div className="grappling-stage__position">
          <p className="section-label">
            {isPlayback
              ? 'History position'
              : isActive
                ? 'Current position'
                : 'Starting position'}
          </p>
          <h3 id="grappling-stage-heading">{positionName}</h3>
          <p>
            {isPlayback
              ? `Reviewing ${playbackStepLabel}`
              : isActive
                ? 'Authoritative simulator state'
                : 'Configured starting state'}
          </p>
        </div>

        <GrapplingPositionVisual
          positionId={positionId}
          positionName={positionName}
          activeGripIds={activeGripIds}
          mode={displayMode}
          displayPoses={animatedPoses ?? undefined}
        />

        <dl className="grappling-stage__details">
          <div>
            <dt>Mode</dt>
            <dd>{displayMode === 'gi' ? 'Gi' : 'No-Gi'}</dd>
          </div>
          <div>
            <dt>
              {isPlayback
                ? 'Recorded grips'
                : isActive
                  ? 'Active grips'
                  : 'Starting grips'}
            </dt>
            <dd>
              {activeGripNames.length > 0
                ? activeGripNames.join(', ')
                : 'No active grips'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
