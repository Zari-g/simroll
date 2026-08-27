import type {
  ContactAnchor,
  GrapplerBodyPartName,
  GrapplerId,
  GrapplingContact,
} from './types.ts'
import type { RelationalAnchorMode } from './contactCorrection.ts'

export type ControlSide = 'left' | 'right'

export type BodyLandmark =
  | 'hand'
  | 'wrist'
  | 'forearm'
  | 'elbow'
  | 'upperArm'
  | 'shoulder'
  | 'head'
  | 'neck'
  | 'chest'
  | 'torso'
  | 'waist'
  | 'hip'
  | 'thigh'
  | 'knee'
  | 'shin'
  | 'ankle'
  | 'foot'

type ControlParticipant = 'controller' | 'opponent'
type SideSelector = 'controlSide' | 'oppositeSide' | 'left' | 'right'

export interface SemanticContactPoint {
  readonly participant: ControlParticipant
  readonly landmark: BodyLandmark
  readonly side?: SideSelector
}

export interface SemanticContactTarget {
  readonly id: string
  readonly type: GrapplingContact['type']
  readonly source: SemanticContactPoint
  readonly target: SemanticContactPoint
  readonly strength?: number
  /** Optional bounded joint correction supplied to the contact solver. */
  readonly relationalAnchor?: RelationalAnchorMode
}

export interface ControlTargetDefinition {
  readonly id: string
  readonly contacts: readonly SemanticContactTarget[]
}

export interface ActiveVisualControl {
  readonly controlId: string
  readonly controller: GrapplerId
  readonly opponent: GrapplerId
  /** Defaults to left so side-less backend controls resolve deterministically. */
  readonly side?: ControlSide
  readonly strength?: number
}

export interface CompiledControlContact {
  readonly controlId: string
  readonly contact: GrapplingContact
  readonly strength: number
  readonly relationalAnchor?: RelationalAnchorMode
}

const point = (
  participant: ControlParticipant,
  landmark: BodyLandmark,
  side?: SideSelector,
): SemanticContactPoint => ({ participant, landmark, side })

const definitions = [
  { id: 'wrist_control', contacts: [
    { id: 'hand-to-wrist', type: 'grip', source: point('controller', 'hand', 'controlSide'), target: point('opponent', 'wrist', 'oppositeSide'), relationalAnchor: 'hand-to-grip-target' },
  ] },
  { id: 'sleeve_grip', contacts: [
    { id: 'hand-to-sleeve', type: 'grip', source: point('controller', 'hand', 'controlSide'), target: point('opponent', 'forearm', 'oppositeSide'), relationalAnchor: 'hand-to-grip-target' },
  ] },
  { id: 'collar_grip', contacts: [
    { id: 'hand-to-collar', type: 'grip', source: point('controller', 'hand', 'controlSide'), target: point('opponent', 'chest'), relationalAnchor: 'hand-to-grip-target' },
  ] },
  { id: 'ankle_control', contacts: [
    { id: 'hand-to-ankle', type: 'grip', source: point('controller', 'hand', 'controlSide'), target: point('opponent', 'ankle', 'oppositeSide'), relationalAnchor: 'hand-to-grip-target' },
  ] },
  { id: 'underhook', contacts: [
    { id: 'under-arm-to-torso', type: 'control', source: point('controller', 'forearm', 'controlSide'), target: point('opponent', 'torso') },
    { id: 'under-upper-arm-to-shoulder', type: 'control', source: point('controller', 'upperArm', 'controlSide'), target: point('opponent', 'shoulder', 'oppositeSide'), strength: 0.72 },
  ] },
  { id: 'overhook', contacts: [
    { id: 'over-arm-to-upper-arm', type: 'control', source: point('controller', 'forearm', 'controlSide'), target: point('opponent', 'upperArm', 'oppositeSide') },
  ] },
  { id: 'crossface', contacts: [
    { id: 'upper-arm-to-head', type: 'pressure', source: point('controller', 'upperArm', 'controlSide'), target: point('opponent', 'head') },
    { id: 'shoulder-to-chest', type: 'pressure', source: point('controller', 'shoulder', 'controlSide'), target: point('opponent', 'chest'), strength: 0.7 },
  ] },
  { id: 'frame', contacts: [
    { id: 'forearm-to-chest', type: 'control', source: point('controller', 'forearm', 'controlSide'), target: point('opponent', 'chest') },
  ] },
  { id: 'body_lock', contacts: [
    { id: 'left-arm-to-waist', type: 'control', source: point('controller', 'forearm', 'left'), target: point('opponent', 'waist') },
    { id: 'right-arm-to-waist', type: 'control', source: point('controller', 'forearm', 'right'), target: point('opponent', 'waist') },
  ] },
  { id: 'seatbelt', contacts: [
    { id: 'over-arm-to-chest', type: 'control', source: point('controller', 'forearm', 'controlSide'), target: point('opponent', 'chest') },
    { id: 'under-arm-to-waist', type: 'control', source: point('controller', 'forearm', 'oppositeSide'), target: point('opponent', 'waist') },
  ] },
  { id: 'butterfly_hook', contacts: [
    { id: 'foot-to-inside-thigh', type: 'hook', source: point('controller', 'foot', 'controlSide'), target: point('opponent', 'thigh', 'oppositeSide'), relationalAnchor: 'foot-to-inner-thigh' },
  ] },
  { id: 'closed_guard_connection', contacts: [
    { id: 'left-shin-to-waist', type: 'hook', source: point('controller', 'shin', 'left'), target: point('opponent', 'waist') },
    { id: 'right-shin-to-waist', type: 'hook', source: point('controller', 'shin', 'right'), target: point('opponent', 'waist') },
  ] },
] as const satisfies readonly ControlTargetDefinition[]

const bodyLandmarks = new Set<BodyLandmark>([
  'hand', 'wrist', 'forearm', 'elbow', 'upperArm', 'shoulder', 'head',
  'neck', 'chest', 'torso', 'waist', 'hip', 'thigh', 'knee', 'shin',
  'ankle', 'foot',
])
const participants = new Set<ControlParticipant>(['controller', 'opponent'])
const sideSelectors = new Set<SideSelector>([
  'controlSide', 'oppositeSide', 'left', 'right',
])
const contactTypes = new Set<GrapplingContact['type']>([
  'grip', 'hook', 'pressure', 'control',
])
const relationalAnchorModes = new Set<RelationalAnchorMode>([
  'hand-to-grip-target', 'knee-to-hip-line', 'foot-to-inner-thigh',
])

export function validateControlTargetDefinition(
  definition: ControlTargetDefinition,
): ControlTargetDefinition {
  if (!definition.id.trim() || definition.contacts.length === 0) {
    throw new Error('Control target definitions require an ID and contacts')
  }
  const contactIds = new Set<string>()
  for (const contact of definition.contacts) {
    if (!contact.id.trim() || contactIds.has(contact.id)) {
      throw new Error(`Control target "${definition.id}" has an invalid or duplicate contact ID`)
    }
    contactIds.add(contact.id)
    if (!contactTypes.has(contact.type)) {
      throw new Error(`Control target "${definition.id}" has an invalid contact type`)
    }
    if (
      contact.strength !== undefined &&
      (!Number.isFinite(contact.strength) || contact.strength < 0 || contact.strength > 1)
    ) {
      throw new Error(`Control target "${definition.id}" strength must be within [0, 1]`)
    }
    if (
      contact.relationalAnchor !== undefined &&
      !relationalAnchorModes.has(contact.relationalAnchor)
    ) {
      throw new Error(`Control target "${definition.id}" has an invalid relational anchor`)
    }
    for (const reference of [contact.source, contact.target]) {
      if (
        !participants.has(reference.participant) ||
        !bodyLandmarks.has(reference.landmark) ||
        (reference.side !== undefined && !sideSelectors.has(reference.side))
      ) {
        throw new Error(`Control target "${definition.id}" has an invalid body landmark reference`)
      }
    }
  }
  return definition
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) deepFreeze(nested)
  }
  return value
}

const registry: Record<string, ControlTargetDefinition> = Object.create(null)
for (const definition of definitions) {
  validateControlTargetDefinition(definition)
  if (registry[definition.id]) throw new Error(`Duplicate control target "${definition.id}"`)
  registry[definition.id] = deepFreeze(definition)
}
export const controlTargetRegistry: Readonly<Record<string, ControlTargetDefinition>> =
  Object.freeze(registry)

export function getControlTargetDefinition(
  controlId: string,
): ControlTargetDefinition | null {
  return controlTargetRegistry[controlId] ?? null
}

function opposite(side: ControlSide): ControlSide {
  return side === 'left' ? 'right' : 'left'
}

function resolveSide(selector: SideSelector | undefined, side: ControlSide) {
  if (selector === 'left' || selector === 'right') return selector
  return selector === 'oppositeSide' ? opposite(side) : side
}

function landmarkAnchor(
  grapplerId: GrapplerId,
  landmark: BodyLandmark,
  side: ControlSide,
): ContactAnchor {
  const sided = (suffix: string) => `${side}${suffix}` as GrapplerBodyPartName
  switch (landmark) {
    case 'hand': return { grapplerId, bodyPart: sided('Hand'), anchor: 'center' }
    case 'wrist': return { grapplerId, bodyPart: sided('Forearm'), anchor: 'end' }
    case 'forearm': return { grapplerId, bodyPart: sided('Forearm'), anchor: 'midpoint' }
    case 'elbow': return { grapplerId, bodyPart: sided('UpperArm'), anchor: 'end' }
    case 'upperArm': return { grapplerId, bodyPart: sided('UpperArm'), anchor: 'midpoint' }
    case 'shoulder': return { grapplerId, bodyPart: sided('UpperArm'), anchor: 'start' }
    case 'head': return { grapplerId, bodyPart: 'head', anchor: 'center' }
    case 'neck': return { grapplerId, bodyPart: 'torso', anchor: 'end' }
    case 'chest': return { grapplerId, bodyPart: 'torso', anchor: 'end' }
    case 'torso': return { grapplerId, bodyPart: 'torso', anchor: 'midpoint' }
    case 'waist': return { grapplerId, bodyPart: 'torso', anchor: 'start' }
    case 'hip': return { grapplerId, bodyPart: sided('Thigh'), anchor: 'start' }
    case 'thigh': return { grapplerId, bodyPart: sided('Thigh'), anchor: 'midpoint' }
    case 'knee': return { grapplerId, bodyPart: sided('Thigh'), anchor: 'end' }
    case 'shin': return { grapplerId, bodyPart: sided('Shin'), anchor: 'midpoint' }
    case 'ankle': return { grapplerId, bodyPart: sided('Shin'), anchor: 'end' }
    case 'foot': return { grapplerId, bodyPart: sided('Foot'), anchor: 'center' }
  }
}

function resolvePoint(
  reference: SemanticContactPoint,
  control: ActiveVisualControl,
  controlSide: ControlSide,
): ContactAnchor {
  return landmarkAnchor(
    reference.participant === 'controller' ? control.controller : control.opponent,
    reference.landmark,
    resolveSide(reference.side, controlSide),
  )
}

/** Compile semantic relationships into the existing contact-correction contract. */
export function compileControlsToContacts(
  controls: readonly ActiveVisualControl[],
): readonly CompiledControlContact[] {
  return controls.flatMap((control) => {
    const definition = getControlTargetDefinition(control.controlId)
    if (!definition) return []
    if (
      !['playerA', 'playerB'].includes(control.controller) ||
      !['playerA', 'playerB'].includes(control.opponent) ||
      control.controller === control.opponent ||
      (control.side !== undefined && control.side !== 'left' && control.side !== 'right')
    ) {
      throw new Error(`Invalid participants for visual control "${control.controlId}"`)
    }
    const strength = control.strength ?? 1
    if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
      throw new Error(`Visual control "${control.controlId}" strength must be within [0, 1]`)
    }
    if (strength === 0) return []
    const controlSide = control.side ?? 'left'
    return definition.contacts.map((target): CompiledControlContact => ({
      controlId: control.controlId,
      strength: Math.min(1, strength) * (target.strength ?? 1),
      relationalAnchor: target.relationalAnchor,
      contact: {
        id: `control:${control.controlId}:${control.controller}:${controlSide}:${target.id}`,
        type: target.type,
        source: resolvePoint(target.source, control, controlSide),
        target: resolvePoint(target.target, control, controlSide),
      } as GrapplingContact,
    }))
  })
}
