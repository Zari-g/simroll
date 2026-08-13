import { useEffect, useState } from 'react'
import { getPositions } from './api/client'
import { GraphExplorer } from './components/GraphExplorer'
import { PositionCard } from './components/PositionCard'
import { PositionDetail } from './components/PositionDetail'
import { PositionSearch } from './components/PositionSearch'
import { Pathfinder } from './components/Pathfinder'
import { RollSimulator } from './components/RollSimulator'
import type { GrapplingPath, Position } from './types/api'
import './App.css'

type ExplorerView = 'list' | 'graph' | 'pathfinder' | 'roll'

interface PathHighlight {
  positionIds: ReadonlySet<string>
  transitionIds: ReadonlySet<string>
  stepCount: number
}

function positionMatchesQuery(position: Position, query: string) {
  const searchableFields = [
    position.name,
    position.id,
    position.category,
    position.player_role,
    position.description,
    ...position.tags,
  ]

  return searchableFields.some((field) => field.toLocaleLowerCase().includes(query))
}

function formatPositionCount(count: number) {
  return `${count} ${count === 1 ? 'position' : 'positions'}`
}

function App() {
  const [positions, setPositions] = useState<Position[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestKey, setRequestKey] = useState(0)
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(
    null,
  )
  const [explorerView, setExplorerView] = useState<ExplorerView>('list')
  const [pathHighlight, setPathHighlight] = useState<PathHighlight | null>(null)

  useEffect(() => {
    let shouldUpdate = true

    async function loadPositions() {
      setIsLoading(true)
      setError(null)

      try {
        const loadedPositions = await getPositions()

        if (shouldUpdate) {
          setPositions(loadedPositions)
        }
      } catch (requestError) {
        console.error('Unable to load SimRoll positions.', requestError)

        if (shouldUpdate) {
          setError('Unable to load SimRoll positions.')
        }
      } finally {
        if (shouldUpdate) {
          setIsLoading(false)
        }
      }
    }

    void loadPositions()

    return () => {
      shouldUpdate = false
    }
  }, [requestKey])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredPositions = normalizedQuery
    ? positions.filter((position) =>
        positionMatchesQuery(position, normalizedQuery),
      )
    : positions

  const clearSearch = () => setQuery('')
  const retryLoad = () => setRequestKey((currentKey) => currentKey + 1)

  const resultCount = normalizedQuery
    ? `${filteredPositions.length} of ${formatPositionCount(positions.length)}`
    : formatPositionCount(positions.length)

  const showPathOnMap = (path: GrapplingPath) => {
    setPathHighlight({
      positionIds: new Set(path.states.map((state) => state.position_id)),
      transitionIds: new Set(path.transition_ids),
      stepCount: path.step_count,
    })
    setExplorerView('graph')
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="brand-mark" aria-hidden="true">
          SR
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Brazilian Jiu-Jitsu pathways</p>
          <h1>SimRoll</h1>
          <p className="intro">
            Explore Brazilian Jiu-Jitsu positions, transitions, and pathways.
          </p>
        </div>
      </header>

      {selectedPositionId ? (
        <PositionDetail
          key={selectedPositionId}
          positionId={selectedPositionId}
          positions={positions}
          onBack={() => setSelectedPositionId(null)}
          backLabel={
            explorerView === 'graph'
              ? 'Back to grappling map'
              : explorerView === 'pathfinder'
                ? 'Back to pathfinder'
                : 'Back to positions'
          }
        />
      ) : (
        <section className="positions-panel" aria-labelledby="positions-heading">
          <div className="panel-heading panel-heading--explorer">
            <div>
              <p className="section-label">
                {explorerView === 'list'
                  ? 'Position explorer'
                  : explorerView === 'graph'
                    ? 'Graph explorer'
                    : explorerView === 'pathfinder'
                      ? 'Pathfinder'
                      : 'Roll simulator'}
              </p>
              <h2 id="positions-heading">
                {explorerView === 'list'
                  ? 'Find your position'
                  : explorerView === 'graph'
                    ? 'Explore the grappling map'
                    : explorerView === 'pathfinder'
                      ? 'Find a valid route'
                      : 'Choose your next move'}
              </h2>
            </div>

            <div className="view-switch" aria-label="Explorer view">
              <button
                type="button"
                aria-pressed={explorerView === 'list'}
                onClick={() => setExplorerView('list')}
              >
                Positions
              </button>
              <button
                type="button"
                aria-pressed={explorerView === 'graph'}
                onClick={() => setExplorerView('graph')}
              >
                Grappling map
              </button>
              <button
                type="button"
                aria-pressed={explorerView === 'pathfinder'}
                onClick={() => setExplorerView('pathfinder')}
              >
                Pathfinder
              </button>
              <button
                type="button"
                aria-pressed={explorerView === 'roll'}
                onClick={() => setExplorerView('roll')}
              >
                Roll simulator
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="state-message" role="status">
              <span className="spinner" aria-hidden="true" />
              <span>Loading positions...</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="error-message" role="alert">
              <strong>{error}</strong>
              <span>Make sure the backend is running and try again.</span>
              <button type="button" onClick={retryLoad}>
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && explorerView === 'list' && (
            <div className="positions-content">
              <PositionSearch
                query={query}
                onQueryChange={setQuery}
                onClear={clearSearch}
              />

              <p className="position-count" aria-live="polite">
                {resultCount}
              </p>

              {filteredPositions.length > 0 ? (
                <ul className="position-grid">
                  {filteredPositions.map((position) => (
                    <li key={position.id}>
                      <PositionCard
                        position={position}
                        onSelect={setSelectedPositionId}
                      />
                    </li>
                  ))}
                </ul>
              ) : normalizedQuery ? (
                <div className="empty-state">
                  <strong>No positions match “{query.trim()}”.</strong>
                  <span>Try another search term or view every position.</span>
                  <button type="button" onClick={clearSearch}>
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  <strong>No positions are available yet.</strong>
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && explorerView === 'graph' && (
            <GraphExplorer
              positions={positions}
              onSelectPosition={setSelectedPositionId}
              highlightedPositionIds={pathHighlight?.positionIds}
              highlightedTransitionIds={pathHighlight?.transitionIds}
              highlightedStepCount={pathHighlight?.stepCount}
              onClearHighlight={() => setPathHighlight(null)}
            />
          )}

          {!isLoading && !error && explorerView === 'pathfinder' && (
            <Pathfinder positions={positions} onShowOnMap={showPathOnMap} />
          )}

          {!isLoading && !error && explorerView === 'roll' && (
            <RollSimulator positions={positions} />
          )}
        </section>
      )}
    </main>
  )
}

export default App
