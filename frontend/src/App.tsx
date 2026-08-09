import { useEffect, useState } from 'react'
import { getPositions } from './api/client'
import type { Position } from './types/api'
import './App.css'

function App() {
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let shouldUpdate = true

    async function loadPositions() {
      try {
        const loadedPositions = await getPositions()

        if (shouldUpdate) {
          setPositions(loadedPositions)
        }
      } catch (requestError) {
        console.error('Unable to load SimRoll positions.', requestError)

        if (shouldUpdate) {
          setError('Unable to connect to the SimRoll API.')
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
  }, [])

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
            <p className="section-label">Live data</p>
            <h2 id="positions-heading">Position preview</h2>
          </div>
          <div
            className={`api-status ${error ? 'api-status--error' : ''}`}
            role="status"
          >
            <span className="status-dot" aria-hidden="true" />
            {isLoading ? 'Connecting' : error ? 'API unavailable' : 'API connected'}
          </div>
        </div>

        {isLoading && <p className="state-message">Loading positions...</p>}

        {error && (
          <div className="error-message" role="alert">
            <strong>{error}</strong>
            <span>Make sure the backend is running.</span>
          </div>
        )}

        {!isLoading && !error && (
          <div className="positions-content">
            <p className="position-count">
              Positions loaded: <strong>{positions.length}</strong>
            </p>
            <ul className="position-list">
              {positions.slice(0, 5).map((position) => (
                <li key={position.id}>
                  <span>{position.name}</span>
                  <code>{position.id}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
