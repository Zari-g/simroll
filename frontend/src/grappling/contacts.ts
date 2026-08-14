import type { GrapplerAnatomy } from './anatomy.ts'
import { resolveBodyPartLayerOrder } from './bodyGeometry.ts'
import type {
  BodyPartReference,
  GrapplerId,
  GrapplingPositionVisualDefinition,
  PositionContact,
  PositionOcclusionRules,
} from './types'

export type GrapplerAnatomyPair = Readonly<
  Record<GrapplerId, GrapplerAnatomy>
>

function referencesMatch(
  left: BodyPartReference,
  right: BodyPartReference,
): boolean {
  return (
    left.grapplerId === right.grapplerId &&
    left.bodyPart === right.bodyPart
  )
}

export function resolveSceneBodyPartOrder(
  playerOrder: readonly GrapplerId[],
  anatomies: GrapplerAnatomyPair,
  occlusion?: PositionOcclusionRules,
): readonly BodyPartReference[] {
  const order = playerOrder.flatMap((grapplerId) =>
    resolveBodyPartLayerOrder(anatomies[grapplerId]).map((bodyPart) => ({
      grapplerId,
      bodyPart,
    })),
  )

  for (const override of occlusion?.overrides ?? []) {
    const bodyPartIndex = order.findIndex((reference) =>
      referencesMatch(reference, override.bodyPart),
    )
    const relativeIndex = order.findIndex((reference) =>
      referencesMatch(reference, override.relativeTo),
    )

    if (bodyPartIndex === -1 || relativeIndex === -1 || bodyPartIndex === relativeIndex) {
      continue
    }

    const [bodyPart] = order.splice(bodyPartIndex, 1)
    const updatedRelativeIndex = order.findIndex((reference) =>
      referencesMatch(reference, override.relativeTo),
    )
    const insertionIndex =
      updatedRelativeIndex + (override.placement === 'after' ? 1 : 0)
    order.splice(insertionIndex, 0, bodyPart)
  }

  return order
}

export function resolvePositionContacts(
  visual: GrapplingPositionVisualDefinition,
): readonly PositionContact[] {
  return (visual.contacts ?? []).map((contact) => ({
    ...contact,
    source: {
      ...contact.source,
      offset: contact.source.offset && { ...contact.source.offset },
    },
    target: {
      ...contact.target,
      offset: contact.target.offset && { ...contact.target.offset },
    },
  }))
}
