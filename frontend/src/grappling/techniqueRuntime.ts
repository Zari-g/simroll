import type { GrapplerSkeletonPair } from './contactCorrection.ts'
import type { GrapplerPosePair } from './interpolatePose.ts'
import { interpolateSkeletonPose } from './animationInterpolation.ts'
import { grapplerPoseToSkeleton } from './kinematics.ts'
import { getPositionVisual } from './positionVisuals.ts'
import { composeAnimationSkeleton } from './resolveAnimationFrame.ts'
import { resolveGrapplerPairFrame } from './resolveGrapplerPairFrame.ts'
import { interpretTechniqueAnimation, resolveTechniqueGrounding, type CompiledTechniqueAnimation } from './techniqueInterpreter.ts'
import { techniqueGrips } from './techniqueAnimationRegistry.ts'
import type { TransitionContactContext } from './types.ts'

function skeletons(poses: GrapplerPosePair): GrapplerSkeletonPair {
  return { playerA: grapplerPoseToSkeleton(poses.playerA), playerB: grapplerPoseToSkeleton(poses.playerB) }
}
function blend(start: GrapplerSkeletonPair, end: GrapplerSkeletonPair, progress: number): GrapplerSkeletonPair {
  return { playerA: interpolateSkeletonPose(start.playerA, end.playerA, progress), playerB: interpolateSkeletonPose(start.playerB, end.playerB, progress) }
}
function compose(base: GrapplerSkeletonPair, intent: ReturnType<typeof interpretTechniqueAnimation>): GrapplerSkeletonPair {
  return { playerA: composeAnimationSkeleton(base.playerA, intent.playerA), playerB: composeAnimationSkeleton(base.playerB, intent.playerB) }
}
const cache = new WeakMap<CompiledTechniqueAnimation, WeakMap<GrapplerPosePair, WeakMap<GrapplerPosePair, readonly GrapplerSkeletonPair[]>>>()
function phaseFrames(compiled: CompiledTechniqueAnimation, start: GrapplerPosePair, end: GrapplerPosePair) {
  let byStart = cache.get(compiled)
  if (!byStart) { byStart = new WeakMap(); cache.set(compiled, byStart) }
  let byEnd = byStart.get(start)
  if (!byEnd) { byEnd = new WeakMap(); byStart.set(start, byEnd) }
  let frames = byEnd.get(end)
  if (!frames) {
    const source = skeletons(start), destination = skeletons(end)
    frames = [source, ...compiled.timing.map((range, index) => {
      if (index === compiled.timing.length - 1) return destination
      const intent = interpretTechniqueAnimation(compiled, range.start, { mode: 'gi', grips: techniqueGrips })
      const anchor = intent.targetPosition ? getPositionVisual(intent.targetPosition) : null
      if (intent.targetPosition && !anchor) throw new Error(`Missing technique position visual: ${intent.targetPosition}`)
      const base = anchor ? skeletons({ playerA: anchor.playerAPose, playerB: anchor.playerBPose }) : blend(source, destination, range.end)
      return compose(base, intent)
    })]
    byEnd.set(end, frames)
  }
  return frames
}

/** Adapt executable intent to the existing pair solver, without changing its algorithms. */
export function resolveTechniqueFrameInputs(compiled: CompiledTechniqueAnimation, start: GrapplerPosePair, end: GrapplerPosePair, progress: number, context: TransitionContactContext) {
  const frames = phaseFrames(compiled, start, end)
  const source = frames[0], destination = frames[frames.length - 1]
  const intent = interpretTechniqueAnimation(compiled, progress, {
    mode: context.mode ?? 'gi', grips: context.grips ?? techniqueGrips, controls: context.startControls,
  })
  const entry = frames[intent.phaseIndex], exit = frames[intent.phaseIndex + 1]
  let base = blend(entry, exit, intent.easedPhaseProgress)
  // Final phase still executes its actions, tapering back to the graph endpoint.
  if (intent.phaseIndex === compiled.timing.length - 1) {
    base = blend(base, compose(base, intent), Math.sin(Math.PI * intent.easedPhaseProgress))
  }
  const grounding = resolveTechniqueGrounding(compiled, intent.phaseIndex, intent.globalProgress, intent.constraintInfluence, {
    phaseStart: index => frames[index], transitionBlend: value => blend(source, destination, value), current: base,
  })
  return {
    intent: { ...intent, grounding }, baseProgress: intent.globalProgress, skeletons: base, grounding,
    contactTargets: intent.contactTargets,
    progress: intent.globalProgress, sourceSkeletons: source, destinationSkeletons: destination,
  }
}
export function resolveTechniqueSkeletons(...args: Parameters<typeof resolveTechniqueFrameInputs>) {
  return resolveGrapplerPairFrame(resolveTechniqueFrameInputs(...args))
}
