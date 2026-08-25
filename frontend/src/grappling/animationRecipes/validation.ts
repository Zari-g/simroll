import type { MotionPrimitive } from '../motionPrimitives.ts'
import type { SkeletonPoseOverride } from '../types.ts'
import type { AnimationRecipe } from './types.ts'

function fail(recipe: AnimationRecipe, message: string): never {
  throw new Error(`Invalid animation recipe "${recipe.transitionId || '<empty>'}": ${message}`)
}

function requireFinite(
  recipe: AnimationRecipe,
  value: number | undefined,
  path: string,
) {
  if (value !== undefined && !Number.isFinite(value)) {
    fail(recipe, `${path} must be finite`)
  }
}

function requireFiniteValue(
  recipe: AnimationRecipe,
  value: number | undefined,
  path: string,
) {
  if (!Number.isFinite(value)) fail(recipe, `${path} must be finite`)
}

function validatePrimitive(
  recipe: AnimationRecipe,
  primitive: MotionPrimitive,
  path: string,
) {
  if (!primitive || typeof primitive !== 'object' || typeof primitive.type !== 'string') {
    fail(recipe, `${path} must be a motion primitive`)
  }

  switch (primitive.type) {
    case 'hipShift':
      requireFinite(recipe, primitive.forward, `${path}.forward`)
      requireFinite(recipe, primitive.lateral, `${path}.lateral`)
      return
    case 'hipEscape':
      requireFiniteValue(recipe, primitive.distance, `${path}.distance`)
      requireFinite(recipe, primitive.turn, `${path}.turn`)
      break
    case 'bridge':
      requireFiniteValue(recipe, primitive.lift, `${path}.lift`)
      requireFinite(recipe, primitive.extension, `${path}.extension`)
      return
    case 'sitUp':
      requireFiniteValue(recipe, primitive.amount, `${path}.amount`)
      requireFinite(recipe, primitive.drive, `${path}.drive`)
      return
    case 'postHand':
      requireFiniteValue(recipe, primitive.shoulder, `${path}.shoulder`)
      requireFinite(recipe, primitive.elbow, `${path}.elbow`)
      break
    case 'torsoTurn':
      requireFinite(recipe, primitive.spine, `${path}.spine`)
      requireFiniteValue(recipe, primitive.chest, `${path}.chest`)
      return
    case 'pelvisRotation':
      requireFiniteValue(recipe, primitive.amount, `${path}.amount`)
      return
    case 'kneeDrive':
    case 'legPummel':
      requireFiniteValue(recipe, primitive.hip, `${path}.hip`)
      requireFiniteValue(recipe, primitive.knee, `${path}.knee`)
      break
    case 'weightShift':
      requireFinite(recipe, primitive.forward, `${path}.forward`)
      requireFinite(recipe, primitive.lateral, `${path}.lateral`)
      requireFinite(recipe, primitive.torso, `${path}.torso`)
      return
    default:
      fail(recipe, `${path}.type is unsupported`)
  }

  if (primitive.side !== 'left' && primitive.side !== 'right') {
    fail(recipe, `${path}.side must be left or right`)
  }
}

function validateOverride(
  recipe: AnimationRecipe,
  override: SkeletonPoseOverride | undefined,
  path: string,
) {
  requireFinite(recipe, override?.root?.position?.x, `${path}.root.position.x`)
  requireFinite(recipe, override?.root?.position?.y, `${path}.root.position.y`)
  requireFinite(recipe, override?.root?.rotation, `${path}.root.rotation`)
  for (const [joint, transform] of Object.entries(override?.joints ?? {})) {
    requireFinite(recipe, transform?.x, `${path}.joints.${joint}.x`)
    requireFinite(recipe, transform?.y, `${path}.joints.${joint}.y`)
    requireFinite(recipe, transform?.rotation, `${path}.joints.${joint}.rotation`)
  }
}

/** Fail fast on invalid authored data. Phases must already be strictly ordered. */
export function validateAnimationRecipe(recipe: AnimationRecipe): AnimationRecipe {
  if (typeof recipe.transitionId !== 'string' || recipe.transitionId.trim() === '') {
    fail(recipe, 'transitionId must be non-empty')
  }
  if (!Number.isFinite(recipe.durationMs) || recipe.durationMs <= 0) {
    fail(recipe, 'durationMs must be finite and greater than zero')
  }

  let previousProgress = 0
  for (const [phaseIndex, phase] of recipe.phases.entries()) {
    const path = `phases[${phaseIndex}]`
    if (!Number.isFinite(phase.progress) || phase.progress <= 0 || phase.progress >= 1) {
      fail(recipe, `${path}.progress must be finite and within (0, 1)`)
    }
    if (phase.progress <= previousProgress) {
      fail(recipe, `${path}.progress must be strictly ordered and unique`)
    }
    previousProgress = phase.progress
    if (
      phase.baseProgress !== undefined &&
      (!Number.isFinite(phase.baseProgress) || phase.baseProgress < 0 || phase.baseProgress > 1)
    ) {
      fail(recipe, `${path}.baseProgress must be finite and within [0, 1]`)
    }
    for (const player of ['playerA', 'playerB'] as const) {
      const choreography = phase[player]
      choreography?.primitives?.forEach((primitive, primitiveIndex) =>
        validatePrimitive(recipe, primitive, `${path}.${player}.primitives[${primitiveIndex}]`),
      )
      validateOverride(recipe, choreography?.override, `${path}.${player}.override`)
    }
  }

  for (const [player, groups] of Object.entries(recipe.timing ?? {})) {
    for (const [group, value] of Object.entries(groups ?? {})) {
      requireFinite(recipe, value, `timing.${player}.${group}`)
    }
  }

  for (const [index, contact] of (recipe.requirements?.contacts ?? []).entries()) {
    if (contact.contactId.trim() === '') {
      fail(recipe, `requirements.contacts[${index}].contactId must be non-empty`)
    }
    requireFinite(recipe, contact.maintainedFrom, `requirements.contacts[${index}].maintainedFrom`)
    requireFinite(recipe, contact.maintainedUntil, `requirements.contacts[${index}].maintainedUntil`)
    for (const value of [contact.maintainedFrom, contact.maintainedUntil]) {
      if (value !== undefined && (value < 0 || value > 1)) {
        fail(recipe, `requirements.contacts[${index}] progress must be within [0, 1]`)
      }
    }
    if (
      contact.maintainedFrom !== undefined &&
      contact.maintainedUntil !== undefined &&
      contact.maintainedFrom > contact.maintainedUntil
    ) {
      fail(recipe, `requirements.contacts[${index}] range must be ordered`)
    }
  }

  for (const [index, control] of (recipe.requirements?.controls ?? []).entries()) {
    if (control.controlId.trim() === '') {
      fail(recipe, `requirements.controls[${index}].controlId must be non-empty`)
    }
    requireFinite(recipe, control.activeFrom, `requirements.controls[${index}].activeFrom`)
    requireFinite(recipe, control.activeUntil, `requirements.controls[${index}].activeUntil`)
    for (const value of [control.activeFrom, control.activeUntil]) {
      if (value !== undefined && (value < 0 || value > 1)) {
        fail(recipe, `requirements.controls[${index}] progress must be within [0, 1]`)
      }
    }
    if (
      control.activeFrom !== undefined &&
      control.activeUntil !== undefined &&
      control.activeFrom > control.activeUntil
    ) {
      fail(recipe, `requirements.controls[${index}] range must be ordered`)
    }
  }

  return recipe
}
