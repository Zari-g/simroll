import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getGrips,
  getRollAvailableTransitions,
  getTransitions,
  performRollStep,
  simulateRoll,
} from '../api/client'
import { getPositionVisual } from '../grappling/positionVisuals'
import { resolveVisualPose } from '../grappling/resolveVisualPose'
import { usePoseAnimation } from '../hooks/usePoseAnimation'
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
import { getHistoricalTransition } from '../utils/rollPlayback'
import { AvailableMovesPanel } from './AvailableMovesPanel'
import { GrapplingStage } from './GrapplingStage'
import { RollControlPanel } from './RollControlPanel'
import { RollHistory } from './RollHistory'

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

function resolveStateVisualPoses(state: GrapplingStateResponse) {
  const visual = getPositionVisual(state.position_id)
  return visual ? resolveVisualPose(visual, state.active_grips).poses : null
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
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<
    number | null
  >(null)
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
  const playbackGeneration = useRef(0)
  const stepController = useRef<AbortController | null>(null)
  const autoRollController = useRef<AbortController | null>(null)
  const poseAnimation = usePoseAnimation()

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
      playbackGeneration.current += 1
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
    playbackGeneration.current += 1
    poseAnimation.cancel()
    setSelectedHistoryIndex(null)
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
      selectedHistoryIndex !== null ||
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

      const startPoses = resolveStateVisualPoses(state)
      const endPoses = resolveStateVisualPoses(response.next_state)
      if (startPoses && endPoses) {
        await poseAnimation.play({
          transitionId: response.transition.id,
          transitionName: response.transition.name,
          startPoses,
          endPoses,
        })
      }

      if (controller.signal.aborted || version !== rollVersion.current) {
        return
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
      selectedHistoryIndex !== null ||
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
    playbackGeneration.current += 1
    poseAnimation.cancel()
    setSelectedHistoryIndex(null)
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

  const returnToLive = () => {
    playbackGeneration.current += 1
    poseAnimation.cancel()
    setSelectedHistoryIndex(null)
  }

  const selectHistoryState = (stateIndex: number) => {
    if (
      stepController.current ||
      autoRollController.current ||
      !history.states[stateIndex]
    ) {
      return
    }

    if (stateIndex === history.states.length - 1) {
      returnToLive()
      return
    }

    playbackGeneration.current += 1
    poseAnimation.cancel()
    setSelectedHistoryIndex(stateIndex)
  }

  const showPreviousHistoryState = () => {
    if (selectedHistoryIndex === null || selectedHistoryIndex <= 0) return

    selectHistoryState(selectedHistoryIndex - 1)
  }

  const showNextHistoryState = () => {
    if (selectedHistoryIndex === null) return

    const nextIndex = selectedHistoryIndex + 1
    if (nextIndex >= history.states.length - 1) {
      returnToLive()
    } else {
      selectHistoryState(nextIndex)
    }
  }

  const replayHistoricalTransition = async () => {
    if (selectedHistoryIndex === null || poseAnimation.isAnimating) return

    const historicalTransition = getHistoricalTransition(
      history.states,
      history.transitionIds,
      selectedHistoryIndex,
    )
    if (!historicalTransition) return

    const replayGeneration = ++playbackGeneration.current
    poseAnimation.cancel()

    const startPoses = resolveStateVisualPoses(historicalTransition.startState)
    const endPoses = resolveStateVisualPoses(historicalTransition.endState)
    if (startPoses && endPoses) {
      await poseAnimation.play({
        transitionId: historicalTransition.transitionId,
        transitionName: resolveTransitionName(
          historicalTransition.transitionId,
        ),
        startPoses,
        endPoses,
      })
    }

    if (replayGeneration === playbackGeneration.current) {
      setSelectedHistoryIndex(historicalTransition.transitionIndex + 1)
    }
  }

  const playbackState =
    selectedHistoryIndex === null
      ? null
      : history.states[selectedHistoryIndex] ?? null
  const isPlaybackActive = playbackState !== null
  const isPlaybackReplaying =
    isPlaybackActive && poseAnimation.isAnimating
  const isDeadEnd =
    currentState !== null &&
    (isRandomDeadEnd ||
      isAutoDeadEnd ||
      (!isAvailabilityLoading &&
        availabilityError === null &&
        availableTransitions.length === 0))
  const isRollMutationLoading =
    isStepLoading || isAutoRollLoading || poseAnimation.isAnimating
  const isAutoRollDisabled =
    !currentState ||
    isPlaybackActive ||
    isRollMutationLoading ||
    isAvailabilityLoading ||
    availabilityError !== null ||
    isDeadEnd
  const configuredGripNames = selectedGripIds.map(resolveGripName)
  const configuredPositionName = selectedPosition
    ? resolvePositionName(selectedPosition.id)
    : 'No position selected'

  return (
    <div className="roll-simulator">
      <div className="roll-simulator__workspace">
        <RollControlPanel
          positions={positions}
          selectedPosition={selectedPosition}
          startPositionId={startPositionId}
          mode={mode}
          grips={grips}
          selectedGripIds={selectedGripIdSet}
          isRollActive={currentState !== null}
          isPlaybackActive={isPlaybackActive}
          isGripsLoading={isGripsLoading}
          gripsError={gripsError}
          isMutationLoading={isRollMutationLoading}
          isAvailabilityLoading={isAvailabilityLoading}
          hasAvailabilityError={availabilityError !== null}
          isDeadEnd={isDeadEnd}
          autoRollStepCount={autoRollStepCount}
          autoRollStepOptions={AUTO_ROLL_STEP_OPTIONS}
          isAutoRollDisabled={isAutoRollDisabled}
          isAutoRollLoading={isAutoRollLoading}
          onPositionChange={handlePositionChange}
          onModeChange={handleModeChange}
          onToggleGrip={toggleGrip}
          onRetryGrips={() => setGripsRequestKey((key) => key + 1)}
          onStartRoll={startRoll}
          onRandomStep={() => void applyStep(null)}
          onAutoRollStepCountChange={(stepCount) =>
            setAutoRollStepCount(stepCount as AutoRollStepCount)
          }
          onAutoRoll={() => void runAutoRoll(autoRollStepCount)}
          onReset={resetRoll}
        />

        <GrapplingStage
          currentState={currentState}
          playbackState={playbackState}
          playbackStateIndex={selectedHistoryIndex}
          configuredPositionId={startPositionId}
          configuredPositionName={configuredPositionName}
          configuredMode={mode}
          configuredGripIds={selectedGripIds}
          configuredGripNames={configuredGripNames}
          stepCount={history.transitionIds.length}
          isMutationLoading={isRollMutationLoading}
          animatedPoses={poseAnimation.display?.poses ?? null}
          animatedTransitionName={
            poseAnimation.display?.transitionName ?? null
          }
          resolvePositionName={resolvePositionName}
          resolveGripName={resolveGripName}
        />

        <AvailableMovesPanel
          transitions={availableTransitions}
          currentPositionName={
            currentState ? resolvePositionName(currentState.position_id) : null
          }
          isRollActive={currentState !== null}
          isPlaybackActive={isPlaybackActive}
          isLoading={isAvailabilityLoading}
          isStepLoading={isStepLoading}
          isMutationLoading={isRollMutationLoading}
          isDeadEnd={isDeadEnd}
          availabilityError={availabilityError}
          stepError={stepError}
          autoRollError={autoRollError}
          autoRollStatus={autoRollStatus}
          failedTransitionId={failedTransitionId}
          resolvePositionName={resolvePositionName}
          resolveGripName={resolveGripName}
          onUseTransition={(transitionId) => void applyStep(transitionId)}
          onRetryStep={() => void applyStep(failedTransitionId ?? null)}
          onRetryAvailability={() =>
            setAvailabilityRequestKey((key) => key + 1)
          }
          onRetryAutoRoll={() => void runAutoRoll(failedAutoRollStepCount)}
          onReset={resetRoll}
          onReturnToLive={returnToLive}
        />
      </div>

      {currentState && (
        <RollHistory
          states={history.states}
          transitionIds={history.transitionIds}
          resolvePositionName={resolvePositionName}
          resolveGripName={resolveGripName}
          resolveTransitionName={resolveTransitionName}
          selectedStateIndex={selectedHistoryIndex}
          isReplaying={isPlaybackReplaying}
          isSelectionDisabled={isStepLoading || isAutoRollLoading}
          onSelectState={selectHistoryState}
          onPrevious={showPreviousHistoryState}
          onReplay={() => void replayHistoricalTransition()}
          onNext={showNextHistoryState}
          onReturnToLive={returnToLive}
        />
      )}
    </div>
  )
}
