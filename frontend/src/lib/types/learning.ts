// ── Learning tracker ──────────────────────────────────────────────────────────

export type LearningItem = {
  id: number
  title: string
  author: string
  type: 'book' | 'course' | 'article' | 'video' | 'podcast' | 'other'
  status: 'not_started' | 'in_progress' | 'done'
  progress_pct: number
  linked_node: string | null
  started: string | null
  finished: string | null
  notes: string
  // Spaced repetition
  review_at: string | null
  reviewed_count: number
  is_actionable: boolean
  created_at: string
  updated_at: string
}

export type LearningItemPayload = Omit<LearningItem, 'id' | 'reviewed_count' | 'created_at' | 'updated_at'>

// ── Learning (older model) ────────────────────────────────────────────────────

export type Learning = {
  id: string
  topic: string
  source: string
  status: 'not_started' | 'in_progress' | 'completed'
  key_insights: string
  linked_goal: string | null
  created_at: string
}

export type LearningPayload = {
  topic: string
  source: string
  status: Learning['status']
  key_insights: string
  linked_goal: string | null
}

// ── Ideas ─────────────────────────────────────────────────────────────────────

export type Idea = {
  id: string
  title: string
  context: string
  status: 'raw' | 'exploring' | 'validated' | 'archived'
  linked_goal: string | null
  created_at: string
}

export type IdeaPayload = {
  title: string
  context: string
  status: Idea['status']
  linked_goal: string | null
}

// ── Decisions ────────────────────────────────────────────────────────────────

export type DecisionLog = {
  id: string
  decision: string
  reasoning: string
  alternatives_considered: string
  outcome: string
  trade_off_cost: string
  outcome_date: string | null
  outcome_result: 'right' | 'wrong' | 'too_early' | ''
  enabled_node: string | null
  enabled_node_title: string | null
  killed_node: string | null
  killed_node_title: string | null
  date: string
  created_at: string
}

export type DecisionLogPayload = {
  decision: string
  reasoning: string
  alternatives_considered: string
  outcome: string
  trade_off_cost: string
  outcome_date: string | null
  outcome_result: DecisionLog['outcome_result']
  enabled_node?: string | null
  killed_node?: string | null
  date: string
}

// ── Achievements ─────────────────────────────────────────────────────────────

export type Achievement = {
  id: string
  title: string
  domain: string
  date: string
  notes: string
  created_at: string
}

export type AchievementPayload = {
  title: string
  domain: string
  date: string
  notes: string
}

// ── Family Goals ─────────────────────────────────────────────────────────────

export type FamilyGoal = {
  id: string
  title: string
  who_involved: string
  target_date: string | null
  notes: string
  status: 'active' | 'completed' | 'on_hold'
  created_at: string
}

export type FamilyGoalPayload = {
  title: string
  who_involved: string
  target_date: string | null
  notes: string
  status: FamilyGoal['status']
}

// ── Relationships ─────────────────────────────────────────────────────────────

export type Relationship = {
  id: string
  name: string
  relationship_type: string
  last_contact: string | null
  follow_up_notes: string
  created_at: string
}

export type RelationshipPayload = {
  name: string
  relationship_type: string
  last_contact: string | null
  follow_up_notes: string
}

// ── Ideas Overview ────────────────────────────────────────────────────────────

export type IdeasOverviewPayload = {
  date: string
  summary: {
    raw_ideas: number
    validated_ideas: number
    decisions: number
    learning_items: number
  }
  ideas: Idea[]
  decisions: DecisionLog[]
  learning: Learning[]
}
