import { useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react'
import { getTransitions } from '../api/client'
import type { Position, Transition } from '../types/api'
import { buildGraphElements } from '../utils/graphLayout'
import { PositionGraphNode } from './PositionGraphNode'
import { TransitionGraphEdge } from './TransitionGraphEdge'

interface GraphExplorerProps {
  positions: Position[]
  onSelectPosition: (positionId: string) => void
  highlightedPositionIds?: ReadonlySet<string>
  highlightedTransitionIds?: ReadonlySet<string>
  highlightedStepCount?: number
  onClearHighlight?: () => void
}

const nodeTypes: NodeTypes = { position: PositionGraphNode }
const edgeTypes: EdgeTypes = { transition: TransitionGraphEdge }
const fitViewOptions = { padding: 0.22, minZoom: 0.35, maxZoom: 1.1 }

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function GraphExplorer({
  positions,
  onSelectPosition,
  highlightedPositionIds,
  highlightedTransitionIds,
  highlightedStepCount,
  onClearHighlight,
}: GraphExplorerProps) {
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestKey, setRequestKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTransitions() {
      setIsLoading(true)
      setError(null)

      try {
        setTransitions(await getTransitions(controller.signal))
      } catch (requestError) {
        if (!isAbortError(requestError)) {
          console.error('Unable to load the structural graph.', requestError)
          setError('Unable to load the grappling map.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadTransitions()

    return () => controller.abort()
  }, [requestKey])

  const { nodes, edges } = useMemo(
    () =>
      buildGraphElements(
        positions,
        transitions,
        onSelectPosition,
        highlightedPositionIds,
        highlightedTransitionIds,
      ),
    [
      highlightedPositionIds,
      highlightedTransitionIds,
      onSelectPosition,
      positions,
      transitions,
    ],
  )
  const retryLoad = () => setRequestKey((key) => key + 1)

  return (
    <div className="graph-content">
      <div className="graph-explanation">
        <div>
          <p className="section-label">Structural map</p>
          <p>
            Shows all defined SimRoll transitions. Actual availability depends
            on the selected grappling mode and active grips.
          </p>
        </div>
        <ul className="graph-legend" aria-label="Grappling map legend">
          <li><span className="legend-node" aria-hidden="true" /> Nodes are positions</li>
          <li><span className="legend-arrow" aria-hidden="true">→</span> Arrows are transitions</li>
          <li><span className="legend-label" aria-hidden="true">Technique</span> Labels name the technique</li>
        </ul>
        <p className="graph-help">
          Open a position to inspect current-state availability.
        </p>
      </div>

      {highlightedPositionIds && (
        <div className="graph-path-highlight" role="status">
          <div>
            <strong>Backend path highlighted</strong>
            <span>
              {highlightedStepCount ?? 0}{' '}
              {(highlightedStepCount ?? 0) === 1 ? 'step' : 'steps'} · Pathfinding
              result, not a live roll
            </span>
          </div>
          {onClearHighlight && (
            <button type="button" onClick={onClearHighlight}>
              Clear path highlight
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="state-message graph-state" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Loading structural transitions...</span>
        </div>
      )}

      {!isLoading && error && (
        <div className="error-message graph-state" role="alert">
          <strong>{error}</strong>
          <span>The Position Explorer is still available.</span>
          <button type="button" onClick={retryLoad}>Retry map</button>
        </div>
      )}

      {!isLoading && !error && positions.length === 0 && (
        <div className="empty-state graph-state">
          <strong>No positions are available to map yet.</strong>
        </div>
      )}

      {!isLoading && !error && positions.length > 0 && (
        <div className="graph-viewport" aria-label="Interactive structural grappling map">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={fitViewOptions}
            minZoom={0.25}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            edgesReconnectable={false}
            deleteKeyCode={null}
            zoomOnDoubleClick={false}
            panOnDrag
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="rgba(158, 231, 192, 0.2)"
              gap={22}
              size={1.2}
            />
            <Controls
              showInteractive={false}
              fitViewOptions={fitViewOptions}
              aria-label="Grappling map zoom and fit controls"
            />
          </ReactFlow>
        </div>
      )}
    </div>
  )
}
