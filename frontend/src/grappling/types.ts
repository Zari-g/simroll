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

export type GrapplerBodyPartName =
  | GrapplerSegmentName
  | 'leftHand'
  | 'rightHand'
  | 'leftFoot'
  | 'rightFoot'
  | 'head'

export interface PointPose {
  x: number
  y: number
}

export interface SegmentPose extends PointPose {
  rotation: number
  length: number
}

/** Renderer-facing points derived from the authoritative articulated core. */
export interface GrapplerCorePose {
  readonly pelvis: PointPose
  readonly spine: PointPose
  readonly chest: PointPose
}

export interface GrapplerPose {
  head: PointPose
  core?: GrapplerCorePose
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
  contacts?: readonly PositionContact[]
  occlusion?: PositionOcclusionRules
}

export type SegmentPoseOverrides = Partial<
  Record<GrapplerSegmentName, Partial<SegmentPose>>
>

export type ContactAnchorName = 'start' | 'midpoint' | 'end' | 'center'

export interface ContactAnchor {
  grapplerId: GrapplerId
  bodyPart: GrapplerBodyPartName
  anchor?: ContactAnchorName
  offset?: PointPose
}

interface GrapplingContactBase {
  id: string
  source: ContactAnchor
  target: ContactAnchor
}

export interface PositionContact extends GrapplingContactBase {
  type: 'control' | 'pressure' | 'hook'
}

export interface GripContact extends GrapplingContactBase {
  type: 'grip'
}

export interface BodyPartReference {
  grapplerId: GrapplerId
  bodyPart: GrapplerBodyPartName
}

export interface BodyPartOcclusionOverride {
  bodyPart: BodyPartReference
  relativeTo: BodyPartReference
  placement: 'before' | 'after'
}

export interface PositionOcclusionRules {
  overrides: readonly BodyPartOcclusionOverride[]
}

export interface GripPositionVisualModifier {
  positionId: string
  appliesTo: GrapplerId
  priority: number
  segmentOverrides: SegmentPoseOverrides
  contact?: GripContact
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
