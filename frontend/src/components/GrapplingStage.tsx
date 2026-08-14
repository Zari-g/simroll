import type { GrapplingMode, GrapplingStateResponse } from '../types/api'
import { GrapplingPositionVisual } from './grappling/GrapplingPositionVisual'

interface GrapplingStageProps {
  currentState: GrapplingStateResponse | null
  configuredPositionId: string
  configuredPositionName: string
  configuredMode: GrapplingMode
  configuredGripNames: string[]
  stepCount: number
  isMutationLoading: boolean
  resolvePositionName: (positionId: string) => string
  resolveGripName: (gripId: string) => string
}

export function GrapplingStage({
  currentState,
  configuredPositionId,
  configuredPositionName,
  configuredMode,
  configuredGripNames,
  stepCount,
  isMutationLoading,
  resolvePositionName,
  resolveGripName,
}: GrapplingStageProps) {
  const isActive = currentState !== null
  const positionName = currentState
    ? resolvePositionName(currentState.position_id)
    : configuredPositionName
  const positionId = currentState?.position_id ?? configuredPositionId
  const displayMode = currentState?.mode ?? configuredMode
  const activeGripNames = currentState
    ? currentState.active_grips.map(resolveGripName)
    : configuredGripNames

  return (
    <section className="grappling-stage" aria-labelledby="grappling-stage-heading">
      <div className="grappling-stage__status">
        <span className={`stage-status-dot ${isActive ? 'is-active' : ''}`} aria-hidden="true" />
        <span>{isMutationLoading ? 'Updating roll' : isActive ? 'Roll in progress' : 'Ready to roll'}</span>
        {isActive && <span className="grappling-stage__step">Step {stepCount}</span>}
      </div>

      <div className="grappling-stage__mat">
        <div className="grappling-stage__position">
          <p className="section-label">{isActive ? 'Current position' : 'Starting position'}</p>
          <h3 id="grappling-stage-heading">{positionName}</h3>
          <p>{isActive ? 'Authoritative simulator state' : 'Configured starting state'}</p>
        </div>

        <GrapplingPositionVisual
          positionId={positionId}
          positionName={positionName}
        />

        <dl className="grappling-stage__details">
          <div>
            <dt>Mode</dt>
            <dd>{displayMode === 'gi' ? 'Gi' : 'No-Gi'}</dd>
          </div>
          <div>
            <dt>{isActive ? 'Active grips' : 'Starting grips'}</dt>
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
