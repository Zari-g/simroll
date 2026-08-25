import { techniqueFamilies } from './families.ts'
import type {
  AnimationRecipe,
  FamilyBackedAnimationRecipe,
  FamilyParameterDefinition,
  FamilyParameterReference,
  FamilyParameterValue,
  TechniqueFamily,
} from './types.ts'
import { validateAnimationRecipe } from './validation.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) deepFreeze(nested)
  }
  return value
}

function isReference(value: unknown): value is FamilyParameterReference {
  return Boolean(value && typeof value === 'object' && typeof (value as FamilyParameterReference).$param === 'string')
}

function fail(familyId: string, message: string): never {
  throw new Error(`Invalid technique family "${familyId || '<empty>'}": ${message}`)
}

function matchesKind(value: FamilyParameterValue, definition: FamilyParameterDefinition) {
  if (definition.kind === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (definition.kind === 'side') return value === 'left' || value === 'right'
  return ['forward', 'backward', 'left', 'right'].includes(String(value))
}

function validateParameterValue(
  familyId: string,
  name: string,
  value: FamilyParameterValue,
  definition: FamilyParameterDefinition,
) {
  if (!matchesKind(value, definition)) fail(familyId, `parameter "${name}" must be ${definition.kind}`)
  if (typeof value === 'number') {
    if (definition.min !== undefined && value < definition.min) fail(familyId, `parameter "${name}" is below its minimum`)
    if (definition.max !== undefined && value > definition.max) fail(familyId, `parameter "${name}" is above its maximum`)
  }
}

function sampleValue(definition: FamilyParameterDefinition): FamilyParameterValue {
  if (definition.default !== undefined) return definition.default
  if (definition.kind === 'number') return definition.min ?? 1
  if (definition.kind === 'side') return 'left'
  return 'forward'
}

function validateReferences(family: TechniqueFamily, value: unknown, path: string) {
  if (isReference(value)) {
    const definition = family.parameters[value.$param]
    if (!definition) fail(family.id, `${path} references unknown parameter "${value.$param}"`)
    if ((value.scale !== undefined || value.offset !== undefined) && definition.kind !== 'number') {
      fail(family.id, `${path} uses numeric modifiers with non-number parameter "${value.$param}"`)
    }
    if (value.opposite !== undefined && definition.kind !== 'side') {
      fail(family.id, `${path} uses opposite with non-side parameter "${value.$param}"`)
    }
    if (value.scale !== undefined && !Number.isFinite(value.scale)) fail(family.id, `${path}.scale must be finite`)
    if (value.offset !== undefined && !Number.isFinite(value.offset)) fail(family.id, `${path}.offset must be finite`)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateReferences(family, item, `${path}[${index}]`))
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) validateReferences(family, nested, `${path}.${key}`)
  }
}

function resolveValue(
  value: unknown,
  params: Readonly<Record<string, FamilyParameterValue>>,
): unknown {
  if (isReference(value)) {
    const resolved = params[value.$param]
    if (typeof resolved === 'number') return resolved * (value.scale ?? 1) + (value.offset ?? 0)
    if (value.opposite) return resolved === 'left' ? 'right' : 'left'
    return resolved
  }
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, params))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, resolveValue(nested, params)]))
  }
  return value
}

export function validateTechniqueFamily(family: TechniqueFamily): TechniqueFamily {
  if (typeof family.id !== 'string' || family.id.trim() === '') fail(family.id, 'id must be non-empty')
  if (!Number.isFinite(family.durationMs) || family.durationMs <= 0) fail(family.id, 'durationMs must be finite and greater than zero')
  for (const [name, definition] of Object.entries(family.parameters)) {
    if (name.trim() === '') fail(family.id, 'parameter names must be non-empty')
    if (!['number', 'side', 'direction'].includes(definition.kind)) fail(family.id, `parameter "${name}" has invalid kind`)
    if (definition.required && definition.default !== undefined) fail(family.id, `required parameter "${name}" cannot have a default`)
    if (definition.default !== undefined) validateParameterValue(family.id, name, definition.default, definition)
    for (const [bound, value] of [['min', definition.min], ['max', definition.max]] as const) {
      if (value !== undefined && (!Number.isFinite(value) || definition.kind !== 'number')) fail(family.id, `parameter "${name}" ${bound} is invalid`)
    }
    if (definition.min !== undefined && definition.max !== undefined && definition.min > definition.max) fail(family.id, `parameter "${name}" bounds are unordered`)
  }
  validateReferences(family, family.phases, 'phases')
  validateReferences(family, family.controls, 'controls')
  const sampleParams = Object.fromEntries(Object.entries(family.parameters).map(([name, definition]) => [name, sampleValue(definition)]))
  const sample = resolveValue({
    transitionId: `family-validation:${family.id}`,
    family: family.id,
    durationMs: family.durationMs,
    timing: family.timing,
    phases: family.phases,
    requirements: family.controls ? { controls: family.controls } : undefined,
  }, sampleParams) as AnimationRecipe
  validateAnimationRecipe(sample)
  return family
}

export function createTechniqueFamilyRegistry(
  families: readonly TechniqueFamily[],
): Readonly<Record<string, TechniqueFamily>> {
  const registry: Record<string, TechniqueFamily> = Object.create(null)
  for (const family of families) {
    validateTechniqueFamily(family)
    if (registry[family.id]) fail(family.id, 'duplicate family ID')
    registry[family.id] = deepFreeze(family)
  }
  deepFreeze(families)
  return Object.freeze(registry)
}

export const techniqueFamilyRegistry = createTechniqueFamilyRegistry(techniqueFamilies)

export function getTechniqueFamily(familyId: string): TechniqueFamily | null {
  return techniqueFamilyRegistry[familyId] ?? null
}

export function compileFamilyRecipe(authoring: FamilyBackedAnimationRecipe): AnimationRecipe {
  const family = getTechniqueFamily(authoring.familyId)
  if (!family) throw new Error(`Unknown technique family "${authoring.familyId}" for transition "${authoring.transitionId}"`)
  const params: Record<string, FamilyParameterValue> = {}
  for (const supplied of Object.keys(authoring.params)) {
    if (!family.parameters[supplied]) fail(family.id, `unknown parameter "${supplied}"`)
  }
  for (const [name, definition] of Object.entries(family.parameters)) {
    const value = authoring.params[name] ?? definition.default
    if (value === undefined) fail(family.id, `required parameter "${name}" was not supplied`)
    validateParameterValue(family.id, name, value, definition)
    params[name] = value
  }
  const recipe = resolveValue({
    transitionId: authoring.transitionId,
    recipeId: authoring.recipeId,
    family: family.id,
    durationMs: authoring.overrides?.durationMs ?? family.durationMs,
    timing: authoring.overrides?.timing ?? family.timing,
    phases: family.phases,
    requirements: authoring.overrides?.requirements ?? (family.controls ? { controls: family.controls } : undefined),
  }, params) as AnimationRecipe
  return validateAnimationRecipe(recipe)
}
