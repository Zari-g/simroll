import type {
  GrapplerChildJointName,
  GrapplerSkeletonPose,
  LocalJointTransform,
} from './skeleton.ts'
import type {
  GrapplerId,
  GrapplerPose,
  GrapplerSegmentName,
} from './types'
import type {
  AnimationPlayerChoreography,
  AnimationRecipe,
  AnimationControlRequirement,
} from './animationRecipes/types.ts'
import { grapplerPoseToSkeleton, skeletonToGrapplerPose } from './kinematics.ts'
import type { ContactCorrectionTarget } from './contactCorrection.ts'
import type { MotionTimingGroup, TransitionContactContext } from './types.ts'
import {
  compileControlsToContacts,
  type ActiveVisualControl,
} from './controlTargets.ts'
import {
  composeAnimationSkeleton,
  resolveAnimationFrame,
} from './resolveAnimationFrame.ts'

export type GrapplerPosePair = Record<GrapplerId, GrapplerPose>

const segmentNames: readonly GrapplerSegmentName[] = [
  'torso',
  'leftUpperArm',
  'leftForearm',
  'rightUpperArm',
  'rightForearm',
  'leftThigh',
  'leftShin',
  'rightThigh',
  'rightShin',
]

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

function cloneGrapplerPose(pose: GrapplerPose): GrapplerPose {
  return {
    head: { ...pose.head },
    core: pose.core && {
      pelvis: { ...pose.core.pelvis },
      spine: { ...pose.core.spine },
      chest: { ...pose.core.chest },
    },
    segments: Object.fromEntries(
      segmentNames.map((segmentName) => [
        segmentName,
        { ...pose.segments[segmentName] },
      ]),
    ) as GrapplerPose['segments'],
  }
}

export function interpolateGrapplerPose(
  start: GrapplerPose,
  end: GrapplerPose,
  progress: number,
): GrapplerPose {
  if (progress <= 0) return cloneGrapplerPose(start)
  if (progress >= 1) return cloneGrapplerPose(end)

  const segments = Object.fromEntries(
      segmentNames.map((segmentName) => {
        const startSegment = start.segments[segmentName]
        const endSegment = end.segments[segmentName]
        return [
          segmentName,
          {
            x: lerpNumber(startSegment.x, endSegment.x, progress),
            y: lerpNumber(startSegment.y, endSegment.y, progress),
            rotation: interpolateAngle(
              startSegment.rotation,
              endSegment.rotation,
              progress,
            ),
            length: lerpNumber(
              startSegment.length,
              endSegment.length,
              progress,
            ),
          },
        ]
      }),
    ) as GrapplerPose['segments']
  const torsoRadians = (segments.torso.rotation * Math.PI) / 180

  return {
    head: {
      x: lerpNumber(start.head.x, end.head.x, progress),
      y: lerpNumber(start.head.y, end.head.y, progress),
    },
    core:
      start.core && end.core
        ? {
            pelvis: { x: segments.torso.x, y: segments.torso.y },
            spine: {
              x: lerpNumber(start.core.spine.x, end.core.spine.x, progress),
              y: lerpNumber(start.core.spine.y, end.core.spine.y, progress),
            },
            chest: {
              x: segments.torso.x + Math.cos(torsoRadians) * segments.torso.length,
              y: segments.torso.y + Math.sin(torsoRadians) * segments.torso.length,
            },
          }
        : undefined,
    segments,
  }
}

function interpolateSkeletonPose(
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

/** Offset a phase without changing its exact local endpoints. */
export function offsetPhaseProgress(progress: number, offset = 0) {
  const clampedProgress = Math.max(0, Math.min(1, progress))
  const clampedOffset = Math.max(-0.35, Math.min(0.35, offset))
  if (clampedProgress === 0 || clampedProgress === 1 || clampedOffset === 0) {
    return clampedProgress
  }
  return clampedOffset > 0
    ? Math.max(0, (clampedProgress - clampedOffset) / (1 - clampedOffset))
    : Math.min(1, clampedProgress / (1 + clampedOffset))
}

const jointTimingGroups: Readonly<Record<GrapplerChildJointName, MotionTimingGroup>> = {
  spine: 'torso', chest: 'torso', neck: 'head', head: 'head',
  leftShoulder: 'arms', leftElbow: 'arms', leftWrist: 'arms',
  rightShoulder: 'arms', rightElbow: 'arms', rightWrist: 'arms',
  leftHip: 'hips', leftKnee: 'hips', leftAnkle: 'hips',
  rightHip: 'hips', rightKnee: 'hips', rightAnkle: 'hips',
}

function interpolateTimedSkeletonPose(
  start: GrapplerSkeletonPose,
  end: GrapplerSkeletonPose,
  progress: number,
  timing: Readonly<Partial<Record<MotionTimingGroup, number>>> = {},
): GrapplerSkeletonPose {
  const groupProgress = (group: MotionTimingGroup) =>
    easeInOutCubic(offsetPhaseProgress(progress, timing[group]))
  const rootProgress = groupProgress('hips')
  return {
    root: {
      position: {
        x: lerpNumber(start.root.position.x, end.root.position.x, rootProgress),
        y: lerpNumber(start.root.position.y, end.root.position.y, rootProgress),
      },
      rotation: interpolateAngle(start.root.rotation, end.root.rotation, rootProgress),
    },
    joints: Object.fromEntries(
      Object.entries(start.joints).map(([name, transform]) => {
        const jointName = name as GrapplerChildJointName
        const target = end.joints[jointName]
        const jointProgress = groupProgress(jointTimingGroups[jointName])
        return [jointName, {
          x: lerpNumber(transform.x, target.x, jointProgress),
          y: lerpNumber(transform.y, target.y, jointProgress),
          rotation: interpolateAngle(transform.rotation, target.rotation, jointProgress),
        }]
      }),
    ) as Record<GrapplerChildJointName, LocalJointTransform>,
  }
}

function resolveChoreographedSkeleton(
  start: GrapplerSkeletonPose,
  end: GrapplerSkeletonPose,
  baseProgress: number,
  choreography?: AnimationPlayerChoreography,
): GrapplerSkeletonPose {
  const blended = interpolateSkeletonPose(start, end, baseProgress)
  return composeAnimationSkeleton(blended, choreography)
}

interface CompiledTransitionFrame {
  readonly progress: number
  readonly baseProgress: number
  readonly skeletons: Readonly<Record<GrapplerId, GrapplerSkeletonPose>>
}

const compiledTransitionCache = new WeakMap<
  AnimationRecipe,
  WeakMap<GrapplerPosePair, WeakMap<GrapplerPosePair, WeakMap<TransitionContactContext, readonly CompiledTransitionFrame[]>>>
>()

const emptyContactContext: TransitionContactContext = {
  startContacts: [],
  endContacts: [],
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function controlKey(control: ActiveVisualControl) {
  return `${control.controlId}:${control.controller}:${control.opponent}:${control.side ?? 'left'}`
}

function requirementMatches(
  requirement: AnimationControlRequirement,
  control: ActiveVisualControl,
) {
  return requirement.controlId === control.controlId &&
    (requirement.controller ?? 'playerA') === control.controller &&
    (requirement.opponent ?? 'playerB') === control.opponent &&
    (requirement.side ?? 'left') === (control.side ?? 'left')
}

function controlInfluence(
  control: ActiveVisualControl,
  requirement: AnimationControlRequirement | undefined,
  inSource: boolean,
  inDestination: boolean,
  progress: number,
) {
  const sourceStrength = clamp01(1 - progress / 0.72)
  const destinationStrength = clamp01((progress - 0.28) / 0.72)
  let influence = Math.max(
    inSource ? sourceStrength : 0,
    inDestination ? destinationStrength : 0,
  )
  if (requirement?.action === 'preserve') influence = 1
  if (requirement?.action === 'release') {
    const until = requirement.activeUntil ?? 0.72
    influence = until <= 0 ? 0 : clamp01(1 - progress / until)
  }
  if (requirement?.action === 'acquire') {
    const from = requirement.activeFrom ?? 0.28
    influence = from >= 1 ? 0 : clamp01((progress - from) / (1 - from))
  }
  if (!requirement?.action && requirement) {
    const from = requirement.activeFrom ?? 0
    const until = requirement.activeUntil ?? 1
    const fade = 0.12
    influence = Math.min(
      clamp01((progress - from + fade) / fade),
      clamp01((until - progress + fade) / fade),
    )
  }
  return influence * (requirement?.strength ?? control.strength ?? 1)
}

export function resolveTransitionContactTargets(
  recipe: AnimationRecipe,
  context: TransitionContactContext,
  baseProgress: number,
): readonly ContactCorrectionTarget[] {
  const sourceStrength = clamp01(1 - baseProgress / 0.72)
  const destinationStrength = clamp01((baseProgress - 0.28) / 0.72)
  const targets: ContactCorrectionTarget[] = [
    ...context.startContacts.map((contact) => ({ contact, strength: sourceStrength })),
    ...context.endContacts.map((contact) => ({ contact, strength: destinationStrength })),
  ]
  const sourceControls = context.startControls ?? []
  const destinationControls = context.endControls ?? []
  const controls = new Map<string, ActiveVisualControl>()
  for (const control of [...sourceControls, ...destinationControls]) {
    controls.set(controlKey(control), control)
  }
  for (const requirement of recipe.requirements?.controls ?? []) {
    const control: ActiveVisualControl = {
      controlId: requirement.controlId,
      controller: requirement.controller ?? 'playerA',
      opponent: requirement.opponent ?? 'playerB',
      side: requirement.side,
    }
    if (!controls.has(controlKey(control))) controls.set(controlKey(control), control)
  }
  for (const control of controls.values()) {
    const requirement = recipe.requirements?.controls?.find((entry) =>
      requirementMatches(entry, control),
    )
    const key = controlKey(control)
    const strength = controlInfluence(
      control,
      requirement,
      sourceControls.some((entry) => controlKey(entry) === key),
      destinationControls.some((entry) => controlKey(entry) === key),
      baseProgress,
    )
    for (const compiled of compileControlsToContacts([{ ...control, strength }])) {
      targets.push({
        contact: compiled.contact,
        strength: compiled.strength,
        relationalAnchor: compiled.relationalAnchor,
      })
    }
  }
  return targets
}

function compileTransitionFrames(
  recipe: AnimationRecipe,
  start: GrapplerPosePair,
  end: GrapplerPosePair,
): readonly CompiledTransitionFrame[] {
  const startSkeletons = {
    playerA: grapplerPoseToSkeleton(start.playerA),
    playerB: grapplerPoseToSkeleton(start.playerB),
  }
  const endSkeletons = {
    playerA: grapplerPoseToSkeleton(end.playerA),
    playerB: grapplerPoseToSkeleton(end.playerB),
  }

  return [
    { progress: 0, baseProgress: 0, skeletons: startSkeletons },
    ...recipe.phases
      .filter((phase) => phase.progress > 0 && phase.progress < 1)
      .map((phase) => {
        const baseProgress = phase.baseProgress ?? phase.progress
        const skeletons = {
          playerA: resolveChoreographedSkeleton(
            startSkeletons.playerA,
            endSkeletons.playerA,
            baseProgress,
            phase.playerA,
          ),
          playerB: resolveChoreographedSkeleton(
            startSkeletons.playerB,
            endSkeletons.playerB,
            baseProgress,
            phase.playerB,
          ),
        }
        return {
          progress: phase.progress,
          baseProgress,
          skeletons,
        }
      }),
    { progress: 1, baseProgress: 1, skeletons: endSkeletons },
  ].sort((left, right) => left.progress - right.progress)
}

function getCompiledTransitionFrames(
  recipe: AnimationRecipe,
  start: GrapplerPosePair,
  end: GrapplerPosePair,
  contactContext: TransitionContactContext = emptyContactContext,
) {
  let byStart = compiledTransitionCache.get(recipe)
  if (!byStart) {
    byStart = new WeakMap()
    compiledTransitionCache.set(recipe, byStart)
  }
  let byEnd = byStart.get(start)
  if (!byEnd) {
    byEnd = new WeakMap()
    byStart.set(start, byEnd)
  }
  let byContacts = byEnd.get(end)
  if (!byContacts) {
    byContacts = new WeakMap()
    byEnd.set(end, byContacts)
  }
  let frames = byContacts.get(contactContext)
  if (!frames) {
    frames = compileTransitionFrames(recipe, start, end)
    byContacts.set(contactContext, frames)
  }
  return frames
}

/** Authoring/test access to the constrained local skeleton phases. */
export function resolveTransitionSkeletonKeyframes(
  recipe: AnimationRecipe,
  start: GrapplerPosePair,
  end: GrapplerPosePair,
  contactContext: TransitionContactContext = emptyContactContext,
) {
  const frames = getCompiledTransitionFrames(recipe, start, end, contactContext)
  const sourceSkeletons = frames[0].skeletons
  const destinationSkeletons = frames[frames.length - 1].skeletons
  return frames
    .filter((frame) => frame.progress > 0 && frame.progress < 1)
    .map((frame) => ({
      progress: frame.progress,
      skeletons: resolveAnimationFrame({
        skeletons: frame.skeletons,
        progress: frame.progress,
        sourceSkeletons,
        destinationSkeletons,
        contactTargets: resolveTransitionContactTargets(
          recipe,
          contactContext,
          frame.baseProgress,
        ),
      }),
    }))
}

export function resolveTransitionPoses(
  recipe: AnimationRecipe | null,
  start: GrapplerPosePair,
  end: GrapplerPosePair,
  progress: number,
  contactContext: TransitionContactContext = emptyContactContext,
): GrapplerPosePair {
  if (progress <= 0) return {
    playerA: cloneGrapplerPose(start.playerA),
    playerB: cloneGrapplerPose(start.playerB),
  }
  if (progress >= 1) return {
    playerA: cloneGrapplerPose(end.playerA),
    playerB: cloneGrapplerPose(end.playerB),
  }

  if (!recipe) return {
    playerA: interpolateGrapplerPose(start.playerA, end.playerA, easeInOutCubic(progress)),
    playerB: interpolateGrapplerPose(start.playerB, end.playerB, easeInOutCubic(progress)),
  }

  const frames = getCompiledTransitionFrames(recipe, start, end, contactContext)

  const rightIndex = frames.findIndex((frame) => frame.progress >= progress)
  const leftFrame = frames[rightIndex - 1]
  const rightFrame = frames[rightIndex]
  const localProgress = (progress - leftFrame.progress) /
    (rightFrame.progress - leftFrame.progress)

  const playerASkeleton = interpolateTimedSkeletonPose(
    leftFrame.skeletons.playerA,
    rightFrame.skeletons.playerA,
    localProgress,
    recipe.timing?.playerA,
  )
  const playerBSkeleton = interpolateTimedSkeletonPose(
    leftFrame.skeletons.playerB,
    rightFrame.skeletons.playerB,
    localProgress,
    recipe.timing?.playerB,
  )

  const baseProgress = lerpNumber(
    leftFrame.baseProgress,
    rightFrame.baseProgress,
    localProgress,
  )
  const skeletons = resolveAnimationFrame({
    skeletons: {
      playerA: playerASkeleton,
      playerB: playerBSkeleton,
    },
    progress,
    sourceSkeletons: frames[0].skeletons,
    destinationSkeletons: frames[frames.length - 1].skeletons,
    contactTargets: resolveTransitionContactTargets(
      recipe,
      contactContext,
      baseProgress,
    ),
  })

  return {
    playerA: skeletonToGrapplerPose(skeletons.playerA),
    playerB: skeletonToGrapplerPose(skeletons.playerB),
  }
}
