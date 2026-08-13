import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getGrips,
  getRollAvailableTransitions,
  performRollStep,
} from '../api/client'
import type {
  GrapplingMode,
  GrapplingStateResponse,
  Grip,
  Position,
  Transition,
} from '../types/api'
import { formatReadable } from '../utils/format'
import {
  filterGripIdsForMode,
  getInitialMode,
} from '../utils/grapplingState'
import { GripSelector } from './GripSelector'
import { RollTransitionCard } from './RollTransitionCard'

interface RollSimulatorProps {
  positions: Position[]
}

interface LastStep {
  transition: Transition
  fromPositionId: string
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function RollSimulator({ positions }: RollSimulatorProps) {
  const initialPosition = positions[0]
  const [grips, setGrips] = useState<Grip[]>([])
  const [isGripsLoading, setIsGripsLoading] = useState(true)
  const [gripsError, setGripsError] = useState<string | null>(null)
  const [gripsRequestKey, setGripsRequestKey] = useState(0)
  const [startPositionId, setStartPositionId] = useState(
    initialPosition?.id ?? '',
  )
  const [mode, setMode] = useState<GrapplingMode>(
    initialPosition ? getInitialMode(initialPosition) : 'gi',
  )
  const [selectedGripIds, setSelectedGripIds] = useState<string[]>([])
  const [currentState, setCurrentState] =
    useState<GrapplingStateResponse | null>(null)
  const [availableTransitions, setAvailableTransitions] = useState<
    Transition[]
  >([])
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  )
  const [availabilityRequestKey, setAvailabilityRequestKey] = useState(0)
  const [isStepLoading, setIsStepLoading] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [failedTransitionId, setFailedTransitionId] = useState<
    string | null | undefined
  >(undefined)
  const [lastStep, setLastStep] = useState<LastStep | null>(null)
  const [isRandomDeadEnd, setIsRandomDeadEnd] = useState(false)
  const availabilityRequestId = useRef(0)
  const rollVersion = useRef(0)
  const stepController = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadGrips() {
      setIsGripsLoading(true)
      setGripsError(null)

      try {
        setGrips(await getGrips(controller.signal))
      } catch (requestError) {
        if (!isAbortError(requestError)) {
          console.error(
            'Unable to load grips for the roll simulator.',
            requestError,
          )
          setGripsError('Unable to load starting grips.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsGripsLoading(false)
        }
      }
    }

    void loadGrips()

    return () => controller.abort()
  }, [gripsRequestKey])

  useEffect(() => {
    if (!currentState) {
      return
    }

    const controller = new AbortController()
    const requestId = ++availabilityRequestId.current
    const state = currentState

    async function loadAvailableTransitions() {
      setAvailableTransitions([])
      setIsAvailabilityLoading(true)
      setAvailabilityError(null)

      try {
        const transitions = await getRollAvailableTransitions(
          { state },
          controller.signal,
        )

        if (requestId === availabilityRequestId.current) {
          setAvailableTransitions(transitions)
        }
      } catch (requestError) {
        if (
          !isAbortError(requestError) &&
          requestId === availabilityRequestId.current
        ) {
          console.error('Unable to load roll transitions.', requestError)
          setAvailabilityError('Unable to load available moves.')
        }
      } finally {
        if (
          !controller.signal.aborted &&
          requestId === availabilityRequestId.current
        ) {
          setIsAvailabilityLoading(false)
        }
      }
    }

    void loadAvailableTransitions()

    return () => controller.abort()
  }, [currentState, availabilityRequestKey])

  useEffect(
    () => () => {
      rollVersion.current += 1
      availabilityRequestId.current += 1
      stepController.current?.abort()
    },
    [],
  )

  const positionNames = useMemo(
    () => new Map(positions.map((position) => [position.id, position.name])),
    [positions],
  )
  const gripNames = useMemo(
    () => new Map(grips.map((grip) => [grip.id, grip.name])),
    [grips],
  )
  const selectedGripIdSet = useMemo(
    () => new Set(selectedGripIds),
    [selectedGripIds],
  )
  const selectedPosition =
    positions.find((position) => position.id === startPositionId) ?? null
  const resolvePositionName = (positionId: string) =>
    positionNames.get(positionId) ?? formatReadable(positionId)
  const resolveGripName = (gripId: string) =>
    gripNames.get(gripId) ?? formatReadable(gripId)

  const handlePositionChange = (positionId: string) => {
    const position = positions.find((item) => item.id === positionId)

    if (!position) {
      return
    }

    const nextMode = getInitialMode(position)
    setStartPositionId(position.id)
    setMode(nextMode)
    setSelectedGripIds((currentIds) =>
      filterGripIdsForMode(currentIds, grips, nextMode),
    )
  }

  const handleModeChange = (nextMode: GrapplingMode) => {
    if (
      !selectedPosition ||
      (nextMode === 'gi' && !selectedPosition.gi_allowed) ||
      (nextMode === 'no_gi' && !selectedPosition.no_gi_allowed)
    ) {
      return
    }

    setMode(nextMode)
    setSelectedGripIds((currentIds) =>
      filterGripIdsForMode(currentIds, grips, nextMode),
    )
  }

  const toggleGrip = (gripId: string) => {
    setSelectedGripIds((currentIds) =>
      currentIds.includes(gripId)
        ? currentIds.filter((currentId) => currentId !== gripId)
        : [...currentIds, gripId],
    )
  }

  const startRoll = () => {
    if (!selectedPosition) {
      return
    }

    rollVersion.current += 1
    setLastStep(null)
    setStepError(null)
    setFailedTransitionId(undefined)
    setIsRandomDeadEnd(false)
    setAvailableTransitions([])
    setIsAvailabilityLoading(true)
    setCurrentState({
      position_id: selectedPosition.id,
      mode,
      active_grips: [...selectedGripIds],
    })
  }

  const applyStep = async (transitionId: string | null) => {
    if (!currentState || stepController.current) {
      return
    }

    const controller = new AbortController()
    const version = rollVersion.current
    const state = currentState
    stepController.current = controller
    setIsStepLoading(true)
    setStepError(null)
    setFailedTransitionId(undefined)

    try {
      const response = await performRollStep(
        { state, transition_id: transitionId },
        controller.signal,
      )

      if (controller.signal.aborted || version !== rollVersion.current) {
        return
      }

      if (response.transition === null && response.next_state === null) {
        setAvailableTransitions([])
        setIsRandomDeadEnd(true)
        return
      }

      if (response.transition === null || response.next_state === null) {
        throw new Error('The roll step response was incomplete.')
      }

      setLastStep({
        transition: response.transition,
        fromPositionId: state.position_id,
      })
      setAvailableTransitions([])
      setIsAvailabilityLoading(true)
      setIsRandomDeadEnd(false)
      setCurrentState(response.next_state)
    } catch (requestError) {
      if (!isAbortError(requestError) && version === rollVersion.current) {
        console.error('Unable to apply the roll transition.', requestError)
        setStepError('Unable to apply this move.')
        setFailedTransitionId(transitionId)
      }
    } finally {
      if (stepController.current === controller) {
        stepController.current = null
      }

      if (!controller.signal.aborted && version === rollVersion.current) {
        setIsStepLoading(false)
      }
    }
  }

  const resetRoll = () => {
    rollVersion.current += 1
    availabilityRequestId.current += 1
    stepController.current?.abort()
    stepController.current = null
    setCurrentState(null)
    setAvailableTransitions([])
    setIsAvailabilityLoading(false)
    setAvailabilityError(null)
    setIsStepLoading(false)
    setStepError(null)
    setFailedTransitionId(undefined)
    setLastStep(null)
    setIsRandomDeadEnd(false)
  }

  if (!currentState) {
    return (
      <div className="roll-simulator roll-setup">
        <div className="roll-introduction">
          <p className="section-label">New roll</p>
          <h3>Set your starting state</h3>
          <p>
            Choose a position, mode, and any active grips. The backend will
            decide which moves are valid once the roll starts.
          </p>
        </div>

        <div className="roll-setup__form">
          <label className="roll-position-select">
            <span>Starting position</span>
            <select
              value={startPositionId}
              onChange={(event) => handlePositionChange(event.target.value)}
            >
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="mode-selector">
            <legend>Mode</legend>
            <div className="segmented-control">
              <label>
                <input
                  type="radio"
                  name="roll-setup-mode"
                  value="gi"
                  checked={mode === 'gi'}
                  disabled={!selectedPosition?.gi_allowed}
                  onChange={() => handleModeChange('gi')}
                />
                <span>Gi</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="roll-setup-mode"
                  value="no_gi"
                  checked={mode === 'no_gi'}
                  disabled={!selectedPosition?.no_gi_allowed}
                  onChange={() => handleModeChange('no_gi')}
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
              <button
                type="button"
                onClick={() => setGripsRequestKey((key) => key + 1)}
              >
                Retry
              </button>
            </div>
          ) : (
            <GripSelector
              grips={grips}
              mode={mode}
              selectedGripIds={selectedGripIdSet}
              onToggle={toggleGrip}
            />
          )}

          <button
            className="roll-primary-action"
            type="button"
            disabled={!selectedPosition || isGripsLoading || !!gripsError}
            onClick={startRoll}
          >
            Start Roll
          </button>
        </div>
      </div>
    )
  }

  const isDeadEnd =
    isRandomDeadEnd ||
    (!isAvailabilityLoading &&
      availabilityError === null &&
      availableTransitions.length === 0)

  return (
    <div className="roll-simulator roll-active">
      <div className="roll-status-bar">
        <p className="section-label">Roll in progress</p>
        <button type="button" onClick={resetRoll}>
          Start New Roll
        </button>
      </div>

      <section className="roll-current-state" aria-labelledby="roll-state-heading">
        <div>
          <p className="section-label">Current position</p>
          <h3 id="roll-state-heading">
            {resolvePositionName(currentState.position_id)}
          </h3>
        </div>
        <dl>
          <div>
            <dt>Mode</dt>
            <dd>{currentState.mode === 'gi' ? 'Gi' : 'No-Gi'}</dd>
          </div>
          <div>
            <dt>Active grips</dt>
            <dd>
              {currentState.active_grips.length > 0
                ? currentState.active_grips.map(resolveGripName).join(', ')
                : 'None'}
            </dd>
          </div>
        </dl>
      </section>

      {lastStep && (
        <section className="roll-last-step" aria-label="Last move">
          <p className="section-label">Last move</p>
          <strong>{lastStep.transition.name}</strong>
          <span>
            {resolvePositionName(lastStep.fromPositionId)} →{' '}
            {resolvePositionName(currentState.position_id)}
          </span>
        </section>
      )}

      <section className="roll-moves" aria-labelledby="roll-moves-heading">
        <div className="roll-moves__heading">
          <div>
            <p className="section-label">Available moves</p>
            <h3 id="roll-moves-heading">Choose your next transition</h3>
          </div>
          {!isAvailabilityLoading && !availabilityError && !isDeadEnd && (
            <span>{availableTransitions.length} available</span>
          )}
        </div>

        {isStepLoading && (
          <p className="roll-progress" role="status">
            <span className="spinner" aria-hidden="true" />
            Applying move...
          </p>
        )}

        {stepError && (
          <div className="scoped-error" role="alert">
            <span>{stepError} Your current state has not changed.</span>
            <button
              type="button"
              disabled={isStepLoading}
              onClick={() => void applyStep(failedTransitionId ?? null)}
            >
              Try again
            </button>
          </div>
        )}

        {isAvailabilityLoading && (
          <p className="roll-progress" role="status">
            <span className="spinner" aria-hidden="true" />
            Loading available moves...
          </p>
        )}

        {availabilityError && (
          <div className="scoped-error" role="alert">
            <span>{availabilityError}</span>
            <button
              type="button"
              onClick={() => setAvailabilityRequestKey((key) => key + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {isDeadEnd && (
          <div className="roll-dead-end">
            <p className="section-label">Roll paused</p>
            <strong>
              No valid moves are available from{' '}
              {resolvePositionName(currentState.position_id)}.
            </strong>
            <button type="button" onClick={resetRoll}>
              Start New Roll
            </button>
          </div>
        )}

        {!isAvailabilityLoading && !availabilityError && !isDeadEnd && (
          <>
            <ul className="roll-transition-list">
              {availableTransitions.map((transition) => (
                <li key={transition.id}>
                  <RollTransitionCard
                    transition={transition}
                    destinationName={resolvePositionName(
                      transition.to_position,
                    )}
                    resolveGripName={resolveGripName}
                    isDisabled={isStepLoading}
                    onUse={(transitionId) => void applyStep(transitionId)}
                  />
                </li>
              ))}
            </ul>

            <button
              className="roll-surprise-action"
              type="button"
              disabled={isStepLoading}
              onClick={() => void applyStep(null)}
            >
              Surprise Me
            </button>
          </>
        )}
      </section>
    </div>
  )
}
