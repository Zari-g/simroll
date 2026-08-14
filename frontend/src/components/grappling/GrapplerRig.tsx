import {
  resolveSegmentAnatomy,
  type GrapplerAnatomy,
} from '../../grappling/anatomy'
import type {
  GrapplerId,
  GrapplerPose,
  GrapplerSegmentName,
  SegmentPose,
} from '../../grappling/types'

interface GrapplerRigProps {
  grapplerId: GrapplerId
  pose: GrapplerPose
  anatomy: GrapplerAnatomy
}

const segmentOrder: readonly GrapplerSegmentName[] = [
  'leftThigh',
  'leftShin',
  'rightThigh',
  'rightShin',
  'torso',
  'leftUpperArm',
  'leftForearm',
  'rightUpperArm',
  'rightForearm',
]

const limbSegments = new Set<GrapplerSegmentName>([
  'leftUpperArm',
  'leftForearm',
  'rightUpperArm',
  'rightForearm',
  'leftThigh',
  'leftShin',
  'rightThigh',
  'rightShin',
])

function RigSegment({
  name,
  pose,
  anatomy,
}: {
  name: GrapplerSegmentName
  pose: SegmentPose
  anatomy: GrapplerAnatomy
}) {
  const isTorso = name === 'torso'
  const segmentAnatomy = resolveSegmentAnatomy(anatomy, name)

  return (
    <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.rotation})`}>
      <line
        className={isTorso ? 'grappler-rig__torso' : 'grappler-rig__limb'}
        x1="0"
        y1="0"
        x2={pose.length}
        y2="0"
        strokeWidth={segmentAnatomy.width}
      />
      {limbSegments.has(name) && (
        <circle
          className="grappler-rig__joint"
          cx={pose.length}
          cy="0"
          r={segmentAnatomy.endpointRadius}
        />
      )}
    </g>
  )
}

export function GrapplerRig({ grapplerId, pose, anatomy }: GrapplerRigProps) {
  return (
    <g className={`grappler-rig grappler-rig--${grapplerId}`} aria-hidden="true">
      {segmentOrder.map((segmentName) => (
        <RigSegment
          key={segmentName}
          name={segmentName}
          pose={pose.segments[segmentName]}
          anatomy={anatomy}
        />
      ))}
      <circle
        className="grappler-rig__head"
        cx={pose.head.x}
        cy={pose.head.y}
        r={anatomy.head.radius}
      />
      <path
        className="grappler-rig__face-mark"
        d={`M ${pose.head.x - 10} ${pose.head.y} L ${pose.head.x + 10} ${pose.head.y}`}
      />
    </g>
  )
}
