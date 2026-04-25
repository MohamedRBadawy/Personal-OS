import { RecordWorkspace } from '../components/RecordWorkspace'
import {
  createAchievement,
  createDecision,
  createFamilyGoal,
  createIdea,
  createLearning,
  createMarketingAction,
  createRelationship,
  deleteAchievement,
  deleteDecision,
  deleteFamilyGoal,
  deleteIdea,
  deleteLearning,
  deleteMarketingAction,
  deleteRelationship,
  listAchievements,
  listDecisions,
  listFamilyGoals,
  listIdeas,
  listLearnings,
  listMarketingActions,
  listRelationships,
  updateAchievement,
  updateDecision,
  updateFamilyGoal,
  updateIdea,
  updateLearning,
  updateMarketingAction,
  updateRelationship,
} from '../lib/api'
import { formatDate, titleCase } from '../lib/formatters'
import type {
  Achievement,
  DecisionLog,
  FamilyGoal,
  Idea,
  Learning,
  MarketingAction,
  Relationship,
} from '../lib/types'

const today = new Date().toISOString().slice(0, 10)

function emptyToNull(value: string | boolean) {
  return typeof value === 'string' && value.trim() === '' ? null : value
}

export function MarketingPage() {
  return (
    <RecordWorkspace<MarketingAction>
      createRecord={(payload) => createMarketingAction(payload as never)}
      deleteRecord={deleteMarketingAction}
      description="Track visible work and follow-ups without needing the admin."
      deserialize={(item) => ({
        action: item.action,
        platform: item.platform,
        date: item.date,
        follow_up_date: item.follow_up_date ?? '',
        follow_up_done: item.follow_up_done,
        result: item.result,
      })}
      emptyState={{
        title: 'No marketing actions yet',
        body: 'Your outreach and visibility records will appear here.',
      }}
      eyebrow="Marketing"
      fields={[
        { name: 'action', label: 'Action', type: 'text', required: true },
        { name: 'platform', label: 'Platform', type: 'text', required: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'follow_up_date', label: 'Follow-up date', type: 'date' },
        { name: 'follow_up_done', label: 'Follow-up completed', type: 'checkbox' },
        { name: 'result', label: 'Result', type: 'textarea' },
      ]}
      getBody={(item) => item.result}
      getId={(item) => item.id}
      getMeta={(item) => [item.platform, formatDate(item.date)]}
      getStatusLabel={(item) => (item.follow_up_done ? 'done' : item.follow_up_date ? 'active' : null)}
      getTitle={(item) => item.action}
      heading="Marketing actions and follow-ups"
      initialValues={{
        action: '',
        platform: 'LinkedIn',
        date: today,
        follow_up_date: '',
        follow_up_done: false,
        result: '',
      }}
      invalidateKeys={[['pipeline-workspace'], ['analytics-overview'], ['dashboard']]}
      itemLabel="Marketing action"
      listQuery={listMarketingActions}
      queryKey={['marketing-actions']}
      serialize={(values) => ({
        action: values.action,
        platform: values.platform,
        date: values.date,
        follow_up_date: emptyToNull(values.follow_up_date),
        follow_up_done: values.follow_up_done,
        result: values.result,
        goal: null,
      })}
      updateRecord={(id, payload) => updateMarketingAction(id, payload as never)}
    />
  )
}

export function IdeasPage() {
  return (
    <RecordWorkspace<Idea>
      createRecord={(payload) => createIdea(payload as never)}
      deleteRecord={deleteIdea}
      description="Capture raw thoughts and move them toward something validated."
      deserialize={(item) => ({
        title: item.title,
        status: item.status,
        context: item.context,
      })}
      emptyState={{
        title: 'No ideas yet',
        body: 'Fresh ideas and inbox captures will collect here.',
      }}
      eyebrow="Ideas"
      fields={[
        { name: 'title', label: 'Title', type: 'text', required: true },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'raw', label: 'Raw' },
            { value: 'exploring', label: 'Exploring' },
            { value: 'validated', label: 'Validated' },
            { value: 'archived', label: 'Archived' },
          ],
        },
        { name: 'context', label: 'Context', type: 'textarea' },
      ]}
      getBody={(item) => item.context}
      getId={(item) => item.id}
      getMeta={(item) => [formatDate(item.created_at)]}
      getStatusLabel={(item) => item.status}
      getTitle={(item) => item.title}
      heading="Idea inbox and development"
      initialValues={{
        title: '',
        status: 'raw',
        context: '',
      }}
      invalidateKeys={[['analytics-overview']]}
      itemLabel="Idea"
      listQuery={listIdeas}
      queryKey={['ideas']}
      serialize={(values) => ({
        title: values.title,
        status: values.status,
        context: values.context,
        linked_goal: null,
      })}
      updateRecord={(id, payload) => updateIdea(id, payload as never)}
    />
  )
}

export function DecisionsPage() {
  function isPendingReview(item: DecisionLog) {
    const todayText = new Date().toLocaleDateString('en-CA')
    return Boolean(item.outcome_date && item.outcome_date <= todayText && item.outcome_result === '')
  }

  return (
    <RecordWorkspace<DecisionLog>
      createRecord={(payload) => createDecision(payload as never)}
      deleteRecord={deleteDecision}
      description="Keep meaningful decisions and the reasoning behind them accessible."
      deserialize={(item) => ({
        decision: item.decision,
        date: item.date,
        reasoning: item.reasoning,
        alternatives_considered: item.alternatives_considered,
        outcome: item.outcome,
        trade_off_cost: item.trade_off_cost,
        outcome_date: item.outcome_date ?? '',
        outcome_result: item.outcome_result,
      })}
      emptyState={{
        title: 'No decisions yet',
        body: 'Important decisions will show up here once recorded.',
      }}
      eyebrow="Decisions"
      fields={[
        { name: 'decision', label: 'Decision', type: 'text', required: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'reasoning', label: 'Reasoning', type: 'textarea', required: true },
        { name: 'trade_off_cost', label: "Trade-off: what you're NOT doing", type: 'textarea' },
        { name: 'outcome_date', label: 'Outcome date', type: 'date' },
        {
          name: 'outcome_result',
          label: 'Outcome result',
          type: 'select',
          options: [
            { value: '', label: 'Not yet' },
            { value: 'right', label: 'Right' },
            { value: 'wrong', label: 'Wrong' },
            { value: 'too_early', label: 'Too early' },
          ],
        },
        { name: 'alternatives_considered', label: 'Alternatives', type: 'textarea' },
        { name: 'outcome', label: 'Outcome', type: 'textarea' },
      ]}
      getBody={(item) => item.reasoning}
      getId={(item) => item.id}
      getMeta={(item) => [formatDate(item.date)]}
      getTitle={(item) => item.decision}
      heading="Decision log"
      initialValues={{
        decision: '',
        date: today,
        reasoning: '',
        alternatives_considered: '',
        outcome: '',
        trade_off_cost: '',
        outcome_date: '',
        outcome_result: '',
      }}
      invalidateKeys={[['analytics-overview'], ['pipeline-workspace']]}
      itemLabel="Decision"
      listQuery={listDecisions}
      queryKey={['decisions']}
      serialize={(values) => ({
        decision: values.decision,
        date: values.date,
        reasoning: values.reasoning,
        alternatives_considered: values.alternatives_considered,
        outcome: values.outcome,
        trade_off_cost: values.trade_off_cost,
        outcome_date: values.outcome_date || null,
        outcome_result: values.outcome_result,
      })}
      getStatusLabel={(item) => isPendingReview(item) ? 'Pending review' : null}
      updateRecord={(id, payload) => updateDecision(id, payload as never)}
    />
  )
}

export function AchievementsPage() {
  return (
    <RecordWorkspace<Achievement>
      createRecord={(payload) => createAchievement(payload as never)}
      deleteRecord={deleteAchievement}
      description="Wins should stay visible so momentum has a timeline."
      deserialize={(item) => ({
        title: item.title,
        domain: item.domain,
        date: item.date,
        notes: item.notes,
      })}
      emptyState={{
        title: 'No achievements yet',
        body: 'Wins and milestones will show up here once logged.',
      }}
      eyebrow="Achievements"
      fields={[
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'domain', label: 'Domain', type: 'text', required: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      getBody={(item) => item.notes}
      getId={(item) => item.id}
      getMeta={(item) => [item.domain, formatDate(item.date)]}
      getTitle={(item) => item.title}
      heading="Achievements"
      initialValues={{
        title: '',
        domain: 'Career',
        date: today,
        notes: '',
      }}
      invalidateKeys={[['analytics-overview']]}
      itemLabel="Achievement"
      listQuery={listAchievements}
      queryKey={['achievements']}
      serialize={(values) => ({
        title: values.title,
        domain: values.domain,
        date: values.date,
        notes: values.notes,
      })}
      updateRecord={(id, payload) => updateAchievement(id, payload as never)}
    />
  )
}

export function FamilyPage() {
  return (
    <RecordWorkspace<FamilyGoal>
      createRecord={(payload) => createFamilyGoal(payload as never)}
      deleteRecord={deleteFamilyGoal}
      description="Shared family goals deserve a dedicated place in the system."
      deserialize={(item) => ({
        title: item.title,
        who_involved: item.who_involved,
        target_date: item.target_date ?? '',
        notes: item.notes,
        status: item.status,
      })}
      emptyState={{
        title: 'No family goals yet',
        body: 'Shared family milestones will show up here.',
      }}
      eyebrow="Family"
      fields={[
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'who_involved', label: 'Who is involved', type: 'text', required: true },
        { name: 'target_date', label: 'Target date', type: 'date' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'on_hold', label: 'On hold' },
          ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      getBody={(item) => item.notes}
      getId={(item) => item.id}
      getMeta={(item) => [item.who_involved, item.target_date ? formatDate(item.target_date) : 'No target date']}
      getStatusLabel={(item) => item.status}
      getTitle={(item) => item.title}
      heading="Family goals"
      initialValues={{
        title: '',
        who_involved: '',
        target_date: '',
        status: 'active',
        notes: '',
      }}
      invalidateKeys={[['analytics-overview']]}
      itemLabel="Family goal"
      listQuery={listFamilyGoals}
      queryKey={['family-goals']}
      serialize={(values) => ({
        title: values.title,
        who_involved: values.who_involved,
        target_date: emptyToNull(values.target_date),
        status: values.status,
        notes: values.notes,
      })}
      updateRecord={(id, payload) => updateFamilyGoal(id, payload as never)}
    />
  )
}

export function RelationshipsPage() {
  return (
    <RecordWorkspace<Relationship>
      createRecord={(payload) => createRelationship(payload as never)}
      deleteRecord={deleteRelationship}
      description="Keep people and follow-up context visible inside the main product."
      deserialize={(item) => ({
        name: item.name,
        relationship_type: item.relationship_type,
        last_contact: item.last_contact ?? '',
        follow_up_notes: item.follow_up_notes,
      })}
      emptyState={{
        title: 'No relationships yet',
        body: 'Important people and follow-up notes will show up here.',
      }}
      eyebrow="Relationships"
      fields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'relationship_type', label: 'Relationship type', type: 'text', required: true },
        { name: 'last_contact', label: 'Last contact', type: 'date' },
        { name: 'follow_up_notes', label: 'Follow-up notes', type: 'textarea' },
      ]}
      getBody={(item) => item.follow_up_notes}
      getId={(item) => item.id}
      getMeta={(item) => [item.relationship_type, item.last_contact ? formatDate(item.last_contact) : 'No contact date']}
      getTitle={(item) => item.name}
      heading="Relationships"
      initialValues={{
        name: '',
        relationship_type: 'friend',
        last_contact: '',
        follow_up_notes: '',
      }}
      invalidateKeys={[['analytics-overview']]}
      itemLabel="Relationship"
      listQuery={listRelationships}
      queryKey={['relationships']}
      serialize={(values) => ({
        name: values.name,
        relationship_type: values.relationship_type,
        last_contact: emptyToNull(values.last_contact),
        follow_up_notes: values.follow_up_notes,
      })}
      updateRecord={(id, payload) => updateRelationship(id, payload as never)}
    />
  )
}

export function LearningPage() {
  return (
    <RecordWorkspace<Learning>
      createRecord={(payload) => createLearning(payload as never)}
      deleteRecord={deleteLearning}
      description="Track books, courses, and skill-building alongside the rest of life and work."
      deserialize={(item) => ({
        topic: item.topic,
        source: item.source,
        status: item.status,
        key_insights: item.key_insights,
      })}
      emptyState={{
        title: 'No learning items yet',
        body: 'Books, courses, and skills will show up here.',
      }}
      eyebrow="Learning"
      fields={[
        { name: 'topic', label: 'Topic', type: 'text', required: true },
        { name: 'source', label: 'Source', type: 'text', required: true },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'not_started', label: 'Not started' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
          ],
        },
        { name: 'key_insights', label: 'Key insights', type: 'textarea' },
      ]}
      getBody={(item) => item.key_insights}
      getId={(item) => item.id}
      getMeta={(item) => [item.source]}
      getStatusLabel={(item) => titleCase(item.status)}
      getTitle={(item) => item.topic}
      heading="Learning"
      initialValues={{
        topic: '',
        source: '',
        status: 'not_started',
        key_insights: '',
      }}
      invalidateKeys={[['analytics-overview']]}
      itemLabel="Learning item"
      listQuery={listLearnings}
      queryKey={['learning-items']}
      serialize={(values) => ({
        topic: values.topic,
        source: values.source,
        status: values.status,
        key_insights: values.key_insights,
        linked_goal: null,
      })}
      updateRecord={(id, payload) => updateLearning(id, payload as never)}
    />
  )
}
