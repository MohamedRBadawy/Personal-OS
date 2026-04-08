import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/EmptyState'
import { PageSkeleton } from '../components/PageSkeleton'
import { Panel } from '../components/Panel'
import {
  createContact,
  deleteContact,
  getDueFollowups,
  listContacts,
  updateContact,
} from '../lib/api'
import type { Contact, ContactPayload } from '../lib/types'

const RELATION_ICONS: Record<Contact['relation'], string> = {
  client: '💼', prospect: '🔍', mentor: '🎓',
  friend: '🤝', family: '👨‍👩‍👧', colleague: '👔', other: '👤',
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Contact form ──────────────────────────────────────────────────────────────

function ContactForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<Contact>
  onSave: (p: ContactPayload) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [relation, setRelation] = useState<Contact['relation']>(initial?.relation ?? 'other')
  const [company, setCompany] = useState(initial?.company ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [lastContact, setLastContact] = useState(initial?.last_contact ?? '')
  const [nextFollowup, setNextFollowup] = useState(initial?.next_followup ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <div className="contact-form">
      <div className="contact-form-row">
        <div className="contact-form-field">
          <label className="contact-label">Name *</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="contact-form-field" style={{ maxWidth: 160 }}>
          <label className="contact-label">Relation</label>
          <select className="form-input" value={relation} onChange={e => setRelation(e.target.value as Contact['relation'])}>
            {(Object.keys(RELATION_ICONS) as Contact['relation'][]).map(r => (
              <option key={r} value={r}>{RELATION_ICONS[r]} {r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="contact-form-row">
        <div className="contact-form-field">
          <label className="contact-label">Company</label>
          <input className="form-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional" />
        </div>
        <div className="contact-form-field">
          <label className="contact-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" />
        </div>
        <div className="contact-form-field">
          <label className="contact-label">Phone</label>
          <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div className="contact-form-row">
        <div className="contact-form-field">
          <label className="contact-label">Last contact</label>
          <input className="form-input" type="date" value={lastContact} onChange={e => setLastContact(e.target.value)} />
        </div>
        <div className="contact-form-field">
          <label className="contact-label">Next follow-up</label>
          <input className="form-input" type="date" value={nextFollowup} onChange={e => setNextFollowup(e.target.value)} />
        </div>
      </div>
      <div className="contact-form-field">
        <label className="contact-label">Notes</label>
        <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context, topics discussed, action items..." />
      </div>
      <div className="button-row">
        <button
          disabled={!name.trim() || isPending}
          onClick={() => onSave({
            name, relation, company, email, phone,
            last_contact: lastContact || null,
            next_followup: nextFollowup || null,
            notes,
          })}
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button className="button-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Contact card ──────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onEdit,
  onLogContact,
  onDelete,
}: {
  contact: Contact
  onEdit: (c: Contact) => void
  onLogContact: (id: number) => void
  onDelete: (id: number) => void
}) {
  const isOverdue = contact.followup_overdue
  const daysSince = contact.days_since_contact

  return (
    <div className={`contact-card${isOverdue ? ' contact-card--overdue' : ''}`}>
      <div className="contact-card-head">
        <div className="contact-card-avatar">
          <span>{RELATION_ICONS[contact.relation] ?? '👤'}</span>
        </div>
        <div className="contact-card-info">
          <p className="contact-card-name">{contact.name}</p>
          <div className="contact-card-meta">
            <span className="record-meta-chip">{contact.relation}</span>
            {contact.company && <span className="record-meta-chip">{contact.company}</span>}
          </div>
        </div>
        {isOverdue && (
          <span className="contact-overdue-badge">Follow-up overdue</span>
        )}
      </div>

      <div className="contact-card-dates">
        <div className="contact-date-item">
          <span className="contact-date-label">Last contact</span>
          <span className="contact-date-val">
            {contact.last_contact ? formatDate(contact.last_contact) : '—'}
            {daysSince !== null && daysSince > 0 && (
              <span className="contact-days-ago"> ({daysSince}d ago)</span>
            )}
          </span>
        </div>
        <div className="contact-date-item">
          <span className="contact-date-label">Next follow-up</span>
          <span className="contact-date-val" style={{ color: isOverdue ? '#dc2626' : undefined }}>
            {contact.next_followup ? formatDate(contact.next_followup) : '—'}
          </span>
        </div>
      </div>

      {contact.linked_node && (
        <Link to={`/goals?node=${contact.linked_node}`} className="contact-goal-chip">
          🎯 Linked goal →
        </Link>
      )}

      {contact.notes && (
        <p className="contact-card-notes">{contact.notes.slice(0, 120)}{contact.notes.length > 120 ? '…' : ''}</p>
      )}

      <div className="contact-card-actions">
        <button
          className="button-muted"
          style={{ fontSize: 12 }}
          onClick={() => onLogContact(contact.id)}
        >
          Log contact today
        </button>
        <button className="button-ghost" style={{ fontSize: 12 }} onClick={() => onEdit(contact)}>Edit</button>
        <button className="button-ghost" style={{ fontSize: 12, color: '#dc2626' }} onClick={() => onDelete(contact.id)}>✕</button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ContactsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'followups'>('followups')

  const allQuery = useQuery({
    queryKey: ['contacts'],
    queryFn: () => listContacts(),
  })
  const dueQuery = useQuery({
    queryKey: ['contacts-due'],
    queryFn: getDueFollowups,
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['contacts'] })
    qc.invalidateQueries({ queryKey: ['contacts-due'] })
  }

  const createMut = useMutation({ mutationFn: createContact, onSuccess: () => { setShowAdd(false); invalidate() } })
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ContactPayload> }) =>
      updateContact(id, payload),
    onSuccess: () => { setEditing(null); invalidate() },
  })
  const deleteMut = useMutation({ mutationFn: deleteContact, onSuccess: invalidate })

  // Log contact today = set last_contact to today and clear next_followup
  const logContactMut = useMutation({
    mutationFn: (id: number) => updateContact(id, {
      last_contact: new Date().toLocaleDateString('en-CA'),
      next_followup: null,
    }),
    onSuccess: invalidate,
  })

  if (allQuery.isLoading || dueQuery.isLoading) return <PageSkeleton />

  const allContacts = allQuery.data?.results ?? []
  const dueContacts = dueQuery.data?.results ?? []
  const displayContacts = activeTab === 'followups' ? dueContacts : allContacts

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Contacts</p>
          <h2>Relationship manager</h2>
          <p className="muted">{allContacts.length} contacts · {dueContacts.length} follow-ups due</p>
        </div>
        <div className="button-row">
          <button onClick={() => { setShowAdd(true); setEditing(null) }}>+ Add contact</button>
        </div>
      </div>

      {(showAdd || editing) && (
        <Panel title={editing ? `Edit — ${editing.name}` : 'Add contact'}>
          <ContactForm
            initial={editing ?? undefined}
            onSave={payload => editing
              ? updateMut.mutate({ id: editing.id, payload })
              : createMut.mutate(payload)
            }
            onCancel={() => { setShowAdd(false); setEditing(null) }}
            isPending={createMut.isPending || updateMut.isPending}
          />
        </Panel>
      )}

      <div className="routine-view-tabs">
        {([['followups', `Follow-ups due (${dueContacts.length})`], ['all', `All (${allContacts.length})`]] as const).map(([tab, label]) => (
          <button
            key={tab}
            className={`routine-view-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {displayContacts.length === 0 ? (
        <EmptyState
          title={activeTab === 'followups' ? 'No follow-ups due' : 'No contacts yet'}
          body={activeTab === 'followups'
            ? 'Add follow-up dates to contacts and overdue ones will appear here.'
            : 'Add your first contact to start tracking relationships.'
          }
        />
      ) : (
        <div className="contacts-grid">
          {displayContacts.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={setEditing}
              onLogContact={id => logContactMut.mutate(id)}
              onDelete={id => deleteMut.mutate(id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
