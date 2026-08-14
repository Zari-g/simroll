import type {
  GrapplerAnatomy,
  SegmentAnatomy,
} from '../../grappling/anatomy'
import type { GrapplerAppearance } from '../../grappling/appearance'
import {
  createTaperedSegmentGeometry,
  createTorsoGeometry,
  torsoShouldersAreAtStart,
} from '../../grappling/bodyGeometry'
import type {
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
  grapplerAnatomy?: GrapplerAnatomy
}

function formatSvgNumber(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function GiTorsoDetails({
  pose,
  head,
  anatomy,
  appearance,
}: {
  pose: SegmentPose
  head: GrapplerPose['head']
  anatomy: GrapplerAnatomy
  appearance: GrapplerAppearance
}) {
  const shouldersAtStart = torsoShouldersAreAtStart(pose, head)
  const shoulderX = shouldersAtStart ? 0 : pose.length
  const waistX = shouldersAtStart ? pose.length : 0
  const direction = shouldersAtStart ? 1 : -1
  const chestX = shoulderX + direction * pose.length * 0.46
  const beltX = waistX - direction * pose.length * 0.18
  const shoulderRadius = anatomy.torso.width / 2
  const waistRadius = (anatomy.torso.width * anatomy.torso.taper) / 2

  return (
    <>
      {appearance.hasLapels && (
        <g className="grappler-apparel__lapels">
          <path
            className="grappler-apparel__left-lapel"
            d={`M ${shoulderX} -${formatSvgNumber(shoulderRadius * 0.48)} L ${formatSvgNumber(chestX)} 0 L ${formatSvgNumber(beltX)} -${formatSvgNumber(waistRadius * 0.24)}`}
          />
          <path
            className="grappler-apparel__right-lapel"
            d={`M ${shoulderX} ${formatSvgNumber(shoulderRadius * 0.48)} L ${formatSvgNumber(chestX)} 0 L ${formatSvgNumber(beltX)} ${formatSvgNumber(waistRadius * 0.24)}`}
          />
          <path
            className="grappler-apparel__collar"
            d={`M ${shoulderX} -${formatSvgNumber(shoulderRadius * 0.5)} Q ${formatSvgNumber(shoulderX + direction * shoulderRadius * 0.28)} 0 ${shoulderX} ${formatSvgNumber(shoulderRadius * 0.5)}`}
          />
        </g>
      )}
      {appearance.hasBelt && (
        <g className="grappler-apparel__belt">
          <path
            className="grappler-apparel__belt-band"
            d={`M ${formatSvgNumber(beltX)} -${formatSvgNumber(waistRadius * 0.9)} L ${formatSvgNumber(beltX)} ${formatSvgNumber(waistRadius * 0.9)}`}
          />
          <circle
            className="grappler-apparel__belt-knot"
            cx={beltX}
            cy="0"
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
  grapplerAnatomy,
}: GrapplerApparelProps) {
  const isTop = appearance.topSegments.includes(name)
  const isBottom = appearance.bottomSegments.includes(name)

  if (!isTop && !isBottom) {
    return null
  }

  const geometry =
    name === 'torso' && head && grapplerAnatomy
      ? createTorsoGeometry(pose, head, grapplerAnatomy)
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
          pose={pose}
          head={head}
          anatomy={grapplerAnatomy}
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
      ? createTorsoGeometry(pose, head, grapplerAnatomy)
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
          d={`M ${formatSvgNumber(pose.length * 0.12)} 0 L ${formatSvgNumber(pose.length * 0.88)} 0`}
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
