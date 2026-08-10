import { useEffect, useState } from 'react'
import { getPositions } from './api/client'
import { PositionCard } from './components/PositionCard'
import { PositionSearch } from './components/PositionSearch'
import type { Position } from './types/api'
import './App.css'

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

      <section className="positions-panel" aria-labelledby="positions-heading">
        <div className="panel-heading">
          <div>
            <p className="section-label">Position explorer</p>
            <h2 id="positions-heading">Find your position</h2>
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

        {!isLoading && !error && (
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
                    <PositionCard position={position} />
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
      </section>
    </main>
  )
}

export default App
