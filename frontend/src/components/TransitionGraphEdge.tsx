import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'
import type { TransitionFlowEdge } from '../utils/graphLayout'

export function TransitionGraphEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  data,
  selected,
}: EdgeProps<TransitionFlowEdge>) {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const distance = Math.max(Math.hypot(dx, dy), 1)
  const routeOffset = data?.routeOffset ?? 0
  const controlX = (sourceX + targetX) / 2 - (dy / distance) * routeOffset
  const controlY = (sourceY + targetY) / 2 + (dx / distance) * routeOffset
  const edgePath = `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`
  const labelX = sourceX * 0.25 + controlX * 0.5 + targetX * 0.25
  const labelY = sourceY * 0.25 + controlY * 0.5 + targetY * 0.25

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={selected ? 'transition-graph-edge is-selected' : 'transition-graph-edge'}
      />
      <EdgeLabelRenderer>
        <div
          className={`transition-graph-edge__label${selected ? ' is-selected' : ''}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {data?.transitionName ?? id}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
