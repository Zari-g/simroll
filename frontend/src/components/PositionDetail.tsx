import { useEffect, useMemo, useState } from 'react'
import {
  getAvailableTransitions,
  getGrips,
  getPosition,
  getPositionTransitions,
} from '../api/client'
import type {
  GrapplingMode,
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
import {
  TransitionCard,
  type AvailabilityState,
} from './TransitionCard'

interface PositionDetailProps {
  positionId: string
  positions: Position[]
  onBack: () => void
  backLabel?: string
}

interface DetailData {
  position: Position
  transitions: Transition[]
  grips: Grip[]
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function PositionDetail({
  positionId,
  positions,
  onBack,
  backLabel = 'Back to positions',
}: PositionDetailProps) {
  const [detail, setDetail] = useState<DetailData | null>(null)
  const [mode, setMode] = useState<GrapplingMode | null>(null)
  const [selectedGripIds, setSelectedGripIds] = useState<string[]>([])
  const [availableTransitions, setAvailableTransitions] = useState<Transition[]>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailRequestKey, setDetailRequestKey] = useState(0)
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [availabilityRequestKey, setAvailabilityRequestKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDetail() {
      setIsLoading(true)
      setDetailError(null)

      try {
        const [position, transitions, grips] = await Promise.all([
          getPosition(positionId, controller.signal),
          getPositionTransitions(positionId, controller.signal),
          getGrips(controller.signal),
        ])

        setDetail({ position, transitions, grips })
        setMode(getInitialMode(position))
        setSelectedGripIds([])
      } catch (requestError) {
        if (!isAbortError(requestError)) {
          console.error('Unable to load position details.', requestError)
          setDetailError('Unable to load this position’s details.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadDetail()

    return () => controller.abort()
  }, [positionId, detailRequestKey])

  useEffect(() => {
    if (!detail || !mode) {
      return
    }

    const controller = new AbortController()
    const currentDetail = detail
    const currentMode = mode

    async function loadAvailability() {
      setIsAvailabilityLoading(true)
      setAvailabilityError(null)

      try {
        const transitions = await getAvailableTransitions(
          {
            position_id: currentDetail.position.id,
            mode: currentMode,
            active_grips: selectedGripIds,
          },
          controller.signal,
        )

        setAvailableTransitions(transitions)
      } catch (requestError) {
        if (!isAbortError(requestError)) {
          console.error('Unable to load available transitions.', requestError)
          setAvailabilityError(
            'Unable to check transitions for the current state.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsAvailabilityLoading(false)
        }
      }
    }

    void loadAvailability()

    return () => controller.abort()
  }, [detail, mode, selectedGripIds, availabilityRequestKey])

  const positionNames = useMemo(
    () => new Map(positions.map((position) => [position.id, position.name])),
    [positions],
  )
  const gripNames = useMemo(
    () => new Map(detail?.grips.map((grip) => [grip.id, grip.name]) ?? []),
    [detail?.grips],
  )
  const selectedGripIdSet = useMemo(
    () => new Set(selectedGripIds),
    [selectedGripIds],
  )
  const availableTransitionIds = useMemo(
    () => new Set(availableTransitions.map((transition) => transition.id)),
    [availableTransitions],
  )

  const handleModeChange = (nextMode: GrapplingMode) => {
    if (!detail) {
      return
    }

    setMode(nextMode)
    setSelectedGripIds((currentIds) =>
      filterGripIdsForMode(currentIds, detail.grips, nextMode),
    )
  }

  const toggleGrip = (gripId: string) => {
    setSelectedGripIds((currentIds) =>
      currentIds.includes(gripId)
        ? currentIds.filter((currentId) => currentId !== gripId)
        : [...currentIds, gripId],
    )
  }

  const resolveGripName = (gripId: string) =>
    gripNames.get(gripId) ?? formatReadable(gripId)
  const resolvePositionName = (id: string) =>
    positionNames.get(id) ?? formatReadable(id)

  const getAvailability = (transitionId: string): AvailabilityState => {
    if (isAvailabilityLoading) return 'checking'
    if (availabilityError) return 'unknown'
    return availableTransitionIds.has(transitionId)
      ? 'available'
      : 'unavailable'
  }

  const retryDetail = () => setDetailRequestKey((key) => key + 1)
  const retryAvailability = () =>
    setAvailabilityRequestKey((key) => key + 1)

  if (isLoading) {
    return (
      <section className="positions-panel detail-panel" aria-label="Position details">
        <div className="detail-toolbar">
          <button className="back-button" type="button" onClick={onBack}>
            ← {backLabel}
          </button>
        </div>
        <div className="state-message" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Loading position details...</span>
        </div>
      </section>
    )
  }

  if (detailError || !detail || !mode) {
    return (
      <section className="positions-panel detail-panel" aria-label="Position details">
        <div className="detail-toolbar">
          <button className="back-button" type="button" onClick={onBack}>
            ← {backLabel}
          </button>
        </div>
        <div className="error-message" role="alert">
          <strong>{detailError ?? 'Unable to load this position.'}</strong>
          <span>Check the API connection and try again.</span>
          <button type="button" onClick={retryDetail}>Retry</button>
        </div>
      </section>
    )
  }

  const { position, transitions, grips } = detail
  const hasSettledAvailability =
    !isAvailabilityLoading && availabilityError === null

  return (
    <section className="positions-panel detail-panel" aria-labelledby="detail-heading">
      <div className="detail-toolbar">
        <button className="back-button" type="button" onClick={onBack}>
          ← {backLabel}
        </button>
      </div>

      <header className="detail-header">
        <p className="position-card__category">
          {formatReadable(position.category)} ·{' '}
          {formatReadable(position.player_role)}
        </p>
        <h2 id="detail-heading">{position.name}</h2>
        <p className="detail-description">{position.description}</p>
        <ul className="availability-list" aria-label="Grappling mode availability">
          <li className={`availability ${position.gi_allowed ? '' : 'availability--off'}`}>
            Gi {position.gi_allowed ? 'available' : 'not available'}
          </li>
          <li className={`availability ${position.no_gi_allowed ? '' : 'availability--off'}`}>
            No-Gi {position.no_gi_allowed ? 'available' : 'not available'}
          </li>
        </ul>
        {position.tags.length > 0 && (
          <ul className="tag-list detail-tags" aria-label="Position tags">
            {position.tags.map((tag) => <li key={tag}>{formatReadable(tag)}</li>)}
          </ul>
        )}
      </header>

      <div className="detail-layout">
        <aside className="state-controls" aria-labelledby="state-controls-heading">
          <div>
            <p className="section-label">Grappling state</p>
            <h3 id="state-controls-heading">Set the current state</h3>
          </div>

          <fieldset className="mode-selector">
            <legend>Mode</legend>
            <div className="segmented-control">
              <label>
                <input
                  type="radio"
                  name="grappling-mode"
                  value="gi"
                  checked={mode === 'gi'}
                  disabled={!position.gi_allowed}
                  onChange={() => handleModeChange('gi')}
                />
                <span>Gi</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="grappling-mode"
                  value="no_gi"
                  checked={mode === 'no_gi'}
                  disabled={!position.no_gi_allowed}
                  onChange={() => handleModeChange('no_gi')}
                />
                <span>No-Gi</span>
              </label>
            </div>
          </fieldset>

          <GripSelector
            grips={grips}
            mode={mode}
            selectedGripIds={selectedGripIdSet}
            onToggle={toggleGrip}
          />

          <section className="state-summary" aria-labelledby="state-summary-heading">
            <p className="section-label">Current state</p>
            <h3 id="state-summary-heading">{position.name}</h3>
            <p><strong>Mode:</strong> {mode === 'gi' ? 'Gi' : 'No-Gi'}</p>
            <div>
              <strong>Active grips:</strong>
              <p>
                {selectedGripIds.length > 0
                  ? selectedGripIds.map(resolveGripName).join(', ')
                  : 'None'}
              </p>
            </div>
            <p>
              <strong>Available transitions:</strong>{' '}
              {isAvailabilityLoading
                ? 'Updating…'
                : availabilityError
                  ? 'Unavailable'
                  : `${availableTransitions.length} of ${transitions.length}`}
            </p>
          </section>
        </aside>

        <section className="transitions-section" aria-labelledby="transitions-heading">
          <div className="transitions-heading-row">
            <div>
              <p className="section-label">Transition viewer</p>
              <h3 id="transitions-heading">Transitions from this position</h3>
            </div>
            <p className="transition-count" aria-live="polite">
              {transitions.length} total
              {hasSettledAvailability && ` · ${availableTransitions.length} available now`}
            </p>
          </div>

          {isAvailabilityLoading && (
            <p className="availability-update" role="status">
              <span className="spinner" aria-hidden="true" />
              Updating available transitions...
            </p>
          )}

          {availabilityError && (
            <div className="scoped-error" role="alert">
              <span>{availabilityError}</span>
              <button type="button" onClick={retryAvailability}>Retry</button>
            </div>
          )}

          {transitions.length === 0 ? (
            <div className="empty-state">
              <strong>No transitions are currently defined from this position.</strong>
            </div>
          ) : (
            <ul className="transition-list">
              {transitions.map((transition) => (
                <li key={transition.id}>
                  <TransitionCard
                    transition={transition}
                    availability={getAvailability(transition.id)}
                    fromPositionName={position.name}
                    destinationName={resolvePositionName(transition.to_position)}
                    resolveGripName={resolveGripName}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
