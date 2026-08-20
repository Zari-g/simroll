import { Handle, type NodeProps } from '@xyflow/react'
import {
  graphHandlePositions,
  type PositionFlowNode,
} from '../utils/graphLayout'
import { formatReadable } from '../utils/format'

export function PositionGraphNode({ data }: NodeProps<PositionFlowNode>) {
  const { position, onExplore, isHighlighted, isDimmed } = data
  const supportedModes = [
    position.gi_allowed ? 'Gi' : null,
    position.no_gi_allowed ? 'No-Gi' : null,
  ].filter(Boolean)
  const isTerminal = position.id === 'submission_terminal'

  return (
    <article
      className={`position-graph-node${isTerminal ? ' is-terminal' : ''}${isHighlighted ? ' is-path-highlighted' : ''}${isDimmed ? ' is-path-dimmed' : ''}`}
    >
      {graphHandlePositions.flatMap(({ side, position: handlePosition }) => [
        <Handle
          key={`target-${side}`}
          id={`target-${side}`}
          type="target"
          position={handlePosition}
          isConnectable={false}
          className="graph-handle"
        />,
        <Handle
          key={`source-${side}`}
          id={`source-${side}`}
          type="source"
          position={handlePosition}
          isConnectable={false}
          className="graph-handle"
        />,
      ])}

      {isHighlighted && (
        <span className="position-graph-node__path-badge">Path position</span>
      )}
      {isTerminal && (
        <span className="position-graph-node__terminal-badge">Terminal</span>
      )}

      <p className="position-graph-node__meta">
        {formatReadable(position.category)}
        <span aria-hidden="true"> · </span>
        {formatReadable(position.player_role)}
      </p>
      <h3>{position.name}</h3>
      <p className="position-graph-node__modes">
        {supportedModes.join(' · ')}
      </p>
      <button
        className="position-graph-node__action nodrag nopan"
        type="button"
        onClick={() => onExplore(position.id)}
      >
        Explore position <span aria-hidden="true">→</span>
      </button>
    </article>
  )
}
