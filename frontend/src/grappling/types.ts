export type GrapplerId = 'playerA' | 'playerB'

export type GrapplerSegmentName =
  | 'torso'
  | 'leftUpperArm'
  | 'leftForearm'
  | 'rightUpperArm'
  | 'rightForearm'
  | 'leftThigh'
  | 'leftShin'
  | 'rightThigh'
  | 'rightShin'

export interface PointPose {
  x: number
  y: number
}

export interface SegmentPose extends PointPose {
  rotation: number
  length: number
}

export interface GrapplerPose {
  head: PointPose & { radius?: number }
  segments: Record<GrapplerSegmentName, SegmentPose>
}

export interface GrapplingPositionVisualDefinition {
  positionId: string
  label: string
  description: string
  playerAPose: GrapplerPose
  playerBPose: GrapplerPose
  playerARole: string
  playerBRole: string
  playerOrder: readonly GrapplerId[]
}

export type SegmentPoseOverrides = Partial<
  Record<GrapplerSegmentName, Partial<SegmentPose>>
>

export interface GripContactIndicator extends PointPose {
  grapplerId: GrapplerId
}

export interface GripPositionVisualModifier {
  positionId: string
  appliesTo: GrapplerId
  priority: number
  segmentOverrides: SegmentPoseOverrides
  contactIndicator?: GripContactIndicator
}

export interface GripVisualDefinition {
  gripId: string
  positionModifiers: readonly GripPositionVisualModifier[]
}

export interface GrapplerPoseOverride {
  head?: Partial<GrapplerPose['head']>
  segments?: SegmentPoseOverrides
}

export interface TransitionVisualKeyframe {
  progress: number
  playerA?: GrapplerPoseOverride
  playerB?: GrapplerPoseOverride
}

export interface TransitionVisualDefinition {
  transitionId: string
  durationMs: number
  keyframes: readonly TransitionVisualKeyframe[]
}
