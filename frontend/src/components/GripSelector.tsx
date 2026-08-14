import type { GrapplingMode, Grip } from '../types/api'
import { formatReadable } from '../utils/format'

interface GripSelectorProps {
  grips: Grip[]
  mode: GrapplingMode
  selectedGripIds: ReadonlySet<string>
  onToggle: (gripId: string) => void
  isDisabled?: boolean
}

export function GripSelector({
  grips,
  mode,
  selectedGripIds,
  onToggle,
  isDisabled = false,
}: GripSelectorProps) {
  return (
    <fieldset className="grip-selector">
      <legend>Active grips</legend>
      <p className="control-help">
        Select the grips that describe the current grappling state.
      </p>

      <ul className="grip-list">
        {grips.map((grip) => {
          const isGripDisabled = isDisabled || (mode === 'no_gi' && grip.gi_required)

          return (
            <li key={grip.id}>
              <label className={`grip-option ${isGripDisabled ? 'grip-option--disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedGripIds.has(grip.id)}
                  disabled={isGripDisabled}
                  onChange={() => onToggle(grip.id)}
                />
                <span className="grip-option__body">
                  <strong>{grip.name}</strong>
                  <span>
                    {formatReadable(grip.grip_type)} ·{' '}
                    {formatReadable(grip.control_target)}
                  </span>
                  <small>
                    {grip.gi_required ? 'Gi required' : 'Gi not required'}
                    {grip.dominant_hand !== 'none' &&
                      ` · ${formatReadable(grip.dominant_hand)} hand`}
                  </small>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
