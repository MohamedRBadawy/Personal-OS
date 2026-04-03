import type { GoalMapPayload } from '../lib/types'

type GoalMapProps = {
  payload: GoalMapPayload
  selectedId: string | null
  onSelect: (id: string) => void
}

const columns = [
  { key: 'goal', label: 'Goals' },
  { key: 'project', label: 'Projects' },
  { key: 'task', label: 'Tasks' },
  { key: 'support', label: 'Support' },
] as const

const cardWidth = 220
const cardHeight = 72
const columnGap = 64
const rowGap = 24
const leftPadding = 24
const topPadding = 56

function getColumnKey(type: string) {
  if (type === 'goal') {
    return 'goal'
  }
  if (type === 'project') {
    return 'project'
  }
  if (type === 'task' || type === 'sub_task') {
    return 'task'
  }
  return 'support'
}

function getNodeTone(status: string) {
  if (status === 'blocked') {
    return { fill: '#f9e4d2', stroke: '#b06729', text: '#7b4a12' }
  }
  if (status === 'done') {
    return { fill: '#dff0e5', stroke: '#3c7a55', text: '#245237' }
  }
  if (status === 'active') {
    return { fill: '#fce7de', stroke: '#d3643b', text: '#8b3517' }
  }
  return { fill: '#eef4f6', stroke: '#54727e', text: '#193743' }
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`
}

export function GoalMap({ payload, selectedId, onSelect }: GoalMapProps) {
  const grouped = columns.map((column) => ({
    ...column,
    nodes: payload.nodes.filter((node) => getColumnKey(node.type) === column.key),
  }))
  const maxCount = Math.max(...grouped.map((column) => column.nodes.length), 1)
  const width = leftPadding * 2 + columns.length * cardWidth + (columns.length - 1) * columnGap
  const height = topPadding + maxCount * (cardHeight + rowGap) + 12

  const positions = new Map<string, { x: number; y: number }>()
  grouped.forEach((column, columnIndex) => {
    column.nodes.forEach((node, nodeIndex) => {
      positions.set(node.id, {
        x: leftPadding + columnIndex * (cardWidth + columnGap),
        y: topPadding + nodeIndex * (cardHeight + rowGap),
      })
    })
  })

  return (
    <div className="goal-map-shell">
      <div className="goal-map-legend">
        <span className="status-pill active">Active</span>
        <span className="status-pill">Available</span>
        <span className="status-pill warning">Blocked</span>
        <span className="status-pill success">Done</span>
      </div>
      <div className="goal-map-frame">
        <svg className="goal-map" viewBox={`0 0 ${width} ${height}`} role="img">
          <title>Goal map showing hierarchy and dependency links</title>
          <defs>
            <marker
              id="goal-map-arrow"
              markerHeight="7"
              markerWidth="7"
              orient="auto"
              refX="6"
              refY="3.5"
            >
              <polygon fill="#5f6f76" points="0 0, 7 3.5, 0 7" />
            </marker>
            <marker
              id="goal-map-arrow-accent"
              markerHeight="7"
              markerWidth="7"
              orient="auto"
              refX="6"
              refY="3.5"
            >
              <polygon fill="#d3643b" points="0 0, 7 3.5, 0 7" />
            </marker>
          </defs>

          {grouped.map((column, columnIndex) => {
            const x = leftPadding + columnIndex * (cardWidth + columnGap)
            return (
              <text key={column.key} className="goal-map-label" x={x} y="24">
                {column.label}
              </text>
            )
          })}

          {payload.edges.map((edge) => {
            const source = positions.get(edge.source)
            const target = positions.get(edge.target)
            if (!source || !target) {
              return null
            }

            const x1 = source.x + cardWidth
            const y1 = source.y + cardHeight / 2
            const x2 = target.x
            const y2 = target.y + cardHeight / 2
            const midX = (x1 + x2) / 2

            return (
              <path
                key={edge.id}
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                fill="none"
                markerEnd={edge.kind === 'dependency' ? 'url(#goal-map-arrow-accent)' : 'url(#goal-map-arrow)'}
                stroke={edge.kind === 'dependency' ? '#d3643b' : '#5f6f76'}
                strokeDasharray={edge.kind === 'dependency' ? '6 4' : undefined}
                strokeWidth={edge.kind === 'dependency' ? 2.5 : 1.8}
              />
            )
          })}

          {payload.nodes.map((node) => {
            const position = positions.get(node.id)
            if (!position) {
              return null
            }

            const tone = getNodeTone(node.status)
            const isSelected = node.id === selectedId

            return (
              <g
                key={node.id}
                className="goal-map-node"
                role="button"
                tabIndex={0}
                onClick={() => onSelect(node.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(node.id)
                  }
                }}
              >
                <rect
                  fill={tone.fill}
                  height={cardHeight}
                  rx="18"
                  stroke={isSelected ? '#193743' : tone.stroke}
                  strokeWidth={isSelected ? 3 : 1.6}
                  width={cardWidth}
                  x={position.x}
                  y={position.y}
                />
                <text className="goal-map-code" fill={tone.text} x={position.x + 14} y={position.y + 20}>
                  {node.code || node.type}
                </text>
                <text className="goal-map-title" fill="#193743" x={position.x + 14} y={position.y + 40}>
                  {truncate(node.title, 28)}
                </text>
                <text className="goal-map-meta" fill="#5f6f76" x={position.x + 14} y={position.y + 60}>
                  {node.progress_pct}% • {node.child_count} child
                  {node.child_count === 1 ? '' : 'ren'}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
