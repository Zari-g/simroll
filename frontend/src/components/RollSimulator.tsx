import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getGrips,
  getRollAvailableTransitions,
  getTransitions,
  performRollStep,
  simulateRoll,
} from '../api/client'
import type {
  GrapplingMode,
  GrapplingStateResponse,
  Grip,
  Position,
  RollSimulationResponse,
  Transition,
} from '../types/api'
import { formatReadable } from '../utils/format'
import {
  filterGripIdsForMode,
  getInitialMode,
} from '../utils/grapplingState'
import { GripSelector } from './GripSelector'
import { RollHistory } from './RollHistory'
import { RollTransitionCard } from './RollTransitionCard'

interface RollSimulatorProps {
  positions: Position[]
}

interface RollHistoryData {
  states: GrapplingStateResponse[]
  transitionIds: string[]
}

interface AutoRollStatus {
  kind: 'completed' | 'dead_end'
  message: string
}

const AUTO_ROLL_STEP_OPTIONS = [5, 10] as const
type AutoRollStepCount = (typeof AUTO_ROLL_STEP_OPTIONS)[number]

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function statesMatch(
  left: GrapplingStateResponse,
  right: GrapplingStateResponse,
) {
  if (left.position_id !== right.position_id || left.mode !== right.mode) {
    return false
  }

  const leftGrips = [...left.active_grips].sort()
  const rightGrips = [...right.active_grips].sort()

  return (
    leftGrips.length === rightGrips.length &&
    leftGrips.every((gripId, index) => gripId === rightGrips[index])
  )
}

function isValidSimulationResponse(
  response: RollSimulationResponse,
  expectedStartState: GrapplingStateResponse,
  requestedMaxSteps: number,
) {
  const path = response.path

  if (
    !path ||
    !Array.isArray(path.states) ||
    !Array.isArray(path.transition_ids) ||
    !Number.isInteger(path.step_count) ||
    path.step_count < 0 ||
    path.step_count > requestedMaxSteps ||
    (response.stop_reason !== 'max_steps' &&
      response.stop_reason !== 'no_available_transitions') ||
    path.states.length !== path.transition_ids.length + 1 ||
    path.step_count !== path.transition_ids.length ||
    !path.transition_ids.every((transitionId) =>
      Boolean(transitionId && typeof transitionId === 'string'),
    ) ||
    !path.states.every(
      (state) =>
        state &&
        typeof state.position_id === 'string' &&
        (state.mode === 'gi' || state.mode === 'no_gi') &&
        Array.isArray(state.active_grips) &&
        state.active_grips.every((gripId) => typeof gripId === 'string'),
    )
  ) {
    return false
  }

  return statesMatch(path.states[0], expectedStartState)
}

export function RollSimulator({ positions }: RollSimulatorProps) {
  const initialPosition = positions[0]
  const [grips, setGrips] = useState<Grip[]>([])
  const [isGripsLoading, setIsGripsLoading] = useState(true)
  const [gripsError, setGripsError] = useState<string | null>(null)
  const [gripsRequestKey, setGripsRequestKey] = useState(0)
  const [transitionCatalog, setTransitionCatalog] = useState<Transition[]>([])
  const [startPositionId, setStartPositionId] = useState(
    initialPosition?.id ?? '',
  )
  const [mode, setMode] = useState<GrapplingMode>(
    initialPosition ? getInitialMode(initialPosition) : 'gi',
  )
  const [selectedGripIds, setSelectedGripIds] = useState<string[]>([])
  const [currentState, setCurrentState] =
    useState<GrapplingStateResponse | null>(null)
  const [history, setHistory] = useState<RollHistoryData>({
    states: [],
    transitionIds: [],
  })
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
  const [isRandomDeadEnd, setIsRandomDeadEnd] = useState(false)
  const [autoRollStepCount, setAutoRollStepCount] =
    useState<AutoRollStepCount>(5)
  const [isAutoRollLoading, setIsAutoRollLoading] = useState(false)
  const [autoRollError, setAutoRollError] = useState<string | null>(null)
  const [failedAutoRollStepCount, setFailedAutoRollStepCount] =
    useState<AutoRollStepCount>(5)
  const [autoRollStatus, setAutoRollStatus] =
    useState<AutoRollStatus | null>(null)
  const [isAutoDeadEnd, setIsAutoDeadEnd] = useState(false)
  const availabilityRequestId = useRef(0)
  const rollVersion = useRef(0)
  const stepController = useRef<AbortController | null>(null)
  const autoRollController = useRef<AbortController | null>(null)

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
    const controller = new AbortController()

    async function loadTransitionCatalog() {
      try {
        setTransitionCatalog(await getTransitions(controller.signal))
      } catch (requestError) {
        if (!isAbortError(requestError)) {
          console.warn(
            'Unable to load transition names for roll history.',
            requestError,
          )
        }
      }
    }

    void loadTransitionCatalog()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!currentState || isAutoDeadEnd) {
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
  }, [currentState, availabilityRequestKey, isAutoDeadEnd])

  useEffect(
    () => () => {
      rollVersion.current += 1
      availabilityRequestId.current += 1
      stepController.current?.abort()
      autoRollController.current?.abort()
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
  const transitionNames = useMemo(
    () =>
      new Map(
        transitionCatalog.map((transition) => [
          transition.id,
          transition.name,
        ]),
      ),
    [transitionCatalog],
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
  const resolveTransitionName = (transitionId: string) =>
    transitionNames.get(transitionId) ?? formatReadable(transitionId)

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

    const startingState: GrapplingStateResponse = {
      position_id: selectedPosition.id,
      mode,
      active_grips: [...selectedGripIds],
    }

    rollVersion.current += 1
    stepController.current?.abort()
    autoRollController.current?.abort()
    stepController.current = null
    autoRollController.current = null
    setStepError(null)
    setFailedTransitionId(undefined)
    setIsRandomDeadEnd(false)
    setAutoRollError(null)
    setAutoRollStatus(null)
    setIsAutoDeadEnd(false)
    setAvailableTransitions([])
    setIsAvailabilityLoading(true)
    setHistory({ states: [startingState], transitionIds: [] })
    setCurrentState(startingState)
  }

  const applyStep = async (transitionId: string | null) => {
    if (
      !currentState ||
      stepController.current ||
      autoRollController.current
    ) {
      return
    }

    const controller = new AbortController()
    const version = rollVersion.current
    const state = currentState
    stepController.current = controller
    setIsStepLoading(true)
    setStepError(null)
    setFailedTransitionId(undefined)
    setAutoRollError(null)
    setAutoRollStatus(null)

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

      setHistory((currentHistory) => ({
        states: [...currentHistory.states, response.next_state!],
        transitionIds: [
          ...currentHistory.transitionIds,
          response.transition!.id,
        ],
      }))
      setAvailableTransitions([])
      setIsAvailabilityLoading(true)
      setIsRandomDeadEnd(false)
      setIsAutoDeadEnd(false)
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

  const runAutoRoll = async (stepCount: AutoRollStepCount) => {
    if (
      !currentState ||
      stepController.current ||
      autoRollController.current
    ) {
      return
    }

    const controller = new AbortController()
    const version = rollVersion.current
    const state = currentState
    autoRollController.current = controller
    setIsAutoRollLoading(true)
    setAutoRollError(null)
    setAutoRollStatus(null)
    setFailedAutoRollStepCount(stepCount)
    setStepError(null)
    setFailedTransitionId(undefined)

    try {
      const response = await simulateRoll(
        { start_state: state, max_steps: stepCount },
        controller.signal,
      )

      if (controller.signal.aborted || version !== rollVersion.current) {
        return
      }

      if (!isValidSimulationResponse(response, state, stepCount)) {
        throw new Error('The Auto Roll response path was inconsistent.')
      }

      const { path, stop_reason: stopReason } = response

      if (path.step_count > 0) {
        const finalState = path.states[path.states.length - 1]

        setHistory((currentHistory) => ({
          states: [...currentHistory.states, ...path.states.slice(1)],
          transitionIds: [
            ...currentHistory.transitionIds,
            ...path.transition_ids,
          ],
        }))
        setAvailableTransitions([])
        setCurrentState(finalState)
      }

      setIsRandomDeadEnd(false)

      if (stopReason === 'no_available_transitions') {
        availabilityRequestId.current += 1
        setAvailableTransitions([])
        setAvailabilityError(null)
        setIsAvailabilityLoading(false)
        setIsAutoDeadEnd(true)
        setAutoRollStatus({
          kind: 'dead_end',
          message:
            path.step_count === 0
              ? 'Auto Roll could not begin because no valid moves remain.'
              : `Auto Roll stopped after ${path.step_count} ${
                  path.step_count === 1 ? 'step' : 'steps'
                } because no valid moves remain.`,
        })
      } else {
        setIsAutoDeadEnd(false)
        if (path.step_count > 0) {
          setIsAvailabilityLoading(true)
        }
        setAutoRollStatus({
          kind: 'completed',
          message: `Auto Roll completed ${path.step_count} ${
            path.step_count === 1 ? 'step' : 'steps'
          }. You can choose the next move or Auto Roll again.`,
        })
      }
    } catch (requestError) {
      if (!isAbortError(requestError) && version === rollVersion.current) {
        console.error('Unable to complete Auto Roll.', requestError)
        setAutoRollError(
          'Unable to complete Auto Roll. Your current roll has not changed.',
        )
      }
    } finally {
      if (autoRollController.current === controller) {
        autoRollController.current = null
      }

      if (!controller.signal.aborted && version === rollVersion.current) {
        setIsAutoRollLoading(false)
      }
    }
  }

  const resetRoll = () => {
    rollVersion.current += 1
    availabilityRequestId.current += 1
    stepController.current?.abort()
    autoRollController.current?.abort()
    stepController.current = null
    autoRollController.current = null
    setCurrentState(null)
    setHistory({ states: [], transitionIds: [] })
    setAvailableTransitions([])
    setIsAvailabilityLoading(false)
    setAvailabilityError(null)
    setIsStepLoading(false)
    setStepError(null)
    setFailedTransitionId(undefined)
    setIsRandomDeadEnd(false)
    setIsAutoRollLoading(false)
    setAutoRollError(null)
    setAutoRollStatus(null)
    setIsAutoDeadEnd(false)
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
    isAutoDeadEnd ||
    (!isAvailabilityLoading &&
      availabilityError === null &&
      availableTransitions.length === 0)
  const isRollMutationLoading = isStepLoading || isAutoRollLoading
  const isAutoRollDisabled =
    isRollMutationLoading ||
    isAvailabilityLoading ||
    availabilityError !== null ||
    isDeadEnd

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

      <div className="roll-active__layout">
        <div className="roll-active__controls">
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
                  disabled={isRollMutationLoading}
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
                  disabled={isRollMutationLoading}
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
                        isDisabled={isRollMutationLoading}
                        onUse={(transitionId) => void applyStep(transitionId)}
                      />
                    </li>
                  ))}
                </ul>

                <button
                  className="roll-surprise-action"
                  type="button"
                  disabled={isRollMutationLoading}
                  onClick={() => void applyStep(null)}
                >
                  Surprise Me
                </button>
              </>
            )}
          </section>

          <section className="roll-auto" aria-labelledby="roll-auto-heading">
            <div>
              <p className="section-label">Auto Roll</p>
              <h3 id="roll-auto-heading">Keep the roll moving</h3>
              <p>
                Let SimRoll choose several backend-valid moves from your current
                state.
              </p>
            </div>

            <div className="roll-auto__controls">
              <label>
                <span>Steps</span>
                <select
                  value={autoRollStepCount}
                  disabled={isAutoRollDisabled}
                  onChange={(event) =>
                    setAutoRollStepCount(
                      Number(event.target.value) as AutoRollStepCount,
                    )
                  }
                >
                  {AUTO_ROLL_STEP_OPTIONS.map((stepCount) => (
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
                onClick={() => void runAutoRoll(autoRollStepCount)}
              >
                Auto Roll
              </button>
            </div>

            {isAutoRollLoading && (
              <p className="roll-progress roll-auto__progress" role="status">
                <span className="spinner" aria-hidden="true" />
                Simulating roll...
              </p>
            )}

            {autoRollError && (
              <div className="scoped-error" role="alert">
                <span>{autoRollError}</span>
                <button
                  type="button"
                  disabled={isRollMutationLoading}
                  onClick={() => void runAutoRoll(failedAutoRollStepCount)}
                >
                  Try again
                </button>
              </div>
            )}

            {autoRollStatus && (
              <p
                className={`roll-auto__status roll-auto__status--${autoRollStatus.kind}`}
                role="status"
              >
                {autoRollStatus.message}
              </p>
            )}
          </section>
        </div>

        <RollHistory
          states={history.states}
          transitionIds={history.transitionIds}
          resolvePositionName={resolvePositionName}
          resolveGripName={resolveGripName}
          resolveTransitionName={resolveTransitionName}
        />
      </div>
    </div>
  )
}
