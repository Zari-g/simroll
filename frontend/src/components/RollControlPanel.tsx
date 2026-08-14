import type { GrapplingMode, Grip, Position } from '../types/api'
import { GripSelector } from './GripSelector'

interface RollControlPanelProps {
  positions: Position[]
  selectedPosition: Position | null
  startPositionId: string
  mode: GrapplingMode
  grips: Grip[]
  selectedGripIds: ReadonlySet<string>
  isRollActive: boolean
  isGripsLoading: boolean
  gripsError: string | null
  isMutationLoading: boolean
  isAvailabilityLoading: boolean
  hasAvailabilityError: boolean
  isDeadEnd: boolean
  autoRollStepCount: number
  autoRollStepOptions: readonly number[]
  isAutoRollDisabled: boolean
  isAutoRollLoading: boolean
  onPositionChange: (positionId: string) => void
  onModeChange: (mode: GrapplingMode) => void
  onToggleGrip: (gripId: string) => void
  onRetryGrips: () => void
  onStartRoll: () => void
  onRandomStep: () => void
  onAutoRollStepCountChange: (stepCount: number) => void
  onAutoRoll: () => void
  onReset: () => void
}

export function RollControlPanel({
  positions,
  selectedPosition,
  startPositionId,
  mode,
  grips,
  selectedGripIds,
  isRollActive,
  isGripsLoading,
  gripsError,
  isMutationLoading,
  isAvailabilityLoading,
  hasAvailabilityError,
  isDeadEnd,
  autoRollStepCount,
  autoRollStepOptions,
  isAutoRollDisabled,
  isAutoRollLoading,
  onPositionChange,
  onModeChange,
  onToggleGrip,
  onRetryGrips,
  onStartRoll,
  onRandomStep,
  onAutoRollStepCountChange,
  onAutoRoll,
  onReset,
}: RollControlPanelProps) {
  const setupDisabled = isRollActive
  const randomStepDisabled =
    !isRollActive ||
    isMutationLoading ||
    isAvailabilityLoading ||
    hasAvailabilityError ||
    isDeadEnd

  return (
    <aside className="roll-control-panel" aria-labelledby="roll-controls-heading">
      <div className="simulator-panel-heading">
        <p className="section-label">Roll controls</p>
        <h3 id="roll-controls-heading">Run the simulation</h3>
      </div>

      <section className="roll-control-group" aria-labelledby="roll-actions-heading">
        <h4 id="roll-actions-heading">Roll actions</h4>
        <div className="roll-action-stack">
          <button
            className="roll-primary-action"
            type="button"
            disabled={
              isRollActive || !selectedPosition || isGripsLoading || !!gripsError
            }
            onClick={onStartRoll}
          >
            Start Roll
          </button>
          <button
            className="roll-secondary-action"
            type="button"
            disabled={randomStepDisabled}
            onClick={onRandomStep}
          >
            Random Step
          </button>
          <button
            className="roll-secondary-action roll-reset-action"
            type="button"
            disabled={!isRollActive}
            onClick={onReset}
          >
            Reset
          </button>
        </div>
      </section>

      <section className="roll-control-group" aria-labelledby="starting-state-heading">
        <div className="roll-control-group__heading">
          <h4 id="starting-state-heading">Starting state</h4>
          {isRollActive && <span>Locked during roll</span>}
        </div>

        <label className="roll-position-select">
          <span>Starting position</span>
          <select
            value={startPositionId}
            disabled={setupDisabled}
            onChange={(event) => onPositionChange(event.target.value)}
          >
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="mode-selector" disabled={setupDisabled}>
          <legend>Mode</legend>
          <div className="segmented-control">
            <label>
              <input
                type="radio"
                name="roll-setup-mode"
                value="gi"
                checked={mode === 'gi'}
                disabled={setupDisabled || !selectedPosition?.gi_allowed}
                onChange={() => onModeChange('gi')}
              />
              <span>Gi</span>
            </label>
            <label>
              <input
                type="radio"
                name="roll-setup-mode"
                value="no_gi"
                checked={mode === 'no_gi'}
                disabled={setupDisabled || !selectedPosition?.no_gi_allowed}
                onChange={() => onModeChange('no_gi')}
              />
              <span>No-Gi</span>
            </label>
          </div>
        </fieldset>

        {isGripsLoading ? (
          <div className="state-message roll-resource-state" role="status">
            <span className="spinner" aria-hidden="true" />
            <span>Loading grips...</span>
          </div>
        ) : gripsError ? (
          <div className="scoped-error" role="alert">
            <span>{gripsError}</span>
            <button type="button" onClick={onRetryGrips}>
              Retry
            </button>
          </div>
        ) : (
          <div className={setupDisabled ? 'roll-grips--locked' : undefined}>
            <GripSelector
              grips={grips}
              mode={mode}
              selectedGripIds={selectedGripIds}
              onToggle={onToggleGrip}
              isDisabled={setupDisabled}
            />
          </div>
        )}
      </section>

      <section className="roll-control-group" aria-labelledby="roll-auto-heading">
        <h4 id="roll-auto-heading">Auto Roll</h4>
        <p className="roll-control-help">
          Let SimRoll choose several backend-valid moves.
        </p>
        <div className="roll-auto__controls">
          <label>
            <span>Steps</span>
            <select
              value={autoRollStepCount}
              disabled={isAutoRollDisabled}
              onChange={(event) =>
                onAutoRollStepCountChange(Number(event.target.value))
              }
            >
              {autoRollStepOptions.map((stepCount) => (
                <option key={stepCount} value={stepCount}>
                  {stepCount}
                </option>
              ))}
            </select>
          </label>
          <button
            className="roll-auto-action"
            type="button"
            disabled={isAutoRollDisabled}
            onClick={onAutoRoll}
          >
            {isAutoRollLoading ? 'Rolling...' : 'Auto Roll'}
          </button>
        </div>
      </section>
    </aside>
  )
}
