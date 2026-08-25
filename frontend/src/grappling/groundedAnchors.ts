import { resolveSkeletonPose } from './kinematics.ts'
import {
  grapplerJointNames,
  type GrapplerChildJointName,
  type GrapplerJointName,
  type GrapplerSkeletonPose,
  type LocalJointTransform,
} from './skeleton.ts'

/**
 * A mat-relative vertical target for one joint of one authored pose. The mat
 * is treated as a horizontal plane, so grounding only pins world-space Y;
 * the joint's horizontal placement stays exactly as authored.
 */
export interface GroundedAnchor {
  readonly baselineY: number
  /** Skip correction when the joint is already this close to the baseline. */
  readonly tolerance?: number
}

/**
 * Declares which joints of one pose should stay pinned to a mat baseline.
 * The skeleton has no separate finger/toe joints, so a "hand" or "foot"
 * anchor targets the terminal wrist or ankle joint.
 */
export type GroundedAnchorSet = Readonly<
  Partial<Record<GrapplerJointName, GroundedAnchor>>
>

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
    ) as Record<GrapplerChildJointName, LocalJointTransform>,
  }
}

function translateRootY(
  skeleton: GrapplerSkeletonPose,
  deltaY: number,
): GrapplerSkeletonPose {
  const clone = cloneSkeleton(skeleton)
  return {
    ...clone,
    root: {
      position: { x: clone.root.position.x, y: clone.root.position.y + deltaY },
      rotation: clone.root.rotation,
    },
  }
}

function groundJoint(
  skeleton: GrapplerSkeletonPose,
  joint: GrapplerJointName,
  anchor: GroundedAnchor,
): GrapplerSkeletonPose {
  const currentY = resolveSkeletonPose(skeleton).joints[joint].y
  if (!Number.isFinite(currentY) || !Number.isFinite(anchor.baselineY)) {
    return skeleton
  }

  const deltaY = anchor.baselineY - currentY
  const tolerance = Math.max(0, anchor.tolerance ?? 0)
  if (Math.abs(deltaY) <= tolerance) {
    return skeleton
  }

  return translateRootY(skeleton, deltaY)
}

/**
 * Pin every declared joint's world Y to its mat baseline by translating the
 * whole skeleton vertically, one declared anchor at a time in canonical
 * joint order (`grapplerJointNames`) so the result never depends on how the
 * caller wrote the declaration object. Local rotations and bone lengths are
 * never touched, so a valid input pose stays inside the existing joint
 * constraint profile.
 *
 * This is deliberately not a limb solver: it is a bounded, deterministic
 * root-space translation, in the same spirit as the existing contact and
 * motion-primitive root shifts. Declaring two anchors whose baselines
 * cannot be satisfied by one shared vertical translation resolves
 * sequentially, and only the last-applied anchor (by canonical joint order)
 * lands exactly on its baseline. A pose with no declared anchors is
 * returned unchanged, so existing authored poses are unaffected until they
 * opt in.
 */
export function groundSkeletonPose(
  skeleton: GrapplerSkeletonPose,
  anchors: GroundedAnchorSet = {},
): GrapplerSkeletonPose {
  return grapplerJointNames.reduce<GrapplerSkeletonPose>((pose, joint) => {
    const anchor = anchors[joint]
    return anchor ? groundJoint(pose, joint, anchor) : pose
  }, skeleton)
}
