import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listAttachments, createAttachment, deleteAttachment } from '../../lib/api'
import type { Attachment } from '../../lib/types'

const ATTACH_ICONS: Record<Attachment['type'], string> = {
  url: '🔗',
  file: '📎',
  snippet: '📝',
}

export function AttachmentsSection({ nodeId }: { nodeId: string }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [aType, setAType] = useState<Attachment['type']>('url')
  const [aTitle, setATitle] = useState('')
  const [aUrl, setAUrl] = useState('')
  const [aContent, setAContent] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: ['attachments', nodeId],
    queryFn: () => listAttachments(Number(nodeId)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAttachment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', nodeId] }),
  })

  async function handleAdd() {
    if (!aTitle.trim()) return
    setSaving(true)
    await createAttachment({
      node: Number(nodeId),
      type: aType,
      title: aTitle.trim(),
      url: aUrl.trim(),
      content: aContent.trim(),
    })
    await qc.invalidateQueries({ queryKey: ['attachments', nodeId] })
    setATitle('')
    setAUrl('')
    setAContent('')
    setShowForm(false)
    setSaving(false)
  }

  return (
    <div className="sp-attachments">
      <p className="sp-attachments-title">Attachments</p>

      {attachments.length > 0 && (
        <ul className="sp-attachment-list">
          {attachments.map(a => (
            <li key={a.id} className="sp-attachment-item">
              <span className="sp-attachment-icon">{ATTACH_ICONS[a.type]}</span>
              {a.type === 'url' ? (
                <a className="sp-attachment-link" href={a.url} target="_blank" rel="noreferrer" title={a.url}>
                  {a.title}
                </a>
              ) : (
                <span className="sp-attachment-link" title={a.content}>{a.title}</span>
              )}
              <button
                className="sp-attachment-delete"
                onClick={() => deleteMut.mutate(a.id)}
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <div className="sp-add-attachment-form">
          <div className="sp-attachment-type-row">
            {(['url', 'file', 'snippet'] as Attachment['type'][]).map(t => (
              <button
                key={t}
                className={`sp-attachment-type-btn ${aType === t ? 'active' : ''}`}
                onClick={() => setAType(t)}
              >
                {ATTACH_ICONS[t]} {t}
              </button>
            ))}
          </div>

          <input
            className="form-input"
            placeholder="Title"
            value={aTitle}
            onChange={e => setATitle(e.target.value)}
          />

          {aType === 'url' && (
            <input
              className="form-input"
              placeholder="https://…"
              value={aUrl}
              onChange={e => setAUrl(e.target.value)}
            />
          )}

          {aType === 'snippet' && (
            <textarea
              className="form-input"
              rows={3}
              placeholder="Text snippet…"
              value={aContent}
              onChange={e => setAContent(e.target.value)}
            />
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" style={{ fontSize: 14 }} onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn-primary" style={{ fontSize: 14 }} disabled={saving || !aTitle.trim()} onClick={handleAdd}>
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost-sm" style={{ fontSize: 14 }} onClick={() => setShowForm(true)}>
          + Add attachment
        </button>
      )}
    </div>
  )
}
