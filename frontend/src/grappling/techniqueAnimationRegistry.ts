import dataset from '../../../data/generated/simroll_bjj_mvp.normalized.json' with { type: 'json' }
import { techniqueAnimations } from './techniqueAnimations.ts'
import { compileTechniqueAnimation } from './techniqueInterpreter.ts'
import type { Grip } from '../types/api.ts'

const validationContext = {
  transitionIds: new Set(dataset.positional_transitions.map(transition => transition.id)),
  positionIds: new Set(dataset.positions.map(position => position.id)),
}
export const techniqueGrips: readonly Grip[] = dataset.controls.map(control => ({
  id: control.id, gi_required: control.gi_allowed && !control.no_gi_allowed,
  name: control.id, grip_type: '', control_target: '', dominant_hand: '', tags: [],
}))
const registry = new Map(techniqueAnimations.map(definition => [definition.transitionId as string, compileTechniqueAnimation(definition, validationContext)]))
export function getTechniqueAnimation(transitionId: string) {
  return registry.get(transitionId) ?? null
}
