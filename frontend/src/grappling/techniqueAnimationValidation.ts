import { validateMotionPrimitive } from './animationRecipes/validation.ts'
import { getControlTargetDefinition, validateControlTargetDefinition } from './controlTargets.ts'
import { grapplerJointNames } from './skeleton.ts'
import type { TechniqueAnimationDefinition, TechniqueParticipants } from './techniqueAnimationTypes.ts'

export interface TechniqueAnimationValidationContext {
  readonly transitionIds: ReadonlySet<string>
  readonly positionIds: ReadonlySet<string>
}

function requireCondition(condition: boolean, path: string): asserts condition {
  if (!condition) throw new Error(`Invalid technique animation: ${path}`)
}

function isArray(value: unknown): boolean {
  return Array.isArray(value)
}

function nonempty(value: string) {
  return typeof value === 'string' && value.trim().length > 0
}

function keys(value: object, allowed: readonly string[], path: string) {
  requireCondition(value !== null && typeof value === 'object' && !isArray(value), `${path} must be an object`)
  requireCondition(Object.keys(value).every((key) => allowed.includes(key)), `${path} has an unknown field`)
}

function participants(value: TechniqueParticipants, path: string) {
  requireCondition(
    (value.controller === 'playerA' && value.opponent === 'playerB') ||
    (value.controller === 'playerB' && value.opponent === 'playerA'),
    `${path} requires distinct playerA/playerB participants`,
  )
}

function side(value: string | undefined, path: string) {
  requireCondition(value === undefined || value === 'left' || value === 'right', `${path} has invalid side`)
}

/** Validate authored TS data without compiling, mutating, or solving frames. */
export function validateTechniqueAnimationDefinition(
  definition: TechniqueAnimationDefinition,
  context: TechniqueAnimationValidationContext,
): TechniqueAnimationDefinition {
  keys(definition, ['transitionId', 'phases', 'metadata'], 'definition')
  requireCondition(nonempty(definition.transitionId) && context.transitionIds.has(definition.transitionId), 'unknown transitionId')
  requireCondition(isArray(definition.phases) && definition.phases.length > 0, 'phases must be nonempty')
  const ids = new Set<string>()
  let totalDuration = 0
  for (const phase of definition.phases) {
    keys(phase, ['id', 'duration', 'playerA', 'playerB', 'controls', 'relationalTargets', 'grounding', 'targetPosition', 'easing'], 'phase')
    requireCondition(nonempty(phase.id) && !ids.has(phase.id), 'invalid or duplicate phase ID')
    ids.add(phase.id)
    requireCondition(Number.isFinite(phase.duration) && phase.duration > 0, `${phase.id}.duration must be positive and finite`)
    totalDuration += phase.duration
    requireCondition(phase.easing === undefined || ['linear', 'easeInOutCubic'].includes(phase.easing), `${phase.id}.easing is invalid`)
    if (phase.targetPosition !== undefined) {
      requireCondition(context.positionIds.has(phase.targetPosition), `${phase.id}.targetPosition is unknown`)
    }
    for (const player of ['playerA', 'playerB'] as const) {
      const actions = phase[player]
      if (actions === undefined) continue
      keys(actions, ['primitives'], `${phase.id}.${player}`)
      if (actions.primitives !== undefined) {
        requireCondition(isArray(actions.primitives), `${phase.id}.${player}.primitives must be an array`)
        actions.primitives.forEach((primitive, index) =>
          validateMotionPrimitive(definition, primitive, `${phase.id}.${player}.primitives[${index}]`))
      }
    }
    for (const field of ['controls', 'relationalTargets', 'grounding'] as const) {
      requireCondition(phase[field] === undefined || isArray(phase[field]), `${phase.id}.${field} must be an array`)
    }
    const controlKeys = new Set<string>()
    for (const control of phase.controls ?? []) {
      keys(control, ['controlId', 'controller', 'opponent', 'side', 'strength', 'action', 'modes'], `${phase.id}.control`)
      participants(control, phase.id)
      side(control.side, phase.id)
      requireCondition(nonempty(control.controlId) && !!getControlTargetDefinition(control.controlId), `${phase.id} has unknown controlId`)
      requireCondition(['preserve', 'acquire', 'release'].includes(control.action), `${phase.id} has invalid lifecycle action`)
      requireCondition(control.strength === undefined || (Number.isFinite(control.strength) && control.strength >= 0 && control.strength <= 1), `${phase.id} has invalid control strength`)
      if (control.modes !== undefined) {
        requireCondition(isArray(control.modes) && control.modes.length > 0 && control.modes.every((mode) => mode === 'gi' || mode === 'no_gi') && new Set(control.modes).size === control.modes.length, `${phase.id} has invalid modes`)
      }
      const key = `${control.controlId}:${control.controller}:${control.opponent}:${control.side ?? 'left'}`
      requireCondition(!controlKeys.has(key), `${phase.id} has duplicate control changes`)
      controlKeys.add(key)
    }
    const relationshipIds = new Set<string>()
    for (const target of phase.relationalTargets ?? []) {
      keys(target, ['id', 'controller', 'opponent', 'side', 'controlId', 'contacts'], `${phase.id}.relationalTarget`)
      participants(target, phase.id)
      side(target.side, phase.id)
      requireCondition(nonempty(target.id) && !relationshipIds.has(target.id), `${phase.id} has invalid or duplicate relational target ID`)
      relationshipIds.add(target.id)
      requireCondition(target.controlId === undefined || !!getControlTargetDefinition(target.controlId), `${phase.id} has unknown relational controlId`)
      requireCondition(isArray(target.contacts) && target.contacts.length > 0, `${phase.id} requires relational contacts`)
      for (const contact of target.contacts) {
        keys(contact, ['id', 'type', 'source', 'target', 'strength', 'relationalAnchor'], `${phase.id}.contact`)
        requireCondition(nonempty(contact.id), `${phase.id} requires a contact ID`)
        for (const point of [contact.source, contact.target]) keys(point, ['participant', 'landmark', 'side'], `${phase.id}.contact point`)
        requireCondition(contact.source.participant !== contact.target.participant, `${phase.id} relationship must connect both grapplers`)
      }
      validateControlTargetDefinition(target)
    }
    const groundedPlayers = new Set<string>()
    for (const intent of phase.grounding ?? []) {
      keys(intent, ['grapplerId', 'joint', 'baseline'], `${phase.id}.grounding`)
      requireCondition(intent.grapplerId === 'playerA' || intent.grapplerId === 'playerB', `${phase.id} has invalid grounded grappler`)
      requireCondition(grapplerJointNames.includes(intent.joint), `${phase.id} has invalid grounded joint`)
      requireCondition(['phaseStart', 'transitionBlend'].includes(intent.baseline), `${phase.id} has invalid grounding baseline`)
      requireCondition(!groundedPlayers.has(intent.grapplerId), `${phase.id} supports one grounding anchor per grappler`)
      groundedPlayers.add(intent.grapplerId)
    }
  }
  requireCondition(Number.isFinite(totalDuration), 'total duration must be finite')
  if (definition.metadata !== undefined) {
    keys(definition.metadata, ['description', 'tags'], 'metadata')
    requireCondition(definition.metadata.description === undefined || typeof definition.metadata.description === 'string', 'metadata.description must be text')
    requireCondition(definition.metadata.tags === undefined || (isArray(definition.metadata.tags) && definition.metadata.tags.every(nonempty)), 'metadata.tags must contain nonempty strings')
  }
  return definition
}
