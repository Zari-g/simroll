import type { GrapplerChildJointName, GrapplerSkeletonPose, LocalJointTransform } from './skeleton.ts'

export function lerpNumber(start: number, end: number, progress: number) {
  return start + (end - start) * progress
}

export function interpolateAngle(
  start: number,
  end: number,
  progress: number,
) {
  if (progress <= 0) return start
  if (progress >= 1) return end

  const delta = ((end - start + 540) % 360) - 180
  return start + delta * progress
}

export function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2
}

export function interpolateSkeletonPose(
  start: GrapplerSkeletonPose,
  end: GrapplerSkeletonPose,
  progress: number,
): GrapplerSkeletonPose {
  return {
    root: {
      position: {
        x: lerpNumber(start.root.position.x, end.root.position.x, progress),
        y: lerpNumber(start.root.position.y, end.root.position.y, progress),
      },
      rotation: interpolateAngle(start.root.rotation, end.root.rotation, progress),
    },
    joints: Object.fromEntries(
      Object.entries(start.joints).map(([name, transform]) => {
        const jointName = name as GrapplerChildJointName
        const target = end.joints[jointName]
        return [
          jointName,
          {
            x: lerpNumber(transform.x, target.x, progress),
            y: lerpNumber(transform.y, target.y, progress),
            rotation: interpolateAngle(transform.rotation, target.rotation, progress),
          },
        ]
      }),
    ) as Record<GrapplerChildJointName, LocalJointTransform>,
  }
}

