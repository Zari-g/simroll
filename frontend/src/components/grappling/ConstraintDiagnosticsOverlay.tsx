import type { ConstraintDiagnosticSnapshot } from '../../grappling/constraintDiagnostics'

interface ConstraintDiagnosticsOverlayProps {
  diagnostics: ConstraintDiagnosticSnapshot
}

const shortAnchor = (anchor: string | undefined) =>
  anchor?.replaceAll('-', ' ') ?? 'contact'

export function ConstraintDiagnosticsOverlay({
  diagnostics,
}: ConstraintDiagnosticsOverlayProps) {
  return (
    <g className="constraint-diagnostics" aria-label="Constraint diagnostics">
      {diagnostics.grounding.map((ground) => (
        <g key={`ground-${ground.grapplerId}-${ground.joint}`}>
          <line
            className="constraint-diagnostics__baseline"
            x1="40"
            x2="960"
            y1={ground.baselineY}
            y2={ground.baselineY}
          />
          <line
            className="constraint-diagnostics__ground-link"
            x1={ground.anchor.x}
            x2={ground.anchor.x}
            y1={ground.anchor.y}
            y2={ground.baselineY}
          />
          <circle className="constraint-diagnostics__ground-anchor" cx={ground.anchor.x} cy={ground.anchor.y} r="7" />
        </g>
      ))}

      {diagnostics.bones.map((bone) => (
        <line
          key={`${bone.grapplerId}-${bone.segment}`}
          className={`constraint-diagnostics__bone constraint-diagnostics__bone--${bone.grapplerId}`}
          x1={bone.start.x}
          y1={bone.start.y}
          x2={bone.end.x}
          y2={bone.end.y}
        />
      ))}
      {diagnostics.joints.map((joint) => (
        <circle
          key={`${joint.grapplerId}-${joint.joint}`}
          className={`constraint-diagnostics__joint constraint-diagnostics__joint--${joint.grapplerId}`}
          cx={joint.x}
          cy={joint.y}
          r="4.5"
        >
          <title>{`${joint.grapplerId === 'playerA' ? 'Player A' : 'Player B'} ${joint.joint}`}</title>
        </circle>
      ))}

      {diagnostics.constraints.map((constraint, index) => {
        const labelX = (constraint.source.x + constraint.target.x) / 2
        const labelY = (constraint.source.y + constraint.target.y) / 2 - 8 - index * 2
        return (
          <g key={constraint.id} className={`constraint-diagnostics__constraint constraint-diagnostics__constraint--${constraint.priority}`}>
            <line x1={constraint.source.x} y1={constraint.source.y} x2={constraint.target.x} y2={constraint.target.y} />
            <circle className="constraint-diagnostics__source" cx={constraint.source.x} cy={constraint.source.y} r="6" />
            <path className="constraint-diagnostics__target" d={`M ${constraint.target.x - 6} ${constraint.target.y} h 12 M ${constraint.target.x} ${constraint.target.y - 6} v 12`} />
            <text x={labelX} y={labelY}>
              {`${shortAnchor(constraint.relationalAnchor)} · ${constraint.error.toFixed(1)} px · ${constraint.priority}`}
            </text>
          </g>
        )
      })}
    </g>
  )
}
