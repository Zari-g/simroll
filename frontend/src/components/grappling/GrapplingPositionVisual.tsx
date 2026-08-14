import { getPositionVisual } from '../../grappling/positionVisuals'
import type { GrapplerId } from '../../grappling/types'
import { GrapplerRig } from './GrapplerRig'

interface GrapplingPositionVisualProps {
  positionId: string
  positionName: string
}

const playerNames: Record<GrapplerId, string> = {
  playerA: 'Player A',
  playerB: 'Player B',
}

export function GrapplingPositionVisual({
  positionId,
  positionName,
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

  const poses = {
    playerA: visual.playerAPose,
    playerB: visual.playerBPose,
  }

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
