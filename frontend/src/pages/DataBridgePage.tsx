import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { BridgeDomain, BridgeFormat, ImportDomain, ImportPreview } from '../lib/api'
import { confirmImport, exportDomain, previewImport } from '../lib/api'
import '../styles/bridge.css'

// ── Domain definitions ─────────────────────────────────────────────────────────

const EXPORT_DOMAINS: { id: BridgeDomain; label: string; icon: string; hint: string }[] = [
  { id: 'goals',    label: 'Goals & Nodes', icon: '◎',  hint: 'All goals, projects, tasks and their connections' },
  { id: 'pipeline', label: 'Pipeline',      icon: '📋', hint: 'Opportunities, clients, marketing actions' },
  { id: 'finance',  label: 'Finance',       icon: '€',  hint: 'Income & expense entries' },
  { id: 'health',   label: 'Health',        icon: '♡',  hint: 'Health logs, habits, mood, spiritual' },
  { id: 'learning', label: 'Learning',      icon: '📚', hint: 'Books, courses, articles being tracked' },
  { id: 'journal',  label: 'Journal',       icon: '📓', hint: 'Recent journal entries' },
  { id: 'ideas',    label: 'Ideas',         icon: '💡', hint: 'All ideas by status (raw, exploring, validated)' },
  { id: 'contacts', label: 'Contacts',      icon: '👥', hint: 'All contacts with relation, company, email' },
  { id: 'all',      label: 'Everything',    icon: '⬡',  hint: 'Full export — all domains as JSON' },
]

const IMPORT_SCHEMAS: Record<ImportDomain, { label: string; description: string; example: string; supportsUpdate?: boolean }> = {
  goals: {
    label: 'Goals & Tasks',
    description: 'Each item creates a new goal node. Enable "Update existing" to append notes to matching goals.',
    supportsUpdate: true,
    example: JSON.stringify([
      { title: 'Write Sandton case study', type: 'task', notes: 'For portfolio page', category: 'Career' },
      { title: 'Set up LinkedIn outreach sequence', type: 'project', status: 'active' },
    ], null, 2),
  },
  pipeline: {
    label: 'Pipeline Opportunities',
    description: 'Each item creates a new opportunity (skips duplicates by name + platform).',
    example: JSON.stringify([
      { name: 'Logistics startup audit', platform: 'linkedin', description: 'Small logistics startup in Berlin' },
      { name: 'E-commerce ops review', platform: 'upwork', budget: '$300' },
    ], null, 2),
  },
  learning: {
    label: 'Learning Items',
    description: 'Each item adds a book/course/article (skips duplicates by title).',
    example: JSON.stringify([
      { title: 'Deep Work', type: 'book', author: 'Cal Newport' },
      { title: 'The E-Myth Revisited', type: 'book', author: 'Michael Gerber', notes: 'For service business model' },
    ], null, 2),
  },
  finance: {
    label: 'Finance Entries',
    description: 'Each item adds an income or expense entry. No deduplication — each entry is always created.',
    example: JSON.stringify([
      { type: 'expense', amount: 150, source: 'Office supplies', category: 'Business', currency: 'EGP', date: '2026-04-14' },
      { type: 'income', amount: 300, source: 'Sandton Taxis — invoice', currency: 'EUR', date: '2026-04-14' },
    ], null, 2),
  },
  ideas: {
    label: 'Ideas',
    description: 'Each item adds a new idea to the Ideas list (skips duplicates by title).',
    example: JSON.stringify([
      { title: 'Offer a "Process Audit in 48h" express service', context: 'For clients who need fast results', status: 'raw' },
      { title: 'Build a reusable reporting template library', context: 'Sell to multiple clients', status: 'exploring' },
    ], null, 2),
  },
  contacts: {
    label: 'Contacts',
    description: 'Each item adds a new contact (skips duplicates by name).',
    example: JSON.stringify([
      { name: 'Ahmed Khalil', relation: 'prospect', company: 'Cairo Logistics', email: 'ahmed@example.com', notes: 'Met at conference' },
      { name: 'Sara Hassan', relation: 'client', phone: '+20 100 000 0000' },
    ], null, 2),
  },
  journal: {
    label: 'Journal Entries',
    description: 'Each item adds a journal entry for a specific date (skips if that date already has an entry).',
    example: JSON.stringify([
      { date: '2026-04-14', gratitude: 'Good progress on the system', wins: 'Finished the AI Bridge', tomorrow_focus: 'Outreach call to Ahmed' },
    ], null, 2),
  },
  habits: {
    label: 'Habits',
    description: 'Each item adds a new habit to track (skips duplicates by name).',
    example: JSON.stringify([
      { name: 'Evening walk', target: 'daily' },
      { name: 'Read 10 pages', target: '3x_week' },
      { name: 'Weekly planning session', target: 'weekly' },
    ], null, 2),
  },
}

// ── Export Panel ───────────────────────────────────────────────────────────────

function ExportPanel() {
  const [domain, setDomain] = useState<BridgeDomain>('goals')
  const [fmt, setFmt] = useState<BridgeFormat>('markdown')
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const exportMut = useMutation({
    mutationFn: () => exportDomain(domain, fmt),
    onSuccess: (text) => {
      setResult(text)
      setCopied(false)
    },
  })

  function copyToClipboard() {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const selectedDomain = EXPORT_DOMAINS.find(d => d.id === domain)!

  return (
    <div className="bridge-panel">
      <div className="bridge-panel-header">
        <h3>📤 Export for AI</h3>
        <p className="muted">Choose a domain, then copy the output into Claude, ChatGPT, or any AI chat.</p>
      </div>

      {/* Domain selector */}
      <div className="bridge-domain-grid">
        {EXPORT_DOMAINS.map(d => (
          <button
            key={d.id}
            type="button"
            className={`bridge-domain-btn${domain === d.id ? ' active' : ''}`}
            onClick={() => { setDomain(d.id); setResult(null) }}
          >
            <span className="bridge-domain-icon">{d.icon}</span>
            <span className="bridge-domain-label">{d.label}</span>
          </button>
        ))}
      </div>

      <p className="bridge-domain-hint">{selectedDomain.hint}</p>

      {/* Format toggle */}
      <div className="bridge-format-row">
        <span className="bridge-format-label">Format:</span>
        <div className="bridge-format-btns">
          <button
            type="button"
            className={`bridge-format-btn${fmt === 'markdown' ? ' active' : ''}`}
            onClick={() => { setFmt('markdown'); setResult(null) }}
          >
            Markdown <span className="muted" style={{ fontSize: 11 }}>(best for AI chat)</span>
          </button>
          <button
            type="button"
            className={`bridge-format-btn${fmt === 'json' ? ' active' : ''}`}
            onClick={() => { setFmt('json'); setResult(null) }}
          >
            JSON <span className="muted" style={{ fontSize: 11 }}>(structured)</span>
          </button>
        </div>
      </div>

      <div className="bridge-export-actions">
        <button
          type="button"
          onClick={() => exportMut.mutate()}
          disabled={exportMut.isPending}
        >
          {exportMut.isPending ? 'Loading…' : `Export ${selectedDomain.label}`}
        </button>
      </div>

      {exportMut.isError && (
        <p className="bridge-error">Export failed. Is the backend running?</p>
      )}

      {result && (
        <div className="bridge-result">
          <div className="bridge-result-toolbar">
            <span className="muted" style={{ fontSize: 13 }}>
              {result.length.toLocaleString()} characters · ready to paste
            </span>
            <button type="button" className="button-muted" onClick={copyToClipboard}>
              {copied ? '✓ Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <textarea
            className="bridge-result-text"
            readOnly
            value={result}
            rows={20}
          />
        </div>
      )}
    </div>
  )
}

// ── Import Panel ───────────────────────────────────────────────────────────────

function ImportPanel() {
  const [domain, setDomain] = useState<ImportDomain>('goals')
  const [rawJson, setRawJson] = useState('')
  const [showExample, setShowExample] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [updateExisting, setUpdateExisting] = useState(false)

  const schema = IMPORT_SCHEMAS[domain]

  function parseJson(): unknown[] | null {
    setParseError(null)
    try {
      const parsed = JSON.parse(rawJson.trim())
      if (!Array.isArray(parsed)) {
        setParseError('Expected a JSON array [ ... ]')
        return null
      }
      return parsed
    } catch (e) {
      setParseError(`Invalid JSON: ${(e as Error).message}`)
      return null
    }
  }

  const previewMut = useMutation({
    mutationFn: () => {
      const data = parseJson()
      if (!data) throw new Error('Parse error')
      return previewImport(domain, data, updateExisting)
    },
    onSuccess: (result) => {
      setPreview(result)
      setDone(false)
    },
  })

  const confirmMut = useMutation({
    mutationFn: () => {
      const data = parseJson()
      if (!data) throw new Error('Parse error')
      return confirmImport(domain, data, updateExisting)
    },
    onSuccess: () => {
      setDone(true)
      setPreview(null)
      setRawJson('')
    },
  })

  function handleDomainChange(d: ImportDomain) {
    setDomain(d)
    setPreview(null)
    setDone(false)
    setParseError(null)
    setShowExample(false)
    setUpdateExisting(false)
  }

  return (
    <div className="bridge-panel">
      <div className="bridge-panel-header">
        <h3>📥 Import from AI</h3>
        <p className="muted">Paste the JSON your AI generated, preview what will be created, then confirm.</p>
      </div>

      {/* Domain selector */}
      <div className="bridge-import-domain-row">
        {(Object.keys(IMPORT_SCHEMAS) as ImportDomain[]).map(d => (
          <button
            key={d}
            type="button"
            className={`bridge-domain-btn${domain === d ? ' active' : ''}`}
            onClick={() => handleDomainChange(d)}
          >
            {IMPORT_SCHEMAS[d].label}
          </button>
        ))}
      </div>

      <p className="bridge-domain-hint">{schema.description}
        {schema.supportsUpdate && (
          <label className="bridge-update-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 12, cursor: 'pointer', fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={e => setUpdateExisting(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Update existing
          </label>
        )}
      </p>

      {/* Example toggle */}
      <div className="bridge-example-row">
        <button
          type="button"
          className="button-ghost"
          style={{ fontSize: 13, padding: '3px 10px' }}
          onClick={() => setShowExample(v => !v)}
        >
          {showExample ? 'Hide example' : 'Show expected format'}
        </button>
        {showExample && (
          <button
            type="button"
            className="button-muted"
            style={{ fontSize: 13, padding: '3px 10px' }}
            onClick={() => { setRawJson(schema.example); setShowExample(false) }}
          >
            Use example
          </button>
        )}
      </div>

      {showExample && (
        <pre className="bridge-example-code">{schema.example}</pre>
      )}

      {/* JSON textarea */}
      <div className="bridge-import-field">
        <label className="bridge-import-label">Paste JSON array here:</label>
        <textarea
          className="bridge-import-text"
          rows={10}
          value={rawJson}
          onChange={e => { setRawJson(e.target.value); setPreview(null); setParseError(null); setDone(false) }}
          placeholder={`[\n  { "title": "...", "type": "task" }\n]`}
        />
      </div>

      {parseError && <p className="bridge-error">{parseError}</p>}

      {/* Preview button */}
      <div className="bridge-export-actions">
        <button
          type="button"
          onClick={() => previewMut.mutate()}
          disabled={!rawJson.trim() || previewMut.isPending}
        >
          {previewMut.isPending ? 'Checking…' : 'Preview Import'}
        </button>
      </div>

      {previewMut.isError && !parseError && (
        <p className="bridge-error">Preview failed. Check your JSON format.</p>
      )}

      {/* Preview table */}
      {preview && (
        <div className="bridge-preview">
          <div className="bridge-preview-header">
            <strong>Preview</strong>
            <span className="bridge-preview-counts">
              <span className="bridge-count-create">{preview.created} to create</span>
              {(preview.updated ?? 0) > 0 && (
                <span className="bridge-count-update">{preview.updated} to update</span>
              )}
              <span className="bridge-count-skip">{preview.skipped} to skip</span>
              {preview.errors.length > 0 && (
                <span className="bridge-count-error">{preview.errors.length} errors</span>
              )}
            </span>
          </div>

          <table className="bridge-preview-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {preview.preview.map((row, i) => (
                <tr key={i} className={`bridge-row-${row.action}`}>
                  <td>{row.name}</td>
                  <td>{row.type || '—'}</td>
                  <td>
                    {row.action === 'create'
                      ? <span className="bridge-badge-create">+ Create</span>
                      : row.action === 'update'
                        ? <span className="bridge-badge-update">↻ Update {row.changes ? `(${row.changes})` : ''}</span>
                        : <span className="bridge-badge-skip">Skip {row.reason ? `(${row.reason})` : ''}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {preview.errors.length > 0 && (
            <div className="bridge-errors-list">
              <strong>Errors ({preview.errors.length}):</strong>
              {preview.errors.map((e, i) => (
                <p key={i} className="bridge-error" style={{ margin: '4px 0' }}>{e.error}</p>
              ))}
            </div>
          )}

          {(preview.created > 0 || (preview.updated ?? 0) > 0) && (
            <div className="bridge-confirm-row">
              <button
                type="button"
                className="bridge-confirm-btn"
                onClick={() => confirmMut.mutate()}
                disabled={confirmMut.isPending}
              >
                {confirmMut.isPending
                  ? 'Importing…'
                  : (() => {
                      const parts = []
                      if (preview.created > 0) parts.push(`Create ${preview.created}`)
                      if ((preview.updated ?? 0) > 0) parts.push(`Update ${preview.updated}`)
                      return `✓ Confirm — ${parts.join(' + ')} record${(preview.created + (preview.updated ?? 0)) !== 1 ? 's' : ''}`
                    })()
                }
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="bridge-success">
          ✓ Import complete! Records created and available in the app.
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DataBridgePage() {
  const [tab, setTab] = useState<'export' | 'import'>('export')

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">AI Data Bridge</p>
          <h2>Export &amp; Import</h2>
          <p className="muted">
            Take your data into an AI conversation, generate plans, then push the results back in.
          </p>
        </div>
      </div>

      <div className="bridge-tabs">
        <button
          type="button"
          className={`bridge-tab${tab === 'export' ? ' active' : ''}`}
          onClick={() => setTab('export')}
        >
          📤 Export for AI
        </button>
        <button
          type="button"
          className={`bridge-tab${tab === 'import' ? ' active' : ''}`}
          onClick={() => setTab('import')}
        >
          📥 Import from AI
        </button>
      </div>

      {tab === 'export' ? <ExportPanel /> : <ImportPanel />}
    </section>
  )
}
