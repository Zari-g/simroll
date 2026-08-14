import type { GrapplerAnatomy } from '../../grappling/anatomy'
import { resolveContactPoint } from '../../grappling/contactGeometry'
import type {
  GrapplerId,
  GrapplerPose,
  GripContact,
  PositionContact,
} from '../../grappling/types'

interface GrapplingContactsProps {
  contacts: readonly (PositionContact | GripContact)[]
  poses: Readonly<Record<GrapplerId, GrapplerPose>>
  anatomies: Readonly<Record<GrapplerId, GrapplerAnatomy>>
}

function PositionContactMark({
  contact,
  poses,
  anatomies,
}: Omit<GrapplingContactsProps, 'contacts'> & {
  contact: PositionContact
}) {
  const geometry = resolveContactPoint(contact, poses, anatomies)
  const isPressure = contact.type === 'pressure'

  return (
    <g
      className={`position-contact position-contact--${contact.type}`}
      data-contact-id={contact.id}
      aria-hidden="true"
    >
      <line
        className="position-contact__bridge"
        x1={geometry.source.x}
        y1={geometry.source.y}
        x2={geometry.target.x}
        y2={geometry.target.y}
      />
      <ellipse
        className="position-contact__mark"
        cx={geometry.point.x}
        cy={geometry.point.y}
        rx={isPressure ? 14 : 7}
        ry={isPressure ? 6 : 4}
        transform={`rotate(${geometry.angle} ${geometry.point.x} ${geometry.point.y})`}
      />
    </g>
  )
}

function GripContactMark({
  contact,
  poses,
  anatomies,
}: Omit<GrapplingContactsProps, 'contacts'> & {
  contact: GripContact
}) {
  const geometry = resolveContactPoint(contact, poses, anatomies)

  return (
    <g
      className={`grip-contact grip-contact--${contact.source.grapplerId}`}
      data-contact-id={contact.id}
      aria-hidden="true"
    >
      <line
        className="grip-contact__link"
        x1={geometry.source.x}
        y1={geometry.source.y}
        x2={geometry.target.x}
        y2={geometry.target.y}
      />
      <circle
        className="grip-contact__ring"
        cx={geometry.target.x}
        cy={geometry.target.y}
        r="8"
      />
      <circle
        className="grip-contact__point"
        cx={geometry.source.x}
        cy={geometry.source.y}
        r="3.5"
      />
    </g>
  )
}

export function GrapplingContacts({
  contacts,
  poses,
  anatomies,
}: GrapplingContactsProps) {
  return contacts.map((contact) =>
    contact.type === 'grip' ? (
      <GripContactMark
        contact={contact}
        poses={poses}
        anatomies={anatomies}
        key={contact.id}
      />
    ) : (
      <PositionContactMark
        contact={contact}
        poses={poses}
        anatomies={anatomies}
        key={contact.id}
      />
    ),
  )
}
