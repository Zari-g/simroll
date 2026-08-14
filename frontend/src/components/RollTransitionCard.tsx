import type { Transition } from '../types/api'
import { formatReadable } from '../utils/format'

interface RollTransitionCardProps {
  transition: Transition
  destinationName: string
  resolveGripName: (gripId: string) => string
  isDisabled: boolean
  isFailed: boolean
  onUse: (transitionId: string) => void
}

export function RollTransitionCard({
  transition,
  destinationName,
  resolveGripName,
  isDisabled,
  isFailed,
  onUse,
}: RollTransitionCardProps) {
  const normalizedType = transition.transition_type.toLowerCase()
  const semanticType = normalizedType.includes('submission')
    ? 'submission'
    : normalizedType.includes('sweep')
      ? 'sweep'
      : 'transition'

  return (
    <button
      className={`roll-transition-card roll-transition-card--${semanticType}${isFailed ? ' is-failed' : ''}`}
      type="button"
      disabled={isDisabled}
      aria-describedby={isFailed ? `move-error-${transition.id}` : undefined}
      onClick={() => onUse(transition.id)}
    >
      <span className="roll-transition-card__body">
        <span className="roll-transition-card__header">
          <strong>{transition.name}</strong>
          <span className="roll-transition-card__type">
            {formatReadable(transition.transition_type)}
          </span>
        </span>

        <span className="transition-meta">{formatReadable(transition.difficulty)}</span>
        <span className="transition-route">
          Moves to <strong>{destinationName}</strong>
        </span>

        {transition.required_grips.length > 0 && (
          <span className="roll-transition-card__requirements">
            <strong>Required grips:</strong>{' '}
            {transition.required_grips.map(resolveGripName).join(', ')}
          </span>
        )}

        {isFailed && (
          <span id={`move-error-${transition.id}`} className="roll-transition-card__failure">
            Last attempt failed. Select to retry.
          </span>
        )}
      </span>
      <span className="roll-transition-card__action" aria-hidden="true">Use move →</span>
    </button>
  )
}
