import type { GrapplerSkeletonPair } from './contactCorrection.ts'
import {
  maxSolvedGeometryDelta,
  measureEndEffectorJump,
  measureRootDisplacementJump,
} from './validationMetrics.ts'

/** Each frame is reconstructed independently; prior geometry never enters solve. */
export function sampleDenseContinuity(
  solve: (progress: number) => GrapplerSkeletonPair,
  intervals = 10000,
) {
  if (!Number.isInteger(intervals) || intervals < 1) {
    throw new Error('Positive integer interval count required')
  }
  const maxima = { joint: 0, endEffector: 0, root: 0, progress: 0 }
  let previous = solve(0)
  for (let index = 1; index <= intervals; index++) {
    const progress = index / intervals
    const current = solve(progress)
    const joint = maxSolvedGeometryDelta(previous, current)
    if (joint > maxima.joint) {
      maxima.joint = joint
      maxima.progress = progress
    }
    maxima.endEffector = Math.max(
      maxima.endEffector,
      measureEndEffectorJump(previous, current),
    )
    maxima.root = Math.max(
      maxima.root,
      measureRootDisplacementJump(previous, current),
    )
    previous = current
  }
  return maxima
}
