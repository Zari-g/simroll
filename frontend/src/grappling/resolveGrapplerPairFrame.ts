import type { ContactCorrectionTarget } from './contactCorrection.ts'
import {
  resolveAnimationFrame,
  type ResolveAnimationFrameInput,
} from './resolveAnimationFrame.ts'

/**
 * Relational correction is intentionally bounded to a primary pass and one
 * reduced follow-up pass. This is a policy constant, not a convergence limit:
 * the pair solver never recurses or observes an error threshold.
 */
export const PAIR_RELATIONAL_PASS_COUNT = 2 as const

/** The follow-up refreshes moving opponent landmarks without ping-ponging. */
export const PAIR_FOLLOW_UP_STRENGTH = 0.35 as const

export type ResolveGrapplerPairFrameInput = ResolveAnimationFrameInput

function isRelationalTarget(
  target: ContactCorrectionTarget,
): target is ContactCorrectionTarget & Required<Pick<ContactCorrectionTarget, 'relationalAnchor'>> {
  return target.relationalAnchor !== undefined
}

/**
 * Resolve both grapplers as one current-frame geometry unit.
 *
 * Pass 1 delegates choreography, grounding, ordinary contacts, constraints,
 * validation, and endpoint fidelity to the Iteration 14C resolver. Passes 2
 * and 3 reuse that resolver's priority/contact/IK pipeline for relational
 * targets. `correctSkeletonContacts()` resolves every semantic source and
 * target anchor from the working pair immediately before applying it, so the
 * target is the opponent's current geometry rather than a stored coordinate.
 *
 * Canonical 14C ordering determines primary ownership when constraints affect
 * both grapplers. The same order is used once more at reduced strength; there
 * is no reciprocal convergence loop and no root translation for relational
 * hand/foot targets.
 */
export function resolveGrapplerPairFrame({
  contactTargets = [],
  ...input
}: ResolveGrapplerPairFrameInput) {
  const ordinaryTargets = contactTargets.filter(
    (target) => !isRelationalTarget(target),
  )
  const relationalTargets = contactTargets.filter(isRelationalTarget)

  const base = resolveAnimationFrame({
    ...input,
    contactTargets: ordinaryTargets,
  })

  // The 14C endpoint bypass is authoritative. Do not re-enter relational
  // correction after either exact endpoint has been selected.
  if (
    (input.progress !== undefined && input.progress <= 0 && input.sourceSkeletons) ||
    (input.progress !== undefined && input.progress >= 1 && input.destinationSkeletons) ||
    relationalTargets.length === 0
  ) {
    return base
  }

  const primary = resolveAnimationFrame({
    skeletons: base,
    contactTargets: relationalTargets,
    contactOptions: input.contactOptions,
  })

  return resolveAnimationFrame({
    skeletons: primary,
    contactTargets: relationalTargets.map((target) => ({
      ...target,
      strength: target.strength * PAIR_FOLLOW_UP_STRENGTH,
    })),
    contactOptions: input.contactOptions,
  })
}
