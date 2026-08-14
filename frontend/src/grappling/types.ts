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
