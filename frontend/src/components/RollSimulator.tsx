import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getGrips,
  getRollAvailableTransitions,
  getTransitions,
  performRollStep,
  simulateRoll,
} from '../api/client'
import {
  createGrapplingDisplayState,
  displayStateFromResponse,
  resolveGrapplingDisplayState,
} from '../grappling/displayState'
import { resolvePositionContacts } from '../grappling/contacts'
import { getPositionVisual } from '../grappling/positionVisuals'
import { resolveVisualPose } from '../grappling/resolveVisualPose'
import { usePoseAnimation } from '../hooks/usePoseAnimation'
import type {
  GrapplingMode,
  GrapplingStateResponse,
  Grip,
  Position,
  RollAction,
  RollSimulationResponse,
  Transition,
} from '../types/api'
import { formatReadable } from '../utils/format'
import {
  filterGripIdsForMode,
  getInitialMode,
} from '../utils/grapplingState'
import { getHistoricalTransition } from '../utils/rollPlayback'
import { formatSimulationResult } from '../utils/simulationResult'
import {
  activeControlIds,
  activeControlKey,
  activeVisualControls,
  starterControls,
} from '../utils/activeControls'
import { AvailableMovesPanel } from './AvailableMovesPanel'
import { GrapplingStage } from './GrapplingStage'
import { RollControlPanel } from './RollControlPanel'
import { RollHistory } from './RollHistory'

interface RollSimulatorProps {
  positions: Position[]
}

interface RollHistoryData {
  states: GrapplingStateResponse[]
  actions: RollAction[]
}

interface AutoRollStatus {
  kind: 'completed' | 'dead_end' | 'submission'
  message: string
}

const AUTO_ROLL_STEP_OPTIONS = [5, 10] as const
type AutoRollStepCount = (typeof AUTO_ROLL_STEP_OPTIONS)[number]

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function resolveStateVisual(state: GrapplingStateResponse) {
  const visual = getPositionVisual(state.position_id)
  if (!visual) return null
  const resolved = resolveVisualPose(
    visual,
    activeControlIds(state.active_controls),
  )
  return {
    displayState: displayStateFromResponse(state),
    poses: resolved.poses,
    contacts: [...resolvePositionContacts(visual), ...resolved.gripContacts],
    controls: activeVisualControls(state.active_controls),
  }
}

function statesMatch(
  left: GrapplingStateResponse,
  right: GrapplingStateResponse,
) {
  if (left.position_id !== right.position_id || left.mode !== right.mode) {
    return false
  }

  const leftControls = left.active_controls.map(activeControlKey).sort()
  const rightControls = right.active_controls.map(activeControlKey).sort()

  return (
    leftControls.length === rightControls.length &&
    leftControls.every((control, index) => control === rightControls[index])
  )
}

function isValidSimulationResponse(
  response: RollSimulationResponse,
  expectedStartState: GrapplingStateResponse,
  requestedMaxSteps: number,
) {
  const path = response.path
  const finalAction = path?.actions?.at(-1)

  if (
    !path ||
    !Array.isArray(path.states) ||
    !Array.isArray(path.actions) ||
    !Array.isArray(path.action_ids) ||
    !Number.isInteger(path.total_events) ||
    path.total_events < 0 ||
    path.total_events > requestedMaxSteps ||
    (response.stop_reason !== 'submission' &&
      response.stop_reason !== 'max_steps' &&
      response.stop_reason !== 'no_available_transitions') ||
    path.states.length !== path.actions.length + 1 ||
    path.total_events !== path.actions.length ||
    path.action_ids.length !== path.actions.length ||
    path.positional_steps + path.control_actions !== path.total_events ||
    (response.stop_reason === 'submission' &&
      (finalAction?.action_type !== 'transition' || !finalAction.submission)) ||
    !path.actions.every((action, index) =>
      Boolean(
        action &&
          action.id === path.action_ids[index] &&
          (action.action_type === 'transition' ||
            action.action_type === 'control_change'),
      ),
    ) ||
    !path.states.every(
      (state) =>
        state &&
        typeof state.position_id === 'string' &&
        (state.mode === 'gi' || state.mode === 'no_gi') &&
        Array.isArray(state.active_controls) &&
        state.active_controls.every(
          (control) =>
            control &&
            typeof control.control_id === 'string' &&
            (control.owner === 'player_a' || control.owner === 'player_b') &&
            (control.target === 'player_a' || control.target === 'player_b') &&
            control.owner !== control.target,
        ),
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
    actions: [],
  })
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<
    number | null
  >(null)
  const [availableTransitions, setAvailableTransitions] = useState<RollAction[]>([])
  const [actionNames, setActionNames] = useState<Record<string, string>>({})
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
    if (!currentState || isAutoDeadEnd || isAutoRollLoading) {
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
  }, [
    currentState,
    availabilityRequestKey,
    isAutoDeadEnd,
    isAutoRollLoading,
  ])

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
    positionId
      ? positionNames.get(positionId) ?? formatReadable(positionId)
      : 'No position selected'
  const resolveGripName = (gripId: string) =>
    gripNames.get(gripId) ?? formatReadable(gripId)
  const resolveTransitionName = (transitionId: string) =>
    actionNames[transitionId] ??
    transitionNames.get(transitionId) ??
    formatReadable(transitionId)

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
      active_controls: starterControls(selectedGripIds),
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
    setHistory({ states: [startingState], actions: [] })
    setActionNames({})
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
        { state, action_id: transitionId },
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

      const startVisual = resolveStateVisual(state)
      const endVisual = resolveStateVisual(response.next_state)
      if (
        response.transition.action_type === 'transition' &&
        startVisual &&
        endVisual
      ) {
        await poseAnimation.play({
          transitionId: response.transition.id,
          transitionName: response.transition.name,
          startPoses: startVisual.poses,
          endPoses: endVisual.poses,
          startState: startVisual.displayState,
          endState: endVisual.displayState,
          startContacts: startVisual.contacts,
          endContacts: endVisual.contacts,
          startControls: startVisual.controls,
          endControls: endVisual.controls,
        })
      }

      if (controller.signal.aborted || version !== rollVersion.current) {
        return
      }

      setHistory((currentHistory) => ({
        states: [...currentHistory.states, response.next_state!],
        actions: [...currentHistory.actions, response.transition!],
      }))
      setActionNames((current) => ({
        ...current,
        [response.transition!.id]: response.transition!.name,
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

      if (path.total_events > 0) {
        setActionNames((current) => ({
          ...current,
          ...Object.fromEntries(path.actions.map((action) => [action.id, action.name])),
        }))
        for (let index = 0; index < path.actions.length; index += 1) {
          const action = path.actions[index]
          const transitionId = action.id
          const startState = path.states[index]
          const endState = path.states[index + 1]
          const startVisual = resolveStateVisual(startState)
          const endVisual = resolveStateVisual(endState)

          if (
            action.action_type === 'transition' &&
            startVisual &&
            endVisual
          ) {
            await poseAnimation.play({
              transitionId,
              transitionName: action.name,
              startPoses: startVisual.poses,
              endPoses: endVisual.poses,
              startState: startVisual.displayState,
              endState: endVisual.displayState,
              startContacts: startVisual.contacts,
              endContacts: endVisual.contacts,
              startControls: startVisual.controls,
              endControls: endVisual.controls,
            })
          }

          if (controller.signal.aborted || version !== rollVersion.current) {
            return
          }

          setHistory((currentHistory) => ({
            states: [...currentHistory.states, endState],
            actions: [...currentHistory.actions, action],
          }))
          setCurrentState(endState)
        }

        setAvailableTransitions([])
      }

      setIsRandomDeadEnd(false)

      if (stopReason === 'submission') {
        availabilityRequestId.current += 1
        setAvailableTransitions([])
        setAvailabilityError(null)
        setIsAvailabilityLoading(false)
        setIsAutoDeadEnd(true)
        setAutoRollStatus({
          kind: 'submission',
          message: formatSimulationResult(response),
        })
      } else if (stopReason === 'no_available_transitions') {
        availabilityRequestId.current += 1
        setAvailableTransitions([])
        setAvailabilityError(null)
        setIsAvailabilityLoading(false)
        setIsAutoDeadEnd(true)
        setAutoRollStatus({
          kind: 'dead_end',
          message: formatSimulationResult(response),
        })
      } else {
        setIsAutoDeadEnd(false)
        if (path.total_events > 0) {
          setIsAvailabilityLoading(true)
        }
        setAutoRollStatus({
          kind: 'completed',
          message: formatSimulationResult(response),
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
    setHistory({ states: [], actions: [] })
    setActionNames({})
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
      history.actions.map((action) => action.id),
      selectedHistoryIndex,
    )
    if (!historicalTransition) return

    const replayGeneration = ++playbackGeneration.current
    poseAnimation.cancel()

    const historicalAction = history.actions[historicalTransition.transitionIndex]
    const startVisual = resolveStateVisual(historicalTransition.startState)
    const endVisual = resolveStateVisual(historicalTransition.endState)
    if (
      historicalAction?.action_type === 'transition' &&
      startVisual &&
      endVisual
    ) {
      await poseAnimation.play({
        transitionId: historicalTransition.transitionId,
        transitionName: resolveTransitionName(
          historicalTransition.transitionId,
        ),
        startPoses: startVisual.poses,
        endPoses: endVisual.poses,
        startState: startVisual.displayState,
        endState: endVisual.displayState,
        startContacts: startVisual.contacts,
        endContacts: endVisual.contacts,
        startControls: startVisual.controls,
        endControls: endVisual.controls,
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
  const configuredDisplayState = useMemo(
    () =>
      createGrapplingDisplayState(
        startPositionId,
        mode,
        selectedGripIds,
        starterControls(selectedGripIds),
      ),
    [startPositionId, mode, selectedGripIds],
  )
  const liveDisplayState = useMemo(
    () => (currentState ? displayStateFromResponse(currentState) : null),
    [currentState],
  )
  const playbackDisplayState = useMemo(
    () => (playbackState ? displayStateFromResponse(playbackState) : null),
    [playbackState],
  )
  const displayState = resolveGrapplingDisplayState({
    configured: configuredDisplayState,
    live: liveDisplayState,
    playback: playbackDisplayState,
    transition: poseAnimation.display?.state,
  })

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
          displayState={displayState}
          isRollActive={currentState !== null}
          isPlaybackActive={isPlaybackActive}
          playbackStateIndex={selectedHistoryIndex}
          stepCount={history.actions.length}
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
          actions={history.actions}
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
