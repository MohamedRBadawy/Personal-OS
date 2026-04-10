export type CRMStage = 'lead' | 'prospect' | 'active_client' | 'past_client' | 'partner' | 'employer' | ''

export type ContactInteraction = {
  id: number
  contact: number
  date: string
  type: 'email' | 'call' | 'meeting' | 'message' | 'note'
  summary: string
  outcome: string
  created_at: string
}

export type ContactInteractionPayload = {
  contact: number
  date: string
  type: ContactInteraction['type']
  summary: string
  outcome?: string
}

export type Contact = {
  id: number
  name: string
  relation: 'client' | 'prospect' | 'mentor' | 'friend' | 'family' | 'colleague' | 'other'
  company: string
  email: string
  phone: string
  last_contact: string | null
  next_followup: string | null
  notes: string
  linked_node: string | null
  crm_stage: CRMStage
  source: string
  linked_opportunity: number | null
  interactions: ContactInteraction[]
  followup_overdue: boolean
  days_since_contact: number | null
  created_at: string
  updated_at: string
}

export type ContactPayload = {
  name: string
  relation: Contact['relation']
  company?: string
  email?: string
  phone?: string
  last_contact?: string | null
  next_followup?: string | null
  notes?: string
  linked_node?: string | null
  crm_stage?: CRMStage
  source?: string
  linked_opportunity?: number | null
}
