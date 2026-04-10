import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/EmptyState'
import { MetricCard } from '../components/MetricCard'
import { PageSkeleton } from '../components/PageSkeleton'
import { Panel } from '../components/Panel'
import { WorkspaceTabs } from '../components/WorkspaceTabs'
import {
  createMarketingAction,
  createMarketingCampaign,
  createMarketingChannel,
  deleteMarketingAction,
  deleteMarketingCampaign,
  deleteMarketingChannel,
  getMarketingWorkspace,
  listNodes,
  updateMarketingAction,
  updateMarketingCampaign,
  updateMarketingChannel,
} from '../lib/api'
import type {
  MarketingAction,
  MarketingActionPayload,
  MarketingActionType,
  MarketingCampaign,
  MarketingCampaignStatus,
  MarketingChannel,
  MarketingChannelPlatform,
  MarketingChannelStatus,
} from '../lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<MarketingChannelPlatform, string> = {
  linkedin: 'LinkedIn', upwork: 'Upwork', freelancer: 'Freelancer',
  email: 'Email Outreach', referral: 'Referral Network', other: 'Other',
}

const PLATFORM_ICONS: Record<MarketingChannelPlatform, string> = {
  linkedin: '💼', upwork: '🔧', freelancer: '🌐',
  email: '✉', referral: '🤝', other: '📣',
}

const CHANNEL_STATUS_COLORS: Record<MarketingChannelStatus, string> = {
  active: 'var(--success)', needs_setup: 'var(--warning)', inactive: 'var(--muted)',
}

const CAMPAIGN_STATUS_COLORS: Record<MarketingCampaignStatus, string> = {
  active: 'var(--success)', planned: 'var(--accent)', paused: 'var(--warning)', completed: 'var(--muted)',
}

const ACTION_TYPE_LABELS: Record<MarketingActionType, string> = {
  post: 'Post', message: 'Message', email: 'Email', comment: 'Comment',
  proposal: 'Proposal', connection_request: 'Connection Req.', call: 'Call', other: 'Other',
}

const ACTION_TYPE_ICONS: Record<MarketingActionType, string> = {
  post: '📢', message: '💬', email: '✉', comment: '💭',
  proposal: '📋', connection_request: '🤝', call: '📞', other: '📌',
}

type TabId = 'channels' | 'campaigns' | 'log'

const TABS = [
  { id: 'channels' as TabId, label: 'Channels' },
  { id: 'campaigns' as TabId, label: 'Campaigns' },
  { id: 'log' as TabId, label: 'Action Log' },
]

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })
}

// ── Channel form ──────────────────────────────────────────────────────────────

function ChannelForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<MarketingChannel>
  onSave: (p: Partial<MarketingChannel>) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [platform, setPlatform] = useState<MarketingChannelPlatform>(initial?.platform ?? 'linkedin')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [profileUrl, setProfileUrl] = useState(initial?.profile_url ?? '')
  const [status, setStatus] = useState<MarketingChannelStatus>(initial?.status ?? 'needs_setup')
  const [connections, setConnections] = useState(initial?.connections?.toString() ?? '')
  const [targetAudience, setTargetAudience] = useState(initial?.target_audience ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      platform, label, profile_url: profileUrl, status,
      connections: connections ? parseInt(connections) : null,
      target_audience: targetAudience, notes,
    })
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field-group">
        <label>Platform</label>
        <select value={platform} onChange={e => setPlatform(e.target.value as MarketingChannelPlatform)}>
          {(Object.keys(PLATFORM_LABELS) as MarketingChannelPlatform[]).map(p => (
            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
          ))}
        </select>
      </div>
      <div className="field-group">
        <label>Label</label>
        <input required value={label} onChange={e => setLabel(e.target.value)} placeholder="LinkedIn Profile" />
      </div>
      <div className="field-group span-2">
        <label>Profile URL</label>
        <input type="url" value={profileUrl} onChange={e => setProfileUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="field-group">
        <label>Status</label>
        <select value={status} onChange={e => setStatus(e.target.value as MarketingChannelStatus)}>
          <option value="active">Active</option>
          <option value="needs_setup">Needs Setup</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="field-group">
        <label>Connections / Followers</label>
        <input type="number" value={connections} onChange={e => setConnections(e.target.value)} placeholder="0" />
      </div>
      <div className="field-group span-2">
        <label>Target Audience</label>
        <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Small business owners, logistics SMEs..." />
      </div>
      <div className="field-group span-2">
        <label>Notes</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="button-row span-2">
        <button type="submit" disabled={isPending}>{isPending ? 'Saving…' : initial?.id ? 'Update' : 'Add Channel'}</button>
        <button type="button" className="button-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Campaign form ─────────────────────────────────────────────────────────────

function CampaignForm({
  initial,
  channels,
  goalOptions,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<MarketingCampaign>
  channels: MarketingChannel[]
  goalOptions: Array<{ id: string; title: string }>
  onSave: (p: Partial<MarketingCampaign>) => void
  onCancel: () => void
  isPending: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [name, setName] = useState(initial?.name ?? '')
  const [offer, setOffer] = useState(initial?.offer ?? '')
  const [targetAudience, setTargetAudience] = useState(initial?.target_audience ?? '')
  const [messageAngle, setMessageAngle] = useState(initial?.message_angle ?? '')
  const [status, setStatus] = useState<MarketingCampaignStatus>(initial?.status ?? 'planned')
  const [startDate, setStartDate] = useState(initial?.start_date ?? today)
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')
  const [targetCount, setTargetCount] = useState(initial?.target_outreach_count?.toString() ?? '0')
  const [selectedChannels, setSelectedChannels] = useState<string[]>(initial?.channels ?? [])
  const [goalNode, setGoalNode] = useState(initial?.goal_node ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function toggleChannel(id: string) {
    setSelectedChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      name, offer, target_audience: targetAudience, message_angle: messageAngle,
      status, start_date: startDate, end_date: endDate || null,
      target_outreach_count: parseInt(targetCount) || 0,
      channels: selectedChannels,
      goal_node: goalNode || null,
      notes,
    })
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field-group span-2">
        <label>Campaign Name</label>
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Operations Audit — LinkedIn Outreach" />
      </div>
      <div className="field-group span-2">
        <label>Offer (what are you promoting)</label>
        <textarea required rows={2} value={offer} onChange={e => setOffer(e.target.value)} placeholder="Operations Clarity Audit — €150 first engagement" />
      </div>
      <div className="field-group span-2">
        <label>Target Audience</label>
        <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Small logistics/shipping businesses in EU" />
      </div>
      <div className="field-group span-2">
        <label>Message Angle (the hook)</label>
        <textarea rows={2} value={messageAngle} onChange={e => setMessageAngle(e.target.value)} placeholder="What's it costing you to run on instinct instead of systems?" />
      </div>
      <div className="field-group">
        <label>Status</label>
        <select value={status} onChange={e => setStatus(e.target.value as MarketingCampaignStatus)}>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="field-group">
        <label>Target Outreach Count</label>
        <input type="number" value={targetCount} onChange={e => setTargetCount(e.target.value)} min={0} />
      </div>
      <div className="field-group">
        <label>Start Date</label>
        <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
      </div>
      <div className="field-group">
        <label>End Date (optional)</label>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
      </div>
      {channels.length > 0 && (
        <div className="field-group span-2">
          <label>Channels</label>
          <div className="marketing-channel-checkboxes">
            {channels.map(ch => (
              <label key={ch.id} className="marketing-channel-checkbox">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(ch.id)}
                  onChange={() => toggleChannel(ch.id)}
                />
                {PLATFORM_ICONS[ch.platform]} {ch.label}
              </label>
            ))}
          </div>
        </div>
      )}
      {goalOptions.length > 0 && (
        <div className="field-group span-2">
          <label>Linked Goal (optional)</label>
          <select value={goalNode} onChange={e => setGoalNode(e.target.value)}>
            <option value="">— none —</option>
            {goalOptions.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="field-group span-2">
        <label>Notes</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="button-row span-2">
        <button type="submit" disabled={isPending}>{isPending ? 'Saving…' : initial?.id ? 'Update' : 'Start Campaign'}</button>
        <button type="button" className="button-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Action log form ───────────────────────────────────────────────────────────

function ActionForm({
  initial,
  channels,
  campaigns,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<MarketingAction>
  channels: MarketingChannel[]
  campaigns: MarketingCampaign[]
  onSave: (p: MarketingActionPayload) => void
  onCancel: () => void
  isPending: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [action, setAction] = useState(initial?.action ?? '')
  const [platform, setPlatform] = useState(initial?.platform ?? '')
  const [actionType, setActionType] = useState<MarketingActionType | ''>(initial?.action_type ?? '')
  const [campaign, setCampaign] = useState(initial?.campaign ?? '')
  const [channel, setChannel] = useState(initial?.channel ?? '')
  const [result, setResult] = useState(initial?.result ?? '')
  const [date, setDate] = useState(initial?.date ?? today)
  const [followUpDate, setFollowUpDate] = useState(initial?.follow_up_date ?? '')
  const [followUpDone, setFollowUpDone] = useState(initial?.follow_up_done ?? false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      action, platform, action_type: actionType || undefined,
      campaign: campaign || null, channel: channel || null,
      result, date,
      follow_up_date: followUpDate || null,
      follow_up_done: followUpDone,
    })
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field-group span-2">
        <label>Action</label>
        <input required value={action} onChange={e => setAction(e.target.value)} placeholder="Sent connection request to logistics manager" />
      </div>
      <div className="field-group">
        <label>Platform</label>
        <input required value={platform} onChange={e => setPlatform(e.target.value)} placeholder="LinkedIn, Upwork, Email…" />
      </div>
      <div className="field-group">
        <label>Type</label>
        <select value={actionType} onChange={e => setActionType(e.target.value as MarketingActionType | '')}>
          <option value="">— select —</option>
          {(Object.keys(ACTION_TYPE_LABELS) as MarketingActionType[]).map(t => (
            <option key={t} value={t}>{ACTION_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      {campaigns.length > 0 && (
        <div className="field-group">
          <label>Campaign (optional)</label>
          <select value={campaign} onChange={e => setCampaign(e.target.value)}>
            <option value="">— none —</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      {channels.length > 0 && (
        <div className="field-group">
          <label>Channel (optional)</label>
          <select value={channel} onChange={e => setChannel(e.target.value)}>
            <option value="">— none —</option>
            {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.label}</option>)}
          </select>
        </div>
      )}
      <div className="field-group span-2">
        <label>Result / Outcome</label>
        <textarea rows={2} value={result} onChange={e => setResult(e.target.value)} placeholder="No response yet / Replied positively / Declined" />
      </div>
      <div className="field-group">
        <label>Date</label>
        <input required type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div className="field-group">
        <label>Follow-up Date</label>
        <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
      </div>
      {initial?.id && (
        <div className="field-group span-2">
          <label className="marketing-checkbox-label">
            <input type="checkbox" checked={followUpDone} onChange={e => setFollowUpDone(e.target.checked)} />
            Follow-up done
          </label>
        </div>
      )}
      <div className="button-row span-2">
        <button type="submit" disabled={isPending}>{isPending ? 'Saving…' : initial?.id ? 'Update' : 'Log Action'}</button>
        <button type="button" className="button-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MarketingPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>('channels')
  const [editingChannel, setEditingChannel] = useState<MarketingChannel | null>(null)
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null)
  const [showAddCampaign, setShowAddCampaign] = useState(false)
  const [editingAction, setEditingAction] = useState<MarketingAction | null>(null)
  const [showAddAction, setShowAddAction] = useState(false)

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['marketing-workspace'],
    queryFn: getMarketingWorkspace,
  })

  const { data: nodes = [] } = useQuery({
    queryKey: ['nodes-v2'],
    queryFn: listNodes,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['marketing-workspace'] })
    qc.invalidateQueries({ queryKey: ['command-center'] })
    qc.invalidateQueries({ queryKey: ['pipeline-workspace'] })
  }

  // Channel mutations
  const createChannelMut = useMutation({
    mutationFn: createMarketingChannel,
    onSuccess: () => { setShowAddChannel(false); invalidate() },
  })
  const updateChannelMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MarketingChannel> }) => updateMarketingChannel(id, data),
    onSuccess: () => { setEditingChannel(null); invalidate() },
  })
  const deleteChannelMut = useMutation({
    mutationFn: deleteMarketingChannel,
    onSuccess: invalidate,
  })

  // Campaign mutations
  const createCampaignMut = useMutation({
    mutationFn: createMarketingCampaign,
    onSuccess: () => { setShowAddCampaign(false); invalidate() },
  })
  const updateCampaignMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MarketingCampaign> }) => updateMarketingCampaign(id, data),
    onSuccess: () => { setEditingCampaign(null); invalidate() },
  })
  const deleteCampaignMut = useMutation({
    mutationFn: deleteMarketingCampaign,
    onSuccess: invalidate,
  })

  // Action mutations
  const createActionMut = useMutation({
    mutationFn: createMarketingAction,
    onSuccess: () => { setShowAddAction(false); invalidate() },
  })
  const updateActionMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MarketingActionPayload> }) => updateMarketingAction(id, data),
    onSuccess: () => { setEditingAction(null); invalidate() },
  })
  const deleteActionMut = useMutation({
    mutationFn: deleteMarketingAction,
    onSuccess: invalidate,
  })

  if (isLoading || !workspace) return <PageSkeleton />

  const goalOptions = nodes
    .filter(n => n.type === 'goal' || n.type === 'project')
    .map(n => ({ id: n.id, title: n.title }))

  const allChannels = workspace.channel_summary
  const allCampaigns = workspace.active_campaigns

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Marketing</p>
          <h2>Channels, campaigns, and outreach log</h2>
          <p>Track where you show up, what you're running, and every action taken.</p>
        </div>
        {tab === 'channels' && (
          <button onClick={() => { setShowAddChannel(true); setEditingChannel(null) }}>
            + Add Channel
          </button>
        )}
        {tab === 'campaigns' && (
          <button onClick={() => { setShowAddCampaign(true); setEditingCampaign(null) }}>
            + Start Campaign
          </button>
        )}
        {tab === 'log' && (
          <button onClick={() => { setShowAddAction(true); setEditingAction(null) }}>
            + Log Action
          </button>
        )}
      </div>

      <div className="metric-grid">
        <MetricCard label="Actions this week" value={String(workspace.this_week_count)} />
        <MetricCard label="Actions this month" value={String(workspace.this_month_count)} />
        <MetricCard label="Active campaigns" value={String(workspace.active_campaign_count)} />
        <MetricCard label="Active channels" value={String(workspace.active_channel_count)} tone={workspace.active_channel_count > 0 ? 'success' : 'warning'} />
      </div>

      <WorkspaceTabs tabs={TABS} activeTab={tab} onChange={v => setTab(v as TabId)} />

      {/* ── Channels tab ───────────────────────────────────────────────────── */}
      {tab === 'channels' && (
        <div>
          {(showAddChannel || editingChannel) && (
            <Panel title={editingChannel ? 'Edit Channel' : 'Add Channel'}>
              <ChannelForm
                initial={editingChannel ?? undefined}
                isPending={createChannelMut.isPending || updateChannelMut.isPending}
                onSave={data => {
                  if (editingChannel) updateChannelMut.mutate({ id: editingChannel.id, data })
                  else createChannelMut.mutate(data)
                }}
                onCancel={() => { setEditingChannel(null); setShowAddChannel(false) }}
              />
            </Panel>
          )}

          {allChannels.length === 0 ? (
            <EmptyState
              title="No channels yet"
              body="Add your first marketing channel to start tracking where you show up."
            />
          ) : (
            <div className="marketing-channels-grid">
              {allChannels.map(ch => (
                <article key={ch.id} className="marketing-channel-card">
                  <div className="marketing-channel-card-header">
                    <span className="marketing-channel-icon">{PLATFORM_ICONS[ch.platform]}</span>
                    <div>
                      <h3>{ch.label}</h3>
                      <span className="record-meta-chip">{PLATFORM_LABELS[ch.platform]}</span>
                    </div>
                    <span
                      className="marketing-status-pill"
                      style={{ background: CHANNEL_STATUS_COLORS[ch.status] }}
                    >
                      {ch.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="marketing-channel-stats">
                    {ch.connections !== null && (
                      <span className="marketing-stat">
                        <strong>{ch.connections.toLocaleString()}</strong>
                        <span className="muted"> connections</span>
                      </span>
                    )}
                    <span className="marketing-stat">
                      <strong>{ch.total_actions}</strong>
                      <span className="muted"> actions</span>
                    </span>
                    {ch.last_action_date && (
                      <span className="marketing-stat muted">Last: {formatDate(ch.last_action_date)}</span>
                    )}
                  </div>

                  {ch.target_audience && (
                    <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{ch.target_audience}</p>
                  )}

                  <div className="button-row">
                    {ch.profile_url && (
                      <a
                        href={ch.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button-muted"
                        style={{ fontSize: 12 }}
                      >
                        View Profile →
                      </a>
                    )}
                    <button
                      className="button-ghost"
                      style={{ fontSize: 12 }}
                      onClick={() => { setEditingChannel(ch); setShowAddChannel(false) }}
                    >
                      Edit
                    </button>
                    <button
                      className="button-ghost"
                      style={{ fontSize: 12, color: 'var(--danger)' }}
                      onClick={() => { if (confirm('Delete this channel?')) deleteChannelMut.mutate(ch.id) }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Campaigns tab ──────────────────────────────────────────────────── */}
      {tab === 'campaigns' && (
        <div>
          {(showAddCampaign || editingCampaign) && (
            <Panel title={editingCampaign ? 'Edit Campaign' : 'Start a Campaign'}>
              <CampaignForm
                initial={editingCampaign ?? undefined}
                channels={allChannels}
                goalOptions={goalOptions}
                isPending={createCampaignMut.isPending || updateCampaignMut.isPending}
                onSave={data => {
                  if (editingCampaign) updateCampaignMut.mutate({ id: editingCampaign.id, data })
                  else createCampaignMut.mutate(data)
                }}
                onCancel={() => { setEditingCampaign(null); setShowAddCampaign(false) }}
              />
            </Panel>
          )}

          {allCampaigns.length === 0 ? (
            <EmptyState
              title="No campaigns yet"
              body="A campaign is a structured push — one offer, one audience, tracked from start to result."
            />
          ) : (
            <div className="record-list">
              {allCampaigns.map(camp => {
                const progress = camp.target_outreach_count > 0
                  ? Math.min(100, Math.round((camp.action_count / camp.target_outreach_count) * 100))
                  : null
                return (
                  <article key={camp.id} className="record-card">
                    <div className="record-card-header">
                      <div>
                        <h3>{camp.name}</h3>
                        <div className="list-inline">
                          <span
                            className="marketing-status-pill"
                            style={{ background: CAMPAIGN_STATUS_COLORS[camp.status] }}
                          >
                            {camp.status}
                          </span>
                          {camp.channels.map(ch => (
                            <span key={ch.id} className="record-meta-chip">
                              {PLATFORM_ICONS[ch.platform]} {ch.label}
                            </span>
                          ))}
                          <span className="record-meta-chip">{formatDate(camp.start_date)} →{camp.end_date ? ` ${formatDate(camp.end_date)}` : ' ongoing'}</span>
                        </div>
                      </div>
                      <div className="button-row">
                        <button
                          className="button-muted"
                          style={{ fontSize: 12, padding: '2px 8px' }}
                          onClick={() => { setEditingCampaign(camp); setShowAddCampaign(false) }}
                        >
                          Edit
                        </button>
                        <button
                          className="button-ghost"
                          style={{ fontSize: 12, padding: '2px 8px', color: 'var(--danger)' }}
                          onClick={() => { if (confirm('Delete this campaign?')) deleteCampaignMut.mutate(camp.id) }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <p className="muted" style={{ marginBottom: 8, fontSize: 13 }}>{camp.offer}</p>

                    {camp.message_angle && (
                      <p style={{ fontSize: 12, fontStyle: 'italic', marginBottom: 8, color: 'var(--text-secondary)' }}>
                        "{camp.message_angle.slice(0, 120)}{camp.message_angle.length > 120 ? '…' : ''}"
                      </p>
                    )}

                    <div className="marketing-campaign-progress">
                      <div className="marketing-progress-label">
                        <span>{camp.action_count} actions logged</span>
                        {camp.target_outreach_count > 0 && (
                          <span className="muted">/ {camp.target_outreach_count} target</span>
                        )}
                      </div>
                      {progress !== null && (
                        <div className="marketing-progress-bar">
                          <div
                            className="marketing-progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Action Log tab ─────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div className="two-column">
          <Panel title={editingAction ? 'Edit Action' : 'Log an Action'}>
            <ActionForm
              initial={editingAction ?? undefined}
              channels={allChannels}
              campaigns={allCampaigns}
              isPending={createActionMut.isPending || updateActionMut.isPending}
              onSave={data => {
                if (editingAction) updateActionMut.mutate({ id: editingAction.id, data })
                else createActionMut.mutate(data)
              }}
              onCancel={() => setEditingAction(null)}
            />
          </Panel>

          <div>
            {workspace.due_follow_ups.length > 0 && (
              <Panel title="Due Follow-ups" description="Actions with follow-up dates that have arrived.">
                <div className="record-list">
                  {workspace.due_follow_ups.map(a => (
                    <article key={a.id} className="record-card">
                      <div className="record-card-header">
                        <div>
                          <p style={{ fontWeight: 600, marginBottom: 2 }}>{a.action}</p>
                          <div className="list-inline">
                            <span className="record-meta-chip">{a.platform}</span>
                            {a.action_type && (
                              <span className="record-meta-chip">
                                {ACTION_TYPE_ICONS[a.action_type as MarketingActionType]} {ACTION_TYPE_LABELS[a.action_type as MarketingActionType]}
                              </span>
                            )}
                            <span className="record-meta-chip">Due {formatDate(a.follow_up_date)}</span>
                          </div>
                        </div>
                      </div>
                      {a.result && <p className="muted" style={{ fontSize: 12 }}>{a.result}</p>}
                      <div className="button-row" style={{ marginTop: 6 }}>
                        <button
                          className="button-muted"
                          style={{ fontSize: 12 }}
                          disabled={updateActionMut.isPending}
                          onClick={() => updateActionMut.mutate({ id: a.id, data: { follow_up_done: true } })}
                        >
                          Mark done
                        </button>
                        <button
                          className="button-ghost"
                          style={{ fontSize: 12 }}
                          onClick={() => setEditingAction(a)}
                        >
                          Edit
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="Recent Actions" description="Last 10 logged marketing actions.">
              {workspace.recent_actions.length === 0 ? (
                <EmptyState title="No actions yet" body="Log your first outreach action to start the record." />
              ) : (
                <div className="record-list">
                  {workspace.recent_actions.map(a => (
                    <article key={a.id} className="record-card">
                      <div className="record-card-header">
                        <div>
                          <p style={{ fontWeight: 500, marginBottom: 2 }}>{a.action}</p>
                          <div className="list-inline">
                            <span className="record-meta-chip">{a.platform}</span>
                            {a.action_type && (
                              <span className="record-meta-chip">
                                {ACTION_TYPE_ICONS[a.action_type as MarketingActionType]} {ACTION_TYPE_LABELS[a.action_type as MarketingActionType]}
                              </span>
                            )}
                            <span className="record-meta-chip muted">{formatDate(a.date)}</span>
                          </div>
                        </div>
                        <div className="button-row">
                          <button
                            className="button-ghost"
                            style={{ fontSize: 12 }}
                            onClick={() => setEditingAction(a)}
                          >
                            Edit
                          </button>
                          <button
                            className="button-ghost"
                            style={{ fontSize: 12, color: 'var(--danger)' }}
                            onClick={() => { if (confirm('Delete this action?')) deleteActionMut.mutate(a.id) }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {a.result && <p className="muted" style={{ fontSize: 12 }}>{a.result}</p>}
                      {a.follow_up_date && !a.follow_up_done && (
                        <p style={{ fontSize: 12, color: 'var(--warning)' }}>
                          Follow-up: {formatDate(a.follow_up_date)}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </section>
  )
}
