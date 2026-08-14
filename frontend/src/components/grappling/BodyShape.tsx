import type {
  DerivedExtremityGeometry,
  ExtremityAnatomy,
  GrapplerAnatomy,
  SegmentAnatomy,
} from '../../grappling/anatomy'
import {
  createTaperedSegmentGeometry,
  createTorsoGeometry,
  type GrapplerBodyPartName,
} from '../../grappling/bodyGeometry'
import type { GrapplerPose, SegmentPose } from '../../grappling/types'

interface SegmentShapeProps {
  name: GrapplerBodyPartName
  pose: SegmentPose
  anatomy: SegmentAnatomy
  head?: GrapplerPose['head']
  grapplerAnatomy?: GrapplerAnatomy
}

export function SegmentShape({
  name,
  pose,
  anatomy,
  head,
  grapplerAnatomy,
}: SegmentShapeProps) {
  const geometry =
    name === 'torso' && head && grapplerAnatomy
      ? createTorsoGeometry(pose, head, grapplerAnatomy)
      : createTaperedSegmentGeometry(
          pose.length,
          anatomy.width,
          anatomy.taper,
        )

  return (
    <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.rotation})`}>
      <path
        className={`grappler-rig__body-part grappler-rig__${name === 'torso' ? 'torso' : 'limb'}`}
        d={geometry.path}
        data-body-part={name}
      />
    </g>
  )
}

interface ExtremityShapeProps {
  name: 'leftHand' | 'rightHand' | 'leftFoot' | 'rightFoot'
  geometry: DerivedExtremityGeometry
  anatomy: ExtremityAnatomy
}

export function ExtremityShape({
  name,
  geometry,
  anatomy,
}: ExtremityShapeProps) {
  const shape = createTaperedSegmentGeometry(
    geometry.length,
    geometry.width,
    anatomy.taper,
  )

  return (
    <g
      transform={`translate(${geometry.x} ${geometry.y}) rotate(${geometry.rotation})`}
    >
      <path
        className={`grappler-rig__body-part grappler-rig__extremity grappler-rig__${name.endsWith('Hand') ? 'hand' : 'foot'}`}
        d={shape.path}
        data-body-part={name}
      />
    </g>
  )
}

export function HeadShape({
  pose,
  anatomy,
}: {
  pose: GrapplerPose['head']
  anatomy: GrapplerAnatomy['head']
}) {
  const faceMarkRadius = anatomy.radius * 0.22

  return (
    <g data-body-part="head">
      <circle
        className="grappler-rig__head"
        cx={pose.x}
        cy={pose.y}
        r={anatomy.radius}
      />
      <path
        className="grappler-rig__face-mark"
        d={`M ${pose.x - faceMarkRadius} ${pose.y + 3} Q ${pose.x} ${pose.y + 6} ${pose.x + faceMarkRadius} ${pose.y + 3}`}
      />
    </g>
  )
}
