import {
  resolveGrapplerAnatomy,
  type GrapplerAnatomyOverrides,
} from '../../grappling/anatomy'
import { getPositionVisual } from '../../grappling/positionVisuals'
import { useMemo } from 'react'

import {
  resolvePositionContacts,
  resolveSceneBodyPartOrder,
} from '../../grappling/contacts'
import {
  resolveGrapplerAppearance,
  type GrapplerApparelMode,
} from '../../grappling/appearance'
import { resolveVisualPose } from '../../grappling/resolveVisualPose'
import type {
  GrapplerId,
  GrapplerPose,
} from '../../grappling/types'
import { GrapplerBodyPart } from './GrapplerRig'
import { GrapplingContacts } from './GrapplingContacts'

interface GrapplingPositionVisualProps {
  positionId: string
  positionName: string
  activeGripIds: readonly string[]
  mode: GrapplerApparelMode
  displayPoses?: Record<GrapplerId, GrapplerPose>
  anatomies?: GrapplerAnatomyOverrides
}

const playerNames: Record<GrapplerId, string> = {
  playerA: 'Player A',
  playerB: 'Player B',
}

export function GrapplingPositionVisual({
  positionId,
  positionName,
  activeGripIds,
  mode,
  displayPoses,
  anatomies,
}: GrapplingPositionVisualProps) {
  const visual = getPositionVisual(positionId)
  const resolvedVisual = useMemo(
    () => (visual ? resolveVisualPose(visual, activeGripIds) : null),
    [activeGripIds, visual],
  )
  const resolvedAnatomies = useMemo(
    () => ({
      playerA: resolveGrapplerAnatomy('playerA', anatomies),
      playerB: resolveGrapplerAnatomy('playerB', anatomies),
    }),
    [anatomies],
  )
  const appearances = useMemo(
    () => ({
      playerA: resolveGrapplerAppearance('playerA', mode),
      playerB: resolveGrapplerAppearance('playerB', mode),
    }),
    [mode],
  )
  const bodyPartOrder = useMemo(
    () =>
      visual
        ? resolveSceneBodyPartOrder(
            visual.playerOrder,
            resolvedAnatomies,
            visual.occlusion,
          )
        : [],
    [resolvedAnatomies, visual],
  )
  const contacts = useMemo(
    () =>
      visual && resolvedVisual
        ? [
            ...resolvePositionContacts(visual),
            ...resolvedVisual.gripContacts,
          ]
        : [],
    [resolvedVisual, visual],
  )

  if (!visual || !resolvedVisual) {
    return (
      <div className="grappling-visual-fallback" role="img" aria-label={`${positionName} visualization coming soon`}>
        <span className="grappling-visual-fallback__mark" aria-hidden="true">SR</span>
        <strong>Position visualization coming soon</strong>
        <span>{positionName}</span>
      </div>
    )
  }

  const poses = displayPoses ?? resolvedVisual.poses

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
        {bodyPartOrder.map(({ grapplerId, bodyPart }) => (
          <GrapplerBodyPart
            key={`${grapplerId}-${bodyPart}`}
            grapplerId={grapplerId}
            pose={poses[grapplerId]}
            anatomy={resolvedAnatomies[grapplerId]}
            appearance={appearances[grapplerId]}
            bodyPartName={bodyPart}
          />
        ))}
        <GrapplingContacts
          contacts={contacts}
          poses={poses}
          anatomies={resolvedAnatomies}
        />
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
