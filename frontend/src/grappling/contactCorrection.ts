import { defaultGrapplerAnatomy } from './anatomy.ts'
import { resolveContactPoint } from './contactGeometry.ts'
import { skeletonToGrapplerPose } from './kinematics.ts'
import type { GrapplerSkeletonPose } from './skeleton.ts'
import type {
  GrapplerId,
  GrapplingContact,
} from './types.ts'

export type GrapplerSkeletonPair = Readonly<
  Record<GrapplerId, GrapplerSkeletonPose>
>

export interface ContactCorrectionTarget {
  readonly contact: GrapplingContact
  /** Phase-level influence in the inclusive 0..1 range. */
  readonly strength: number
}

export interface ContactCorrectionOptions {
  readonly maxContacts?: number
  readonly maxCorrection?: number
}

const typePriority: Readonly<Record<GrapplingContact['type'], number>> = {
  grip: 4,
  hook: 3,
  pressure: 2,
  control: 1,
}

const typeStrength: Readonly<Record<GrapplingContact['type'], number>> = {
  grip: 0.82,
  hook: 0.62,
  pressure: 0.48,
  control: 0.38,
}

function cloneSkeleton(pose: GrapplerSkeletonPose): GrapplerSkeletonPose {
  return {
    root: {
      position: { ...pose.root.position },
      rotation: pose.root.rotation,
    },
    joints: Object.fromEntries(
      Object.entries(pose.joints).map(([name, transform]) => [
        name,
        { ...transform },
      ]),
    ) as GrapplerSkeletonPose['joints'],
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

/**
 * Apply a bounded, deterministic root-space correction to the strongest
 * declared contacts. This is deliberately not a limb solver: local joint
 * transforms stay untouched and therefore remain inside their constraints.
 */
export function correctSkeletonContacts(
  skeletons: GrapplerSkeletonPair,
  targets: readonly ContactCorrectionTarget[],
  options: ContactCorrectionOptions = {},
): GrapplerSkeletonPair {
  const result: Record<GrapplerId, GrapplerSkeletonPose> = {
    playerA: cloneSkeleton(skeletons.playerA),
    playerB: cloneSkeleton(skeletons.playerB),
  }
  const maxContacts = Math.max(0, options.maxContacts ?? 2)
  const maxCorrection = Math.max(0, options.maxCorrection ?? 24)
  const ranked = targets
    .map((target, index) => ({ ...target, index }))
    .filter(({ contact, strength }) =>
      contact.source.grapplerId !== contact.target.grapplerId &&
      Number.isFinite(strength) &&
      strength > 0,
    )
    .sort((left, right) =>
      typePriority[right.contact.type] * clamp01(right.strength) -
        typePriority[left.contact.type] * clamp01(left.strength) ||
      left.contact.id.localeCompare(right.contact.id) ||
      left.index - right.index,
    )
    .slice(0, maxContacts)

  const correctionsBySource = new Map<GrapplerId, number>()
  for (const { contact, strength } of ranked) {
    const poses = {
      playerA: skeletonToGrapplerPose(result.playerA),
      playerB: skeletonToGrapplerPose(result.playerB),
    }
    const geometry = resolveContactPoint(contact, poses, {
      playerA: defaultGrapplerAnatomy,
      playerB: defaultGrapplerAnatomy,
    })
    const delta = {
      x: geometry.target.x - geometry.source.x,
      y: geometry.target.y - geometry.source.y,
    }
    const distance = Math.hypot(delta.x, delta.y)
    if (distance === 0 || !Number.isFinite(distance)) continue

    const source = contact.source.grapplerId
    const previousCorrections = correctionsBySource.get(source) ?? 0
    const influence =
      typeStrength[contact.type] * clamp01(strength) * Math.pow(0.55, previousCorrections)
    const correctionDistance = Math.min(maxCorrection, distance * influence)
    const scale = correctionDistance / distance
    const pose = result[source]
    result[source] = {
      root: {
        position: {
          x: pose.root.position.x + delta.x * scale,
          y: pose.root.position.y + delta.y * scale,
        },
        rotation: pose.root.rotation,
      },
      joints: Object.fromEntries(
        Object.entries(pose.joints).map(([name, transform]) => [name, { ...transform }]),
      ) as GrapplerSkeletonPose['joints'],
    }
    correctionsBySource.set(source, previousCorrections + 1)
  }

  return result
}
