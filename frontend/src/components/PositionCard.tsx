import type { Position } from '../types/api'

interface PositionCardProps {
  position: Position
  onSelect?: (positionId: string) => void
}

function formatLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function Availability({
  label,
  isAvailable,
}: {
  label: string
  isAvailable: boolean
}) {
  return (
    <li className={`availability ${isAvailable ? '' : 'availability--off'}`}>
      <span className="availability-dot" aria-hidden="true" />
      <span>
        <strong>{label}</strong> {isAvailable ? 'available' : 'not available'}
      </span>
    </li>
  )
}

export function PositionCard({ position, onSelect }: PositionCardProps) {
  return (
    <article className="position-card">
      <header className="position-card__header">
        <p className="position-card__category">
          {formatLabel(position.category)}
          <span aria-hidden="true"> · </span>
          {formatLabel(position.player_role)}
        </p>
        <h3>{position.name}</h3>
      </header>

      <p className="position-card__description">{position.description}</p>

      <ul className="availability-list" aria-label="Grappling mode availability">
        <Availability label="Gi" isAvailable={position.gi_allowed} />
        <Availability label="No-Gi" isAvailable={position.no_gi_allowed} />
      </ul>

      {position.tags.length > 0 && (
        <ul className="tag-list" aria-label="Position tags">
          {position.tags.map((tag) => (
            <li key={tag}>{formatLabel(tag)}</li>
          ))}
        </ul>
      )}

      {onSelect && (
        <button
          className="position-card__action"
          type="button"
          onClick={() => onSelect(position.id)}
        >
          Explore position <span aria-hidden="true">→</span>
        </button>
      )}
    </article>
  )
}
