import { StatusPill } from './StatusPill'
import type { GoalTreeNode } from '../lib/types'

type GoalTreeProps = {
  nodes: GoalTreeNode[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function GoalTree({ nodes, selectedId, onSelect }: GoalTreeProps) {
  return (
    <ul className="tree-root">
      {nodes.map((node) => (
        <GoalBranch
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}

type GoalBranchProps = {
  node: GoalTreeNode
  selectedId: string | null
  onSelect: (id: string) => void
}

function GoalBranch({ node, selectedId, onSelect }: GoalBranchProps) {
  return (
    <li className="tree-node">
      <button
        className={selectedId === node.id ? 'tree-node-button selected' : 'tree-node-button'}
        type="button"
        onClick={() => onSelect(node.id)}
      >
        <span className="tree-node-title">
          <strong>{node.title}</strong>
          <StatusPill label={node.status} />
        </span>
        <span className="muted">
          {node.type} · {node.category || 'Uncategorized'} · {node.progress_pct}% progress
        </span>
      </button>
      {node.children.length > 0 ? (
        <ul className="tree-branch">
          {node.children.map((child) => (
            <GoalBranch
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
