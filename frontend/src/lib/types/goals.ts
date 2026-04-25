export type GoalNodeType = 'goal' | 'project' | 'task' | 'sub_task' | 'idea' | 'burden'
export type GoalNodeStatus = 'active' | 'available' | 'blocked' | 'done'
export type GoalNodeManualPriority = 'high' | 'medium' | 'low' | null

export type GoalNode = {
  id: string
  code: string
  title: string
  type: GoalNodeType
  category: string | null
  status: GoalNodeStatus
  parent: string | null
  deps: string[]
  notes: string
  due_date?: string | null
  manual_priority?: GoalNodeManualPriority
  completed_at: string | null
  progress_pct: number
  parent_title?: string | null
  dependent_count?: number
  blocked_by_titles?: string[]
  recommended_tool?: string
  tool_reasoning?: string
}

export type GoalTreeNode = GoalNode & {
  children: GoalTreeNode[]
}

export type GoalAttachmentSuggestion = {
  key: string
  label: string
  reason: string
}

export type GoalAttachmentProfile = {
  id: string
  node: string
  recommended_layers: string[]
  habits: string[]
  marketing_actions: string[]
  process_notes: string
  tools: string[]
  learning_path: string[]
  supporting_people: string[]
  attachment_suggestions: GoalAttachmentSuggestion[]
  created_at: string
  updated_at: string
}

export type GoalAttachmentProfilePayload = {
  node: string
  recommended_layers: string[]
  habits: string[]
  marketing_actions: string[]
  process_notes: string
  tools: string[]
  learning_path: string[]
  supporting_people: string[]
}

export type GoalContext = {
  node: GoalNode
  ancestors: GoalNode[]
  dependents: GoalNode[]
  progress_pct: number
  attachment_profile?: GoalAttachmentProfile | null
  attachment_suggestions?: GoalAttachmentSuggestion[]
}

export type GoalNodeUpdatePayload = Partial<
  Pick<GoalNode, 'status' | 'notes' | 'parent' | 'due_date' | 'manual_priority'>
> & {
  title?: string
  deps?: string[]
}

export type GoalNodeCreatePayload = {
  title: string
  type: GoalNodeType
  category?: string | null
  status?: GoalNodeStatus
  parent?: string | null
  notes?: string
  code?: string
}

export type GoalMapNode = {
  id: string
  code: string
  title: string
  type: GoalNodeType
  category: string | null
  status: GoalNodeStatus
  parent: string | null
  progress_pct: number
  child_count: number
  blocked_by: string[]
  due_date?: string | null
  manual_priority?: GoalNodeManualPriority
  recommended_tool?: string
  tool_reasoning?: string
}

export type GoalMapEdge = {
  id: string
  source: string
  target: string
  kind: 'hierarchy' | 'dependency'
}

export type GoalMapPayload = {
  nodes: GoalMapNode[]
  edges: GoalMapEdge[]
  summary: {
    goal_count: number
    project_count: number
    task_count: number
    blocked_count: number
  }
}

export type DecomposeSubtask = {
  title: string
  type: string
  effort: string
  notes: string
}

export type DecomposeResponse = {
  node_id: string
  subtasks: DecomposeSubtask[]
}

// ── New Node types (Life OS redesign) ────────────────────────────────────────

export type NodeStatus = 'active' | 'available' | 'blocked' | 'done' | 'deferred'
export type NodeType = 'goal' | 'project' | 'task' | 'subtask' | 'sub_task' | 'idea' | 'burden'

export type ChecklistItem = {
  text: string
  done: boolean
}

export type BusinessContext = 'k_line' | 'freelance' | 'own_business' | 'idea' | ''

export type Node = {
  id: string
  code: string | null
  title: string
  type: NodeType
  category: string
  status: NodeStatus
  parent: string | null
  parent_title: string | null
  deps: string[]
  blocked_by_titles: string[]
  notes: string
  why: string
  checklist: ChecklistItem[]
  attachment_count: number
  order: number
  priority: number | null
  progress: number
  tags: string[]
  effort: string
  start_date: string | null
  target_date: string | null
  due_date: string | null
  focus_date: string | null
  business_context: BusinessContext
  completed_at: string | null
  total_logged_minutes: number
  created_at: string
  updated_at: string
  children?: Node[]
  dependent_count?: number
}

export type NodeCreatePayload = {
  title: string
  type: NodeType
  category?: string
  status?: NodeStatus
  parent?: string | null
  deps?: string[]
  notes?: string
  why?: string
  checklist?: ChecklistItem[]
  priority?: number
  progress?: number
  tags?: string[]
  effort?: string
  start_date?: string
  target_date?: string
  focus_date?: string | null
  business_context?: BusinessContext
}

export type NodeUpdatePayload = Partial<NodeCreatePayload>

export type ActiveGoalSummary = {
  id: string
  title: string
  category: string
  dependency_unblock_count: number
  progress_pct: number
}

export type ActiveGoalContext = {
  active_goal_count: number
  active_goals: ActiveGoalSummary[]
  overwhelm_score: number
  max_safe_active: number
  recommendation: string
}

export type NodePriorityEntry = {
  id: string
  title: string
  type: NodeType
  status: NodeStatus
  priority: number | null
  effort: string
  category: string
  business_context: string
  progress: number
  dependent_count: number
  blocked_by_count: number
  leverage_score: number
}

export type DashboardTask = {
  id: string
  title: string
  status: NodeStatus
  effort: string
  target_date: string | null
  tags: string[]
  notes: string
  blocked_by: string[]
}

// ── Misc goal-related ─────────────────────────────────────────────────────────

export type Attachment = {
  id: number
  node: number | null
  page_context: string
  type: 'url' | 'file' | 'snippet'
  title: string
  url: string
  file: string        // URL path to uploaded file
  content: string
  tags: string[]
  created_at: string
}

export type TimeLog = {
  id: number
  node: string
  started_at: string | null
  ended_at: string | null
  minutes: number
  note: string
  logged_at: string
  total_minutes_for_node: number
}

export type TimeLogPayload = {
  node: string
  started_at?: string | null
  ended_at?: string | null
  minutes?: number
  note?: string
}
