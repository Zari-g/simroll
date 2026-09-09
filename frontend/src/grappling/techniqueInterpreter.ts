import { resolveSkeletonPose } from './kinematics.ts'
import type { GrapplerSkeletonPair } from './contactCorrection.ts'
import type { FrameGrounding } from './resolveAnimationFrame.ts'
import { compileControlsToContacts, type ActiveVisualControl } from './controlTargets.ts'
import { validateTechniqueAnimationDefinition, type TechniqueAnimationValidationContext } from './techniqueAnimationValidation.ts'
import type { TechniqueAnimationDefinition } from './techniqueAnimationTypes.ts'
import type { GrapplingMode, Grip } from '../types/api.ts'
import { filterActiveControlsForMode } from '../utils/activeControls.ts'
import { easeInOutCubic } from './animationInterpolation.ts'

export function clampTechniqueProgress(progress: number) {
  return Number.isNaN(progress) ? 0 : Math.max(0, Math.min(1, progress))
}

/** Half-open ranges: an exact internal boundary belongs to the next phase. */
export function normalizePhaseTiming(phases: readonly { readonly duration: number }[]) {
  const total = phases.reduce((sum, phase) => sum + phase.duration, 0)
  if (!phases.length || !Number.isFinite(total) || phases.some(p => !Number.isFinite(p.duration) || p.duration <= 0)) {
    throw new Error('Phase durations must be positive, finite and nonempty')
  }
  let elapsed = 0
  return phases.map((phase, index) => {
    const start = elapsed / total
    elapsed += phase.duration
    const end = index === phases.length - 1 ? 1 : elapsed / total
    if (end <= start) throw new Error('Phase duration is too small to represent a normalized range')
    return Object.freeze({ start, end })
  })
}

const compiledBrand: unique symbol = Symbol('compiledTechnique')
export interface CompiledTechniqueAnimation {
  readonly [compiledBrand]: true
  readonly definition: TechniqueAnimationDefinition
  readonly timing: ReturnType<typeof normalizePhaseTiming>
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

/** Validate and snapshot once, before playback. Raw authoring cannot be interpreted. */
export function compileTechniqueAnimation(definition: TechniqueAnimationDefinition, context: TechniqueAnimationValidationContext): CompiledTechniqueAnimation {
  validateTechniqueAnimationDefinition(definition, context)
  return freeze({ [compiledBrand]: true as const, definition: structuredClone(definition), timing: normalizePhaseTiming(definition.phases) })
}

export interface TechniqueInterpretationContext {
  readonly baselines?: {
    readonly phaseStart: (index: number) => GrapplerSkeletonPair
    readonly transitionBlend: (progress: number) => GrapplerSkeletonPair
    readonly current?: GrapplerSkeletonPair
  }
  readonly mode: GrapplingMode
  readonly grips: readonly Grip[]
  /** Authoritative state at transition entry, not the previous visual frame. */
  readonly controls?: readonly ActiveVisualControl[]
}

function key(control: ActiveVisualControl) {
  return `${control.controlId}:${control.controller}:${control.opponent}:${control.side ?? 'left'}`
}

export function interpretTechniqueAnimation(compiled: CompiledTechniqueAnimation, progress: number, context: TechniqueInterpretationContext) {
  if (compiled[compiledBrand] !== true) throw new Error('Compile and validate the technique before interpretation')
  const globalProgress = clampTechniqueProgress(progress)
  const phaseIndex = globalProgress === 1 ? compiled.timing.length - 1 : compiled.timing.findIndex(range => globalProgress < range.end)
  const range = compiled.timing[phaseIndex]
  const phase = compiled.definition.phases[phaseIndex]
  const phaseProgress = globalProgress === 1 ? 1 : (globalProgress - range.start) / (range.end - range.start)
  const easedPhaseProgress = phase.easing === 'linear' ? phaseProgress : easeInOutCubic(phaseProgress)
  // Reuse canonical Grip.gi_required filtering, including caller-supplied grip metadata.
  const legal = new Set(filterActiveControlsForMode(context.grips.map(grip => ({ control_id: grip.id, owner: 'player_a', target: 'player_b' })), context.grips, context.mode).map(control => control.control_id))
  const allowed = (id: string) => context.mode === 'gi' || !context.grips.some(grip => grip.id === id) || legal.has(id)
  const active = new Map<string, ActiveVisualControl>()
  for (const control of context.controls ?? []) if (allowed(control.controlId)) active.set(key(control), control)
  for (let index = 0; index <= phaseIndex; index++) {
    for (const change of compiled.definition.phases[index].controls ?? []) {
      if (!allowed(change.controlId) || (change.modes && !change.modes.includes(context.mode))) continue
      const controlKey = key(change)
      if (change.action === 'release') active.delete(controlKey)
      if (change.action === 'acquire' || (change.action === 'preserve' && active.has(controlKey))) {
        const { controlId, controller, opponent, side, strength } = change
        active.set(controlKey, { ...active.get(controlKey), controlId, controller, opponent, side, ...(strength === undefined ? {} : { strength }) })
      }
    }
  }
  const controls = [...active.values()]
  const relationships = (phase.relationalTargets ?? []).flatMap(target => {
    const control = target.controlId ? active.get(key({ ...target, controlId: target.controlId })) : undefined
    if (target.controlId && !control) return []
    return compileControlsToContacts([{ ...target, controlId: target.id, strength: control?.strength }], () => target)
  })
  const constraintInfluence = easeInOutCubic(Math.min(1, phaseProgress / 0.12, (1 - phaseProgress) / 0.12))
  const grounding = resolveTechniqueGrounding(compiled, phaseIndex, globalProgress, constraintInfluence, context.baselines)
  return {
    globalProgress, phaseId: phase.id, phaseIndex, phaseProgress, easedPhaseProgress,
    phaseStart: range.start, phaseEnd: range.end,
    playerA: phase.playerA ?? {}, playerB: phase.playerB ?? {},
    controls, relationships,
    constraintInfluence,
    contactTargets: [...compileControlsToContacts(controls), ...relationships].map(target => ({ ...target, strength: target.strength * constraintInfluence })),
    grounding, targetPosition: phase.targetPosition,
  }
}

export type InterpretedTechniqueFrame = ReturnType<typeof interpretTechniqueAnimation>

/** Ease the constraint binding at phase edges while retaining the declared anchor. */
export function resolveTechniqueGrounding(
  compiled: CompiledTechniqueAnimation,
  phaseIndex: number,
  progress: number,
  influence: number,
  baselines?: TechniqueInterpretationContext['baselines'],
): FrameGrounding {
  const grounding: Partial<Record<'playerA' | 'playerB', FrameGrounding['playerA']>> = {}
  if (baselines) for (const anchor of compiled.definition.phases[phaseIndex].grounding ?? []) {
    const baseline = anchor.baseline === 'phaseStart' ? baselines.phaseStart(phaseIndex) : baselines.transitionBlend(progress)
    const targetY = resolveSkeletonPose(baseline[anchor.grapplerId]).joints[anchor.joint].y
    const currentY = baselines.current ? resolveSkeletonPose(baselines.current[anchor.grapplerId]).joints[anchor.joint].y : targetY
    grounding[anchor.grapplerId] = { [anchor.joint]: { baselineY: currentY + (targetY - currentY) * influence } }
  }
  return grounding
}
