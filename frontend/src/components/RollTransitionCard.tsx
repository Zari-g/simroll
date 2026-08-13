import type { Transition } from '../types/api'
import { formatReadable } from '../utils/format'

interface RollTransitionCardProps {
  transition: Transition
  destinationName: string
  resolveGripName: (gripId: string) => string
  isDisabled: boolean
  onUse: (transitionId: string) => void
}

export function RollTransitionCard({
  transition,
  destinationName,
  resolveGripName,
  isDisabled,
  onUse,
}: RollTransitionCardProps) {
  return (
    <article className="roll-transition-card">
      <div className="roll-transition-card__body">
        <header>
          <h4>{transition.name}</h4>
          <p className="transition-meta">
            {formatReadable(transition.difficulty)} ·{' '}
            {formatReadable(transition.transition_type)}
          </p>
        </header>

        <p className="transition-route">
          Moves to <strong>{destinationName}</strong>
        </p>

        {transition.required_grips.length > 0 && (
          <p className="roll-transition-card__requirements">
            <strong>Required grips:</strong>{' '}
            {transition.required_grips.map(resolveGripName).join(', ')}
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => onUse(transition.id)}
      >
        Use Move
      </button>
    </article>
  )
}
