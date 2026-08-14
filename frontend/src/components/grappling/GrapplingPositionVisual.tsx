import { getPositionVisual } from '../../grappling/positionVisuals'
import { resolveVisualPose } from '../../grappling/resolveVisualPose'
import type {
  GrapplerId,
  GrapplerPose,
} from '../../grappling/types'
import { GrapplerRig } from './GrapplerRig'

interface GrapplingPositionVisualProps {
  positionId: string
  positionName: string
  activeGripIds: readonly string[]
  displayPoses?: Record<GrapplerId, GrapplerPose>
}

const playerNames: Record<GrapplerId, string> = {
  playerA: 'Player A',
  playerB: 'Player B',
}

export function GrapplingPositionVisual({
  positionId,
  positionName,
  activeGripIds,
  displayPoses,
}: GrapplingPositionVisualProps) {
  const visual = getPositionVisual(positionId)

  if (!visual) {
    return (
      <div className="grappling-visual-fallback" role="img" aria-label={`${positionName} visualization coming soon`}>
        <span className="grappling-visual-fallback__mark" aria-hidden="true">SR</span>
        <strong>Position visualization coming soon</strong>
        <span>{positionName}</span>
      </div>
    )
  }

  const resolvedVisual = resolveVisualPose(visual, activeGripIds)
  const poses = displayPoses ?? resolvedVisual.poses
  const contactIndicators = displayPoses
    ? []
    : resolvedVisual.contactIndicators

  return (
    <div className="grappling-position-visual">
      <svg
        className="grappling-position-visual__svg"
        viewBox="0 0 1000 600"
        role="img"
        aria-labelledby={`grappling-visual-title-${positionId} grappling-visual-description-${positionId}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={`grappling-visual-title-${positionId}`}>{visual.label}</title>
        <desc id={`grappling-visual-description-${positionId}`}>{visual.description}</desc>
        <circle className="grappling-position-visual__center-ring" cx="500" cy="300" r="225" />
        <path className="grappling-position-visual__orientation" d="M 500 72 l -12 20 h 24 z" />
        {visual.playerOrder.map((grapplerId) => (
          <GrapplerRig
            key={grapplerId}
            grapplerId={grapplerId}
            pose={poses[grapplerId]}
          />
        ))}
        {contactIndicators.map((indicator, index) => (
          <g
            className={`grip-contact grip-contact--${indicator.grapplerId}`}
            key={`${indicator.grapplerId}-${indicator.x}-${indicator.y}-${index}`}
            aria-hidden="true"
          >
            <circle className="grip-contact__ring" cx={indicator.x} cy={indicator.y} r="15" />
            <circle className="grip-contact__point" cx={indicator.x} cy={indicator.y} r="6" />
          </g>
        ))}
      </svg>

      <div className="grappling-position-visual__legend" aria-label="Grappler legend">
        <span className="player-legend player-legend--a">
          <i aria-hidden="true" />
          {playerNames.playerA}
          <small>{visual.playerARole}</small>
        </span>
        <span className="player-legend player-legend--b">
          <i aria-hidden="true" />
          {playerNames.playerB}
          <small>{visual.playerBRole}</small>
        </span>
      </div>
    </div>
  )
}
