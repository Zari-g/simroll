import {
  MarkerType,
  Position as FlowPosition,
  type Edge,
  type Node,
} from '@xyflow/react'
import type { Position, Transition } from '../types/api'

const NODE_WIDTH = 240
const NODE_HEIGHT = 170
const COLUMN_GAP = 380
const ROW_GAP = 280
const ROUTE_GAP = 96

type HandleSide = 'top' | 'right' | 'bottom' | 'left'

export interface PositionGraphNodeData extends Record<string, unknown> {
  position: Position
  onExplore: (positionId: string) => void
  isHighlighted: boolean
  isDimmed: boolean
}

export type PositionFlowNode = Node<PositionGraphNodeData, 'position'>

export interface TransitionGraphEdgeData extends Record<string, unknown> {
  transitionName: string
  routeOffset: number
  isHighlighted: boolean
  isDimmed: boolean
}

export type TransitionFlowEdge = Edge<TransitionGraphEdgeData, 'transition'>

export interface GraphElements {
  nodes: PositionFlowNode[]
  edges: TransitionFlowEdge[]
}

function handleId(type: 'source' | 'target', side: HandleSide) {
  return `${type}-${side}`
}

function positionForSide(side: HandleSide) {
  switch (side) {
    case 'top':
      return FlowPosition.Top
    case 'right':
      return FlowPosition.Right
    case 'bottom':
      return FlowPosition.Bottom
    case 'left':
      return FlowPosition.Left
  }
}

export const graphHandlePositions = (
  ['top', 'right', 'bottom', 'left'] as const
).map((side) => ({
  side,
  position: positionForSide(side),
}))

function layoutPositions(positions: Position[]) {
  const sortedPositions = [...positions].sort((a, b) =>
    a.id.localeCompare(b.id),
  )
  const columnCount = Math.max(1, Math.ceil(Math.sqrt(sortedPositions.length)))
  const rowCount = Math.ceil(sortedPositions.length / columnCount)

  return new Map(
    sortedPositions.map((position, index) => {
      const row = Math.floor(index / columnCount)
      const column = index % columnCount
      const itemsInRow = Math.min(
        columnCount,
        sortedPositions.length - row * columnCount,
      )
      const rowWidth = (itemsInRow - 1) * COLUMN_GAP

      return [
        position.id,
        {
          x: column * COLUMN_GAP - rowWidth / 2,
          y: (row - (rowCount - 1) / 2) * ROW_GAP,
        },
      ] as const
    }),
  )
}

function edgeHandles(
  sourcePosition: { x: number; y: number },
  targetPosition: { x: number; y: number },
) {
  const sourceCenter = {
    x: sourcePosition.x + NODE_WIDTH / 2,
    y: sourcePosition.y + NODE_HEIGHT / 2,
  }
  const targetCenter = {
    x: targetPosition.x + NODE_WIDTH / 2,
    y: targetPosition.y + NODE_HEIGHT / 2,
  }
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y

  if (dx === 0 && dy === 0) {
    return {
      sourceHandle: handleId('source', 'right'),
      targetHandle: handleId('target', 'bottom'),
    }
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    const sourceSide: HandleSide = dx >= 0 ? 'right' : 'left'
    const targetSide: HandleSide = dx >= 0 ? 'left' : 'right'
    return {
      sourceHandle: handleId('source', sourceSide),
      targetHandle: handleId('target', targetSide),
    }
  }

  const sourceSide: HandleSide = dy >= 0 ? 'bottom' : 'top'
  const targetSide: HandleSide = dy >= 0 ? 'top' : 'bottom'
  return {
    sourceHandle: handleId('source', sourceSide),
    targetHandle: handleId('target', targetSide),
  }
}

function unorderedPairKey(transition: Transition) {
  return [transition.from_position, transition.to_position]
    .sort((a, b) => a.localeCompare(b))
    .join('\u0000')
}

function parallelRouteOffsets(transitions: Transition[]) {
  const groups = new Map<string, Transition[]>()

  for (const transition of transitions) {
    const key = unorderedPairKey(transition)
    groups.set(key, [...(groups.get(key) ?? []), transition])
  }

  const routeOffsets = new Map<string, number>()

  for (const group of groups.values()) {
    const sortedGroup = [...group].sort((a, b) => a.id.localeCompare(b.id))

    sortedGroup.forEach((transition, index) => {
      const canonicalOffset =
        (index - (sortedGroup.length - 1) / 2) * ROUTE_GAP
      const isCanonicalDirection =
        transition.from_position.localeCompare(transition.to_position) <= 0
      routeOffsets.set(
        transition.id,
        canonicalOffset * (isCanonicalDirection ? 1 : -1),
      )
    })
  }

  return routeOffsets
}

export function buildGraphElements(
  positions: Position[],
  transitions: Transition[],
  onExplore: (positionId: string) => void,
  highlightedPositionIds?: ReadonlySet<string>,
  highlightedTransitionIds?: ReadonlySet<string>,
): GraphElements {
  const hasHighlight =
    highlightedPositionIds !== undefined ||
    highlightedTransitionIds !== undefined
  const positionsById = new Map(
    positions.map((position) => [position.id, position]),
  )
  const nodePositions = layoutPositions(positions)
  const validTransitions = transitions.filter((transition) => {
    const hasValidReferences =
      positionsById.has(transition.from_position) &&
      positionsById.has(transition.to_position)

    if (!hasValidReferences) {
      console.warn(
        `Skipping transition "${transition.id}" because a position reference is missing.`,
      )
    }

    return hasValidReferences
  })
  const routeOffsets = parallelRouteOffsets(validTransitions)

  const nodes = [...positionsById.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map<PositionFlowNode>((position) => ({
      id: position.id,
      type: 'position',
      position: nodePositions.get(position.id) ?? { x: 0, y: 0 },
      data: {
        position,
        onExplore,
        isHighlighted: highlightedPositionIds?.has(position.id) ?? false,
        isDimmed:
          hasHighlight && !(highlightedPositionIds?.has(position.id) ?? false),
      },
      draggable: false,
      deletable: false,
      selectable: true,
      focusable: true,
      ariaLabel: `${position.name}, ${position.category}, ${position.player_role}`,
    }))

  const edges = validTransitions.map<TransitionFlowEdge>((transition) => {
    const sourcePosition = nodePositions.get(transition.from_position) ?? {
      x: 0,
      y: 0,
    }
    const targetPosition = nodePositions.get(transition.to_position) ?? {
      x: 0,
      y: 0,
    }
    const { sourceHandle, targetHandle } = edgeHandles(
      sourcePosition,
      targetPosition,
    )

    return {
      id: transition.id,
      type: 'transition',
      source: transition.from_position,
      target: transition.to_position,
      sourceHandle,
      targetHandle,
      data: {
        transitionName: transition.name,
        routeOffset: routeOffsets.get(transition.id) ?? 0,
        isHighlighted:
          highlightedTransitionIds?.has(transition.id) ?? false,
        isDimmed:
          hasHighlight &&
          !(highlightedTransitionIds?.has(transition.id) ?? false),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color:
          highlightedTransitionIds?.has(transition.id) ?? false
            ? '#f4d77a'
            : '#9ee7c0',
      },
      deletable: false,
      reconnectable: false,
      selectable: true,
      focusable: true,
      ariaLabel: `${transition.name}: ${transition.from_position} to ${transition.to_position}`,
    }
  })

  return { nodes, edges }
}
