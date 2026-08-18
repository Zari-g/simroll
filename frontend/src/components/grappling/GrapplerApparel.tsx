import type {
  GrapplerAnatomy,
  SegmentAnatomy,
} from '../../grappling/anatomy'
import type { GrapplerAppearance } from '../../grappling/appearance'
import {
  createTaperedSegmentGeometry,
  createTorsoGeometry,
  type TorsoCrossSection,
  type TorsoGeometry,
} from '../../grappling/bodyGeometry'
import type {
  GrapplerCorePose,
  GrapplerPose,
  GrapplerSegmentName,
  SegmentPose,
} from '../../grappling/types'

interface GrapplerApparelProps {
  appearance: GrapplerAppearance
  name: GrapplerSegmentName
  pose: SegmentPose
  anatomy: SegmentAnatomy
  head?: GrapplerPose['head']
  core?: GrapplerCorePose
  grapplerAnatomy?: GrapplerAnatomy
}

function formatSvgNumber(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function sectionPoint(
  section: TorsoCrossSection,
  edge: 'left' | 'right',
  scale: number,
) {
  return {
    x: section.center.x + (section[edge].x - section.center.x) * scale,
    y: section.center.y + (section[edge].y - section.center.y) * scale,
  }
}

function svgPoint(point: { x: number; y: number }) {
  return `${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`
}

function GiTorsoDetails({
  geometry,
  appearance,
}: {
  geometry: TorsoGeometry
  appearance: GrapplerAppearance
}) {
  const leftCollar = sectionPoint(geometry.shoulders, 'left', 0.5)
  const rightCollar = sectionPoint(geometry.shoulders, 'right', 0.5)
  const leftWaist = sectionPoint(geometry.waist, 'left', 0.9)
  const rightWaist = sectionPoint(geometry.waist, 'right', 0.9)

  return (
    <>
      {appearance.hasLapels && (
        <g className="grappler-apparel__lapels">
          <path
            className="grappler-apparel__left-lapel"
            d={`M ${svgPoint(sectionPoint(geometry.shoulders, 'left', 0.48))} L ${svgPoint(geometry.midsection.center)} L ${svgPoint(sectionPoint(geometry.waist, 'left', 0.24))}`}
          />
          <path
            className="grappler-apparel__right-lapel"
            d={`M ${svgPoint(sectionPoint(geometry.shoulders, 'right', 0.48))} L ${svgPoint(geometry.midsection.center)} L ${svgPoint(sectionPoint(geometry.waist, 'right', 0.24))}`}
          />
          <path
            className="grappler-apparel__collar"
            d={`M ${svgPoint(leftCollar)} Q ${svgPoint(geometry.shoulders.center)} ${svgPoint(rightCollar)}`}
          />
        </g>
      )}
      {appearance.hasBelt && (
        <g className="grappler-apparel__belt">
          <path
            className="grappler-apparel__belt-band"
            d={`M ${svgPoint(leftWaist)} L ${svgPoint(rightWaist)}`}
          />
          <circle
            className="grappler-apparel__belt-knot"
            cx={geometry.waist.center.x}
            cy={geometry.waist.center.y}
            r="5"
          />
        </g>
      )}
    </>
  )
}

function GiApparel({
  appearance,
  name,
  pose,
  anatomy,
  head,
  core,
  grapplerAnatomy,
}: GrapplerApparelProps) {
  const isTop = appearance.topSegments.includes(name)
  const isBottom = appearance.bottomSegments.includes(name)

  if (!isTop && !isBottom) {
    return null
  }

  const geometry =
    name === 'torso' && head && grapplerAnatomy
      ? createTorsoGeometry(pose, head, grapplerAnatomy, core)
      : createTaperedSegmentGeometry(pose.length, anatomy.width, anatomy.taper)

  return (
    <g
      className={`grappler-apparel__segment grappler-apparel__segment--${isTop ? 'gi-top' : 'gi-pants'}`}
      transform={`translate(${pose.x} ${pose.y}) rotate(${pose.rotation})`}
      data-apparel-part={name}
    >
      <path className="grappler-apparel__garment" d={geometry.path} />
      {name === 'torso' && head && grapplerAnatomy && (
        <GiTorsoDetails
          geometry={geometry as TorsoGeometry}
          appearance={appearance}
        />
      )}
      {(name === 'leftForearm' || name === 'rightForearm') && (
        <path
          className="grappler-apparel__cuff"
          d={`M ${formatSvgNumber(pose.length * 0.88)} -${formatSvgNumber(geometry.endWidth * 0.48)} L ${formatSvgNumber(pose.length * 0.88)} ${formatSvgNumber(geometry.endWidth * 0.48)}`}
        />
      )}
      {(name === 'leftShin' || name === 'rightShin') && (
        <path
          className="grappler-apparel__cuff"
          d={`M ${formatSvgNumber(pose.length * 0.9)} -${formatSvgNumber(geometry.endWidth * 0.48)} L ${formatSvgNumber(pose.length * 0.9)} ${formatSvgNumber(geometry.endWidth * 0.48)}`}
        />
      )}
    </g>
  )
}

function NoGiApparel({
  appearance,
  name,
  pose,
  anatomy,
  head,
  core,
  grapplerAnatomy,
}: GrapplerApparelProps) {
  const isTop = appearance.topSegments.includes(name)
  const isBottom = appearance.bottomSegments.includes(name)

  if (!isTop && !isBottom) {
    return null
  }

  const apparelLength = isBottom ? pose.length * 0.62 : pose.length
  const geometry =
    name === 'torso' && head && grapplerAnatomy
      ? createTorsoGeometry(pose, head, grapplerAnatomy, core)
      : createTaperedSegmentGeometry(
          apparelLength,
          anatomy.width,
          anatomy.taper,
        )

  return (
    <g
      className={`grappler-apparel__segment grappler-apparel__segment--${isTop ? 'rashguard' : 'shorts'}`}
      transform={`translate(${pose.x} ${pose.y}) rotate(${pose.rotation})`}
      data-apparel-part={name}
    >
      <path className="grappler-apparel__garment" d={geometry.path} />
      {name === 'torso' && (
        <path
          className="grappler-apparel__rashguard-panel"
          d={(geometry as TorsoGeometry).centerlinePath}
        />
      )}
      {isBottom && (
        <path
          className="grappler-apparel__shorts-cuff"
          d={`M ${formatSvgNumber(apparelLength * 0.94)} -${formatSvgNumber(geometry.endWidth * 0.48)} L ${formatSvgNumber(apparelLength * 0.94)} ${formatSvgNumber(geometry.endWidth * 0.48)}`}
        />
      )}
    </g>
  )
}

export function GrapplerApparel(props: GrapplerApparelProps) {
  return props.appearance.mode === 'gi' ? (
    <GiApparel {...props} />
  ) : (
    <NoGiApparel {...props} />
  )
}
