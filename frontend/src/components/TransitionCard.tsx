import type { Transition } from '../types/api'
import { formatReadable } from '../utils/format'

export type AvailabilityState =
  | 'available'
  | 'unavailable'
  | 'checking'
  | 'unknown'

interface TransitionCardProps {
  transition: Transition
  availability: AvailabilityState
  fromPositionName: string
  destinationName: string
  resolveGripName: (gripId: string) => string
}

const availabilityLabels: Record<AvailabilityState, string> = {
  available: '✓ Available now',
  unavailable: 'Not available for current state',
  checking: 'Checking availability…',
  unknown: 'Availability unavailable',
}

function GripChanges({
  label,
  gripIds,
  resolveGripName,
}: {
  label: string
  gripIds: string[]
  resolveGripName: (gripId: string) => string
}) {
  if (gripIds.length === 0) {
    return null
  }

  return (
    <div>
      <dt>{label}</dt>
      <dd>{gripIds.map(resolveGripName).join(', ')}</dd>
    </div>
  )
}

export function TransitionCard({
  transition,
  availability,
  fromPositionName,
  destinationName,
  resolveGripName,
}: TransitionCardProps) {
  return (
    <article className={`transition-card transition-card--${availability}`}>
      <p className="transition-status">{availabilityLabels[availability]}</p>
      <header>
        <h4>{transition.name}</h4>
        <p className="transition-meta">
          {formatReadable(transition.transition_type)} ·{' '}
          {formatReadable(transition.difficulty)}
        </p>
      </header>

      <p className="transition-route">
        {fromPositionName} <span aria-hidden="true">→</span>{' '}
        <strong>{destinationName}</strong>
      </p>

      <dl className="grip-changes">
        <GripChanges
          label="Required grips"
          gripIds={transition.required_grips}
          resolveGripName={resolveGripName}
        />
        <GripChanges
          label="Creates"
          gripIds={transition.created_grips}
          resolveGripName={resolveGripName}
        />
        <GripChanges
          label="Removes"
          gripIds={transition.removed_grips}
          resolveGripName={resolveGripName}
        />
      </dl>

      <p className="transition-modes">
        {transition.gi_allowed && 'Gi'}
        {transition.gi_allowed && transition.no_gi_allowed && ' · '}
        {transition.no_gi_allowed && 'No-Gi'}
      </p>

      {transition.notes && (
        <p className="transition-notes">{transition.notes}</p>
      )}

      {transition.tags.length > 0 && (
        <ul className="tag-list" aria-label="Transition tags">
          {transition.tags.map((tag) => (
            <li key={tag}>{formatReadable(tag)}</li>
          ))}
        </ul>
      )}
    </article>
  )
}
