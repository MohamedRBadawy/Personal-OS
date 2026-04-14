export type OpportunityStatus = 'new' | 'reviewing' | 'applied' | 'interview' | 'proposal_sent' | 'won' | 'lost' | 'rejected'

export type MarketingChannelPlatform = 'linkedin' | 'upwork' | 'freelancer' | 'email' | 'referral' | 'other'
export type MarketingChannelStatus = 'active' | 'needs_setup' | 'inactive'
export type MarketingCampaignStatus = 'planned' | 'active' | 'paused' | 'completed'
export type MarketingActionType = 'post' | 'message' | 'email' | 'comment' | 'proposal' | 'connection_request' | 'call' | 'other'

export type MarketingChannel = {
  id: string
  platform: MarketingChannelPlatform
  label: string
  profile_url: string
  status: MarketingChannelStatus
  target_audience: string
  notes: string
  connections: number | null
  last_action_date: string | null
  created_at: string
  updated_at: string
}

export type MarketingCampaign = {
  id: string
  name: string
  goal_node: string | null
  channels: string[]
  offer: string
  target_audience: string
  message_angle: string
  status: MarketingCampaignStatus
  start_date: string
  end_date: string | null
  target_outreach_count: number
  notes: string
  created_at: string
  updated_at: string
}

export type ActiveMarketingCampaign = Omit<MarketingCampaign, 'channels'> & {
  action_count: number
  channels: MarketingChannel[]
}

export type MarketingWorkspacePayload = {
  this_week_count: number
  this_month_count: number
  active_campaign_count: number
  active_channel_count: number
  actions_by_type: Record<string, number>
  active_campaigns: Array<ActiveMarketingCampaign>
  channel_summary: Array<MarketingChannel & { total_actions: number }>
  recent_actions: MarketingAction[]
  due_follow_ups: MarketingAction[]
}

export type Opportunity = {
  id: string
  name: string
  platform: string
  description: string
  budget: string | null
  status: OpportunityStatus
  job_url: string
  client_name: string
  linked_contact: number | null
  fit_score: number | null
  fit_reasoning: string
  date_found: string
  date_applied: string | null
  date_closed: string | null
  proposal_draft: string
  outcome_notes: string
  // Outreach tracking
  last_outreach_at: string | null
  outreach_count: number
  next_followup_date: string | null
  prospect_context: string
  ai_draft: string
  created_at: string
  updated_at: string
}

export type OpportunityPayload = {
  name: string
  platform: string
  description: string
  budget: string | null
  status: OpportunityStatus
  job_url?: string
  client_name?: string
  linked_contact?: number | null
  fit_score?: number | null
  fit_reasoning?: string
  date_found: string
  date_applied?: string | null
  date_closed?: string | null
  proposal_draft?: string
  outcome_notes?: string
  prospect_context?: string
}

export type Client = {
  id: string
  name: string
  source_platform: string
  opportunity: string | null
  notes: string
  created_at: string
  updated_at: string
}

export type MarketingAction = {
  id: string
  action: string
  platform: string
  goal: string | null
  campaign: string | null
  channel: string | null
  contact: string | null
  action_type: MarketingActionType | ''
  result: string
  follow_up_date: string | null
  follow_up_done: boolean
  date: string
  created_at: string
}

export type MarketingActionPayload = {
  action: string
  platform: string
  goal?: string | null
  campaign?: string | null
  channel?: string | null
  contact?: string | null
  action_type?: MarketingActionType | ''
  result?: string
  follow_up_date?: string | null
  follow_up_done?: boolean
  date: string
}

export type PipelineSummary = {
  new_or_reviewing_count: number
  applied_count: number
  won_count: number
  lost_count: number
  empty_pipeline: boolean
  days_since_last_application: number | null
  due_follow_ups_count: number
}

export type PipelineWorkspaceOpportunity = {
  id: string
  name: string
  platform: string
  description?: string
  status: OpportunityStatus
  budget: string | null
  job_url?: string
  client_name?: string
  linked_contact?: number | null
  fit_score: number | null
  fit_reasoning?: string
  proposal_draft?: string
  date_found: string
  date_applied: string | null
  date_closed?: string | null
  outcome_notes: string
}

export type PipelineWorkspaceMarketingAction = {
  id: string
  action: string
  platform: string
  follow_up_date: string | null
  follow_up_done: boolean
  date: string
  result: string
}

export type PipelineWorkspaceClient = {
  id: string
  name: string
  source_platform: string
  created_at?: string
  notes: string
}

export type PipelineWorkspacePayload = {
  date: string
  summary: PipelineSummary
  active_opportunities: PipelineWorkspaceOpportunity[]
  recent_outcomes: PipelineWorkspaceOpportunity[]
  due_follow_ups: PipelineWorkspaceMarketingAction[]
  recent_clients: PipelineWorkspaceClient[]
}

export type ProjectRetrospective = {
  id: string
  title: string
  source_type: 'project' | 'opportunity'
  goal_node: string | null
  opportunity: string | null
  status: string
  summary: string
  what_worked: string
  what_didnt: string
  next_time: string
  closed_at: string
  created_at: string
  updated_at: string
}

export type ProjectRetrospectivePayload = {
  title: string
  source_type: 'project' | 'opportunity'
  goal_node?: string | null
  opportunity?: string | null
  status: string
  summary: string
  what_worked: string
  what_didnt: string
  next_time: string
  closed_at: string
}
