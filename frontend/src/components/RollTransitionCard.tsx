import type { RollAction } from '../types/api'
import { formatReadable } from '../utils/format'
import { formatActiveControls } from '../utils/activeControls'

interface RollTransitionCardProps {
  transition: RollAction
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
  const normalizedType =
    transition.action_type === 'transition'
      ? transition.transition_type.toLowerCase()
      : 'control_change'
  const semanticType = normalizedType.includes('submission')
    ? 'submission'
    : normalizedType.includes('sweep')
      ? 'sweep'
      : 'transition'
  const controlsAdded = transition.created_controls
  const controlsRemoved = transition.removed_controls

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
            {formatReadable(
              transition.action_type === 'transition'
                ? transition.transition_type
                : transition.action_type,
            )}
          </span>
        </span>

        {transition.action_type === 'transition' && (
          <span className="transition-meta">{formatReadable(transition.difficulty)}</span>
        )}
        <span className="transition-route">
          {transition.action_type === 'transition' ? 'Moves to ' : 'Controls at '}
          <strong>{destinationName}</strong>
        </span>

        {transition.action_type === 'transition' && transition.required_grips.length > 0 && (
          <span className="roll-transition-card__requirements">
            <strong>Required grips:</strong>{' '}
            {transition.required_grips.map(resolveGripName).join(', ')}
          </span>
        )}

        {controlsAdded.length > 0 && (
          <span className="roll-transition-card__requirements">
            <strong>Adds:</strong>{' '}
            {formatActiveControls(controlsAdded, resolveGripName).join('; ')}
          </span>
        )}
        {controlsRemoved.length > 0 && (
          <span className="roll-transition-card__requirements">
            <strong>Removes:</strong>{' '}
            {formatActiveControls(controlsRemoved, resolveGripName).join('; ')}
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
