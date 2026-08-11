import { useEffect, useMemo, useRef, useState } from 'react'
import {
  findPaths,
  findShortestPath,
  getGrips,
  getTransitions,
} from '../api/client'
import type {
  GrapplingMode,
  GrapplingPath,
  Grip,
  PathsRequest,
  Position,
  ShortestPathRequest,
  Transition,
} from '../types/api'
import { formatReadable } from '../utils/format'
import {
  filterGripIdsForMode,
  getInitialMode,
} from '../utils/grapplingState'
import { GripSelector } from './GripSelector'
import { PathResult } from './PathResult'

type SearchMode = 'shortest' | 'multiple'
type SearchSnapshot =
  | { mode: 'shortest'; request: ShortestPathRequest }
  | { mode: 'multiple'; request: PathsRequest }

interface PathfinderProps {
  positions: Position[]
  onShowOnMap: (path: GrapplingPath) => void
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function positiveInteger(value: string) {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function Pathfinder({ positions, onShowOnMap }: PathfinderProps) {
  const [grips, setGrips] = useState<Grip[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [isResourcesLoading, setIsResourcesLoading] = useState(true)
  const [resourceError, setResourceError] = useState<string | null>(null)
  const [resourceRequestKey, setResourceRequestKey] = useState(0)
  const [startPositionId, setStartPositionId] = useState(
    positions[0]?.id ?? '',
  )
  const [targetPositionId, setTargetPositionId] = useState(
    positions[0]?.id ?? '',
  )
  const [mode, setMode] = useState<GrapplingMode>(
    positions[0] ? getInitialMode(positions[0]) : 'gi',
  )
  const [selectedGripIds, setSelectedGripIds] = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])
  const [selectedTransitionTypes, setSelectedTransitionTypes] = useState<
    string[]
  >([])
  const [searchMode, setSearchMode] = useState<SearchMode>('shortest')
  const [shortestMaxDepth, setShortestMaxDepth] = useState('')
  const [maxPaths, setMaxPaths] = useState('5')
  const [multipleMaxDepth, setMultipleMaxDepth] = useState('10')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [resultPaths, setResultPaths] = useState<GrapplingPath[] | null>(null)
  const [resultMode, setResultMode] = useState<SearchMode | null>(null)
  const [lastRequest, setLastRequest] = useState<SearchSnapshot | null>(null)
  const activeSearch = useRef<AbortController | null>(null)
  const searchSequence = useRef(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadResources() {
      setIsResourcesLoading(true)
      setResourceError(null)

      try {
        const [loadedGrips, loadedTransitions] = await Promise.all([
          getGrips(controller.signal),
          getTransitions(controller.signal),
        ])
        setGrips(loadedGrips)
        setTransitions(loadedTransitions)
      } catch (error) {
        if (!isAbortError(error)) {
          console.error('Unable to load Pathfinder resources.', error)
          setResourceError('Unable to load grips and transitions for Pathfinder.')
        }
      } finally {
        if (!controller.signal.aborted) setIsResourcesLoading(false)
      }
    }

    void loadResources()
    return () => controller.abort()
  }, [resourceRequestKey])

  useEffect(() => {
    if (positions.length === 0) {
      setStartPositionId('')
      setTargetPositionId('')
      return
    }

    if (!positions.some((position) => position.id === startPositionId)) {
      setStartPositionId(positions[0].id)
      setMode(getInitialMode(positions[0]))
      setSelectedGripIds([])
    }
    if (!positions.some((position) => position.id === targetPositionId)) {
      setTargetPositionId(positions[0].id)
    }
  }, [positions, startPositionId, targetPositionId])

  useEffect(
    () => () => {
      activeSearch.current?.abort()
    },
    [],
  )

  const startPosition = positions.find(
    (position) => position.id === startPositionId,
  )
  const difficultyOptions = useMemo(
    () =>
      [...new Set(transitions.map((transition) => transition.difficulty))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [transitions],
  )
  const transitionTypeOptions = useMemo(
    () =>
      [
        ...new Set(
          transitions.map((transition) => transition.transition_type),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [transitions],
  )
  const selectedGripIdSet = useMemo(
    () => new Set(selectedGripIds),
    [selectedGripIds],
  )

  const clearSearchState = () => {
    activeSearch.current?.abort()
    searchSequence.current += 1
    setIsSearching(false)
    setResultPaths(null)
    setResultMode(null)
    setValidationError(null)
    setSearchError(null)
    setLastRequest(null)
  }

  const handleStartPositionChange = (positionId: string) => {
    clearSearchState()
    const position = positions.find((candidate) => candidate.id === positionId)
    if (!position) return
    const nextMode =
      (mode === 'gi' && position.gi_allowed) ||
      (mode === 'no_gi' && position.no_gi_allowed)
        ? mode
        : getInitialMode(position)
    setStartPositionId(positionId)
    setMode(nextMode)
    setSelectedGripIds((currentIds) =>
      filterGripIdsForMode(currentIds, grips, nextMode),
    )
  }

  const handleModeChange = (nextMode: GrapplingMode) => {
    clearSearchState()
    setMode(nextMode)
    setSelectedGripIds((currentIds) =>
      filterGripIdsForMode(currentIds, grips, nextMode),
    )
  }

  const toggleGrip = (gripId: string) => {
    clearSearchState()
    setSelectedGripIds((currentIds) =>
      currentIds.includes(gripId)
        ? currentIds.filter((currentId) => currentId !== gripId)
        : [...currentIds, gripId],
    )
  }

  const toggleFilter = (
    value: string,
    selectedValues: string[],
    setSelectedValues: (values: string[]) => void,
  ) => {
    clearSearchState()
    setSelectedValues(
      selectedValues.includes(value)
        ? selectedValues.filter((selectedValue) => selectedValue !== value)
        : [...selectedValues, value],
    )
  }

  const runSearch = async (snapshot: SearchSnapshot) => {
    activeSearch.current?.abort()
    const controller = new AbortController()
    activeSearch.current = controller
    const sequence = searchSequence.current + 1
    searchSequence.current = sequence
    setLastRequest(snapshot)
    setValidationError(null)
    setSearchError(null)
    setResultPaths(null)
    setResultMode(snapshot.mode)
    setIsSearching(true)

    try {
      const paths =
        snapshot.mode === 'shortest'
          ? [
              (await findShortestPath(snapshot.request, controller.signal)).path,
            ].filter((path): path is GrapplingPath => path !== null)
          : (await findPaths(snapshot.request, controller.signal)).paths

      if (!controller.signal.aborted && searchSequence.current === sequence) {
        setResultPaths(paths)
      }
    } catch (error) {
      if (!isAbortError(error) && searchSequence.current === sequence) {
        console.error('Unable to complete Pathfinder search.', error)
        setSearchError(
          error instanceof Error ? error.message : 'Unable to find paths.',
        )
      }
    } finally {
      if (!controller.signal.aborted && searchSequence.current === sequence) {
        setIsSearching(false)
        activeSearch.current = null
      }
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!startPosition || !targetPositionId) return

    const baseRequest = {
      start_state: {
        position_id: startPosition.id,
        mode,
        active_grips: [...selectedGripIds],
      },
      target_position_id: targetPositionId,
      difficulties:
        selectedDifficulties.length > 0 ? [...selectedDifficulties] : null,
      transition_types:
        selectedTransitionTypes.length > 0
          ? [...selectedTransitionTypes]
          : null,
    }

    if (searchMode === 'shortest') {
      const maxDepth =
        shortestMaxDepth.trim() === ''
          ? null
          : positiveInteger(shortestMaxDepth.trim())
      if (shortestMaxDepth.trim() !== '' && maxDepth === null) {
        setValidationError('Maximum depth must be a positive integer or blank.')
        return
      }
      void runSearch({
        mode: 'shortest',
        request: { ...baseRequest, max_depth: maxDepth },
      })
      return
    }

    const parsedMaxPaths = positiveInteger(maxPaths.trim())
    const parsedMaxDepth = positiveInteger(multipleMaxDepth.trim())
    if (parsedMaxPaths === null || parsedMaxDepth === null) {
      setValidationError(
        'Maximum paths and maximum depth must be positive integers.',
      )
      return
    }
    void runSearch({
      mode: 'multiple',
      request: {
        ...baseRequest,
        max_paths: parsedMaxPaths,
        max_depth: parsedMaxDepth,
      },
    })
  }

  if (positions.length === 0) {
    return (
      <div className="empty-state pathfinder-unavailable">
        <strong>Pathfinder unavailable because no positions are loaded.</strong>
      </div>
    )
  }

  return (
    <div className="pathfinder-content">
      {isResourcesLoading && (
        <div className="state-message pathfinder-resource-state" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Loading Pathfinder grips and transitions...</span>
        </div>
      )}

      {!isResourcesLoading && resourceError && (
        <div className="error-message pathfinder-resource-state" role="alert">
          <strong>{resourceError}</strong>
          <span>Path search needs this backend data for controls and labels.</span>
          <button
            type="button"
            onClick={() => setResourceRequestKey((key) => key + 1)}
          >
            Retry
          </button>
        </div>
      )}

      {!isResourcesLoading && !resourceError && startPosition && (
        <>
          <form className="pathfinder-form" onSubmit={handleSubmit}>
            <div className="pathfinder-primary-fields">
              <label>
                <span>Starting position</span>
                <select
                  value={startPositionId}
                  onChange={(event) =>
                    handleStartPositionChange(event.target.value)
                  }
                >
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Target position</span>
                <select
                  value={targetPositionId}
                  onChange={(event) => {
                    clearSearchState()
                    setTargetPositionId(event.target.value)
                  }}
                >
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="pathfinder-controls-grid">
              <div className="pathfinder-state-controls">
                <fieldset className="mode-selector">
                  <legend>Starting mode</legend>
                  <div className="segmented-control">
                    <label>
                      <input
                        type="radio"
                        name="pathfinder-mode"
                        checked={mode === 'gi'}
                        disabled={!startPosition.gi_allowed}
                        onChange={() => handleModeChange('gi')}
                      />
                      <span>Gi</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="pathfinder-mode"
                        checked={mode === 'no_gi'}
                        disabled={!startPosition.no_gi_allowed}
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
              </div>

              <div className="pathfinder-search-controls">
                <fieldset className="mode-selector">
                  <legend>Path search</legend>
                  <div className="segmented-control">
                    <label>
                      <input
                        type="radio"
                        name="path-search-mode"
                        checked={searchMode === 'shortest'}
                        onChange={() => {
                          clearSearchState()
                          setSearchMode('shortest')
                        }}
                      />
                      <span>Shortest</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="path-search-mode"
                        checked={searchMode === 'multiple'}
                        onChange={() => {
                          clearSearchState()
                          setSearchMode('multiple')
                        }}
                      />
                      <span>Multiple paths</span>
                    </label>
                  </div>
                </fieldset>

                <details className="pathfinder-filters">
                  <summary>Advanced filters</summary>
                  <div className="pathfinder-filter-groups">
                    <fieldset>
                      <legend>Allowed difficulties</legend>
                      {difficultyOptions.length === 0 ? (
                        <p>No difficulty values are defined.</p>
                      ) : (
                        difficultyOptions.map((difficulty) => (
                          <label key={difficulty}>
                            <input
                              type="checkbox"
                              checked={selectedDifficulties.includes(difficulty)}
                              onChange={() =>
                                toggleFilter(
                                  difficulty,
                                  selectedDifficulties,
                                  setSelectedDifficulties,
                                )
                              }
                            />
                            <span>{formatReadable(difficulty)}</span>
                          </label>
                        ))
                      )}
                    </fieldset>
                    <fieldset>
                      <legend>Allowed transition types</legend>
                      {transitionTypeOptions.length === 0 ? (
                        <p>No transition types are defined.</p>
                      ) : (
                        transitionTypeOptions.map((transitionType) => (
                          <label key={transitionType}>
                            <input
                              type="checkbox"
                              checked={selectedTransitionTypes.includes(
                                transitionType,
                              )}
                              onChange={() =>
                                toggleFilter(
                                  transitionType,
                                  selectedTransitionTypes,
                                  setSelectedTransitionTypes,
                                )
                              }
                            />
                            <span>{formatReadable(transitionType)}</span>
                          </label>
                        ))
                      )}
                    </fieldset>
                  </div>
                </details>

                <div className="pathfinder-limits">
                  {searchMode === 'shortest' ? (
                    <label>
                      <span>Maximum depth (optional)</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={shortestMaxDepth}
                        placeholder="No explicit maximum"
                        onChange={(event) => {
                          clearSearchState()
                          setShortestMaxDepth(event.target.value)
                        }}
                      />
                    </label>
                  ) : (
                    <>
                      <label>
                        <span>Maximum paths</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={maxPaths}
                          onChange={(event) => {
                            clearSearchState()
                            setMaxPaths(event.target.value)
                          }}
                        />
                      </label>
                      <label>
                        <span>Maximum depth</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={multipleMaxDepth}
                          onChange={(event) => {
                            clearSearchState()
                            setMultipleMaxDepth(event.target.value)
                          }}
                        />
                      </label>
                    </>
                  )}
                </div>

                {validationError && (
                  <p className="pathfinder-validation" role="alert">
                    {validationError}
                  </p>
                )}

                <button
                  className="pathfinder-submit"
                  type="submit"
                  disabled={isSearching}
                >
                  {searchMode === 'shortest'
                    ? 'Find shortest path'
                    : 'Find paths'}
                </button>
              </div>
            </div>
          </form>

          <section className="pathfinder-results" aria-labelledby="path-results-heading">
            <div className="pathfinder-results__heading">
              <p className="section-label">Backend pathfinding results</p>
              <h3 id="path-results-heading">
                {resultMode === 'multiple'
                  ? 'Valid paths'
                  : 'Shortest valid path'}
              </h3>
            </div>

            {isSearching && (
              <div className="state-message" role="status">
                <span className="spinner" aria-hidden="true" />
                <span>
                  {searchMode === 'shortest'
                    ? 'Finding path...'
                    : 'Finding paths...'}
                </span>
              </div>
            )}

            {!isSearching && searchError && (
              <div className="error-message" role="alert">
                <strong>Unable to find paths.</strong>
                <span>{searchError}</span>
                {lastRequest && (
                  <button type="button" onClick={() => void runSearch(lastRequest)}>
                    Retry
                  </button>
                )}
              </div>
            )}

            {!isSearching && !searchError && resultPaths?.length === 0 && (
              <div className="empty-state pathfinder-no-result">
                <strong>
                  {resultMode === 'multiple'
                    ? 'No valid paths found for the current state and filters.'
                    : 'No valid path found.'}
                </strong>
                <span>
                  Try changing the starting grips, mode, target, or filters.
                </span>
              </div>
            )}

            {!isSearching && !searchError && resultPaths && resultPaths.length > 0 && (
              <div className="path-results-list">
                {resultMode === 'multiple' && (
                  <p className="path-results-count">
                    {resultPaths.length}{' '}
                    {resultPaths.length === 1 ? 'valid path' : 'valid paths'}
                  </p>
                )}
                {resultPaths.map((path, index) => (
                  <PathResult
                    key={index}
                    path={path}
                    positions={positions}
                    transitions={transitions}
                    grips={grips}
                    title={
                      resultMode === 'multiple'
                        ? `Path ${index + 1}`
                        : 'Shortest valid path'
                    }
                    onShowOnMap={onShowOnMap}
                  />
                ))}
              </div>
            )}

            {!isSearching && !searchError && resultPaths === null && (
              <p className="pathfinder-results__prompt">
                Set a starting state and target, then ask the backend to find a
                route.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
