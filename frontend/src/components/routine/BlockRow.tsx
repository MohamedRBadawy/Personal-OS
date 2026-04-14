import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BlockStreakStatus, RoutineBlock, RoutineLogEntry } from '../../lib/types'
import { STATUS_LABELS } from './constants'
import { fmtDuration, blockEndTime, todayStr } from './helpers'
import { BlockContext } from './BlockContext'
import { BlockNotesHistory } from './BlockNotesHistory'
import { updateRoutineBlock } from '../../lib/api'
import { MealBlockLinker } from './MealBlockLinker'

const STREAK_DOT_COLORS: Record<NonNullable<BlockStreakStatus>, string> = {
  done: 'var(--success)',
  partial: '#22c55e99',
  late: 'var(--warning)',
  skipped: 'var(--danger)',
}

// ── Subtype visual identity ───────────────────────────────────────────────────

type BlockSubtypeIcon = Record<string, string>

const SUBTYPE_ICONS: BlockSubtypeIcon = {
  prayer:   '🕌',
  quran:    '📖',
  adhkar:   '🤲',
  sleep:    '😴',
  exercise: '💪',
  meal:     '🍽️',
  hygiene:  '🚿',
  reading:  '📚',
  rest:     '☕',
  work:     '💼',
  family:   '👨‍👧',
  personal: '●',
}

const SUBTYPE_BORDER: BlockSubtypeIcon = {
  prayer:   '#7c3aed',
  quran:    '#7c3aed',
  adhkar:   '#8b5cf6',
  sleep:    '#64748b',
  exercise: '#16a34a',
  meal:     '#ea580c',
  hygiene:  '#0ea5e9',
  reading:  '#6366f1',
  rest:     '#0d9488',
  work:     '#2563eb',
  family:   '#d97706',
  personal: '#9ca3af',
}

type SaveEntry = {
  block_time: string
  status: string
  actual_time?: string
  actual_duration_minutes?: number | null
  note?: string
  prayed_in_mosque?: boolean | null
  first_row?: boolean | null
  takbirat_al_ihram?: boolean | null
  prayed_sunnah?: boolean | null
  morning_adhkar?: boolean | null
  evening_adhkar?: boolean | null
}

interface BlockRowProps {
  block: RoutineBlock
  log: RoutineLogEntry | undefined
  onSave: (entry: SaveEntry) => void
  onEdit: () => void
  streakDots?: BlockStreakStatus[]
  streak?: number
  isCurrent?: boolean
  defaultExpanded?: boolean
  /** Minutes the schedule is off vs planned (positive = running late) */
  drift?: number
}

// ── Sub-type detection ────────────────────────────────────────────────────────

type BlockSubtype =
  | 'prayer' | 'quran' | 'adhkar'
  | 'sleep' | 'exercise'
  | 'meal' | 'hygiene' | 'reading' | 'rest'
  | 'work' | 'family' | 'personal'

// Prayer blocks are identified by having a location set OR by a recognisable label.
// This makes all 5 daily prayers show prayer-specific UI even if location is unset.
const PRAYER_LABEL_KEYWORDS = ['fajr', 'dhuhr', 'zuhr', 'asr', 'maghrib', 'isha', 'prayer', 'salah', 'salat', 'subh']

function getPrayerName(label: string): 'fajr' | 'asr' | null {
  const l = label.toLowerCase()
  if (l.includes('fajr') || l.includes('subh')) return 'fajr'
  if (l.includes('asr')) return 'asr'
  return null
}

function getBlockSubtype(block: RoutineBlock): BlockSubtype {
  const lbl = block.label.toLowerCase()
  // Spiritual — prayer detected by location OR by recognisable prayer name in label
  const isPrayerByLabel = PRAYER_LABEL_KEYWORDS.some(p => lbl.includes(p))
  if (block.type === 'spiritual' && (Boolean(block.location) || isPrayerByLabel)) return 'prayer'
  if (block.type === 'spiritual' && lbl.includes('quran')) return 'quran'
  if (block.type === 'spiritual') return 'adhkar'
  // Health
  if (block.type === 'health' && lbl.includes('sleep')) return 'sleep'
  if (block.type === 'health') return 'exercise'
  // Work
  if (block.type === 'work') return 'work'
  // Family
  if (block.type === 'family') return 'family'
  // Personal sub-types
  if (block.type === 'personal') {
    if (lbl.includes('breakfast') || lbl.includes('lunch') || lbl.includes('dinner') || lbl.includes('meal')) return 'meal'
    if (lbl.includes('shower') || lbl.includes('prep') || lbl.includes('wash') || lbl.includes('hygiene')) return 'hygiene'
    if (lbl.includes('read')) return 'reading'
    if (lbl.includes('rest') || lbl.includes('nap')) return 'rest'
  }
  return 'personal'
}

// ── Note parsing — pre-fill structured fields from saved note ─────────────────

function parseSleepNote(note: string) {
  const hours = note.match(/Slept: ([\d.]+)h/)?.[1] ?? ''
  const quality = Number(note.match(/Quality: (\d)/)?.[1] ?? '0')
  return { hours, quality }
}

function parseExerciseNote(note: string) {
  const duration = note.match(/^(\d+)min/)?.[1] ?? ''
  const raw = note.match(/· (low|med|medium|high)/)?.[1] ?? ''
  const intensity = raw === 'med' ? 'medium' : raw as '' | 'low' | 'medium' | 'high'
  return { duration, intensity }
}

function parseQuranNote(note: string) { return note.match(/Quran: (\d+)p/)?.[1] ?? '' }
function parseFamilyNote(note: string) { return note.match(/Family: (\w+)/)?.[1] ?? '' }
function parseMealNote(note: string)   { return note.match(/Meal: (.+?)($| —)/)?.[1] ?? '' }
function parseRestNote(note: string)   { return note.match(/Rest: (.+?)($| —)/)?.[1] ?? '' }
function parseReadNote(note: string) {
  const pages = note.match(/Read: (\d+)p/)?.[1] ?? ''
  const topic = note.match(/· (.+?)($| —)/)?.[1] ?? ''
  return { pages, topic }
}

// ── Note composition ──────────────────────────────────────────────────────────

function composeNote(subtype: BlockSubtype, structured: Record<string, unknown>, freeText: string): string {
  let prefix = ''
  if (subtype === 'sleep') {
    const { hours, quality } = structured as { hours: string; quality: number }
    if (hours || quality) prefix = `Slept: ${hours || '?'}h · Quality: ${quality || '?'}/5`
  } else if (subtype === 'exercise') {
    const { duration, intensity } = structured as { duration: string; intensity: string }
    const parts = [duration && `${duration}min`, intensity].filter(Boolean)
    if (parts.length) prefix = parts.join(' · ')
  } else if (subtype === 'quran') {
    const { pages } = structured as { pages: string }
    if (pages) prefix = `Quran: ${pages}p`
  } else if (subtype === 'adhkar') {
    prefix = `Adhkar: ${(structured as { done: boolean }).done ? 'done' : 'skipped'}`
  } else if (subtype === 'family') {
    const { quality } = structured as { quality: string }
    if (quality) prefix = `Family: ${quality}`
  } else if (subtype === 'meal') {
    const { quality } = structured as { quality: string }
    if (quality) prefix = `Meal: ${quality}`
  } else if (subtype === 'rest') {
    const { quality } = structured as { quality: string }
    if (quality) prefix = `Rest: ${quality}`
  } else if (subtype === 'hygiene') {
    prefix = (structured as { done: boolean }).done ? 'Done' : 'Skipped'
  } else if (subtype === 'reading') {
    const { pages, topic } = structured as { pages: string; topic: string }
    const parts = [pages && `Read: ${pages}p`, topic && `· ${topic}`].filter(Boolean)
    if (parts.length) prefix = parts.join(' ')
  } else if (subtype === 'work') {
    const { delivered, deliverable } = structured as { delivered: boolean; deliverable: string }
    if (delivered && deliverable) prefix = `✓ Delivered: ${deliverable}`
  }
  if (prefix && freeText) return `${prefix} — ${freeText}`
  return prefix || freeText
}

function hasTypeSpecificData(subtype: BlockSubtype, structured: Record<string, unknown>): boolean {
  if (subtype === 'sleep') {
    const { hours, quality } = structured as { hours: string; quality: number }
    return Boolean(hours || quality)
  }
  if (subtype === 'exercise') {
    const { duration, intensity } = structured as { duration: string; intensity: string }
    return Boolean(duration || intensity)
  }
  if (subtype === 'quran')   return Boolean((structured as { pages: string }).pages)
  if (subtype === 'adhkar')  return true
  if (subtype === 'hygiene') return true
  if (subtype === 'family')  return Boolean((structured as { quality: string }).quality)
  if (subtype === 'meal')    return Boolean((structured as { quality: string }).quality)
  if (subtype === 'rest')    return Boolean((structured as { quality: string }).quality)
  if (subtype === 'reading') return Boolean((structured as { pages: string }).pages)
  return false
}

// ── Adjusted time helper ──────────────────────────────────────────────────────

function addMinutesToTime(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

// ── Collapsed summary chips — shown after logging ─────────────────────────────

type SummaryChip = { text: string; variant?: 'done' | 'warn' | 'skip' | 'low' | 'medium' | 'high' | 'info' }

function getLogSummaryBadges(
  subtype: string,
  log: RoutineLogEntry | undefined,
): SummaryChip[] {
  if (!log) return []
  const n = log.note ?? ''

  switch (subtype) {
    case 'prayer': {
      const chips: SummaryChip[] = []
      if (log.prayed_in_mosque  === true) chips.push({ text: '🕌 Masjid',         variant: 'done' })
      if (log.first_row         === true) chips.push({ text: '1st row',           variant: 'done' })
      if (log.takbirat_al_ihram === true) chips.push({ text: 'Takbir',            variant: 'done' })
      if (log.prayed_sunnah     === true) chips.push({ text: 'Sunnah',            variant: 'done' })
      if (log.morning_adhkar    === true) chips.push({ text: '🤲 Morning Adhkar', variant: 'done' })
      if (log.evening_adhkar    === true) chips.push({ text: '🌙 Evening Adhkar', variant: 'done' })
      return chips
    }
    case 'sleep': {
      const { hours, quality } = parseSleepNote(n)
      const chips: SummaryChip[] = []
      if (hours)   chips.push({ text: `${hours}h`,    variant: 'info' })
      if (quality) chips.push({ text: `Q${quality}/5`, variant: quality >= 4 ? 'done' : quality >= 3 ? 'warn' : 'skip' })
      return chips
    }
    case 'exercise': {
      const { duration, intensity } = parseExerciseNote(n)
      const chips: SummaryChip[] = []
      if (duration)  chips.push({ text: `${duration}min`, variant: 'info' })
      if (intensity) chips.push({ text: intensity, variant: intensity as 'low' | 'medium' | 'high' })
      return chips
    }
    case 'quran': {
      const pages = parseQuranNote(n)
      return pages ? [{ text: `${pages}p`, variant: 'info' }] : []
    }
    case 'adhkar':
      return n.includes('Adhkar: done')
        ? [{ text: 'adhkar ✓',  variant: 'done' }]
        : n.includes('Adhkar:') ? [{ text: 'skipped', variant: 'skip' }] : []
    case 'meal': {
      const q = parseMealNote(n)
      if (!q) return []
      return [{ text: q, variant: q === 'as planned' ? 'done' : q === 'modified' ? 'warn' : 'skip' }]
    }
    case 'family': {
      const q = parseFamilyNote(n)
      if (!q) return []
      return [{ text: q, variant: (q === 'great' || q === 'good') ? 'done' : q === 'rushed' ? 'warn' : 'skip' }]
    }
    case 'reading': {
      const { pages, topic } = parseReadNote(n)
      const chips: SummaryChip[] = []
      if (pages) chips.push({ text: `${pages}p`, variant: 'info' })
      if (topic) chips.push({ text: topic })
      return chips
    }
    case 'rest': {
      const q = parseRestNote(n)
      if (!q) return []
      return [{ text: q, variant: q === 'rested well' ? 'done' : q === 'light rest' ? 'warn' : 'skip' }]
    }
    case 'hygiene':
      if (!n) return []
      return n.startsWith('Done')
        ? [{ text: '✓ done', variant: 'done' }]
        : [{ text: 'skipped', variant: 'skip' }]
    case 'work': {
      if (n.startsWith('✓ Delivered:')) {
        const item = n.split(' — ')[0].replace('✓ Delivered: ', '')
        return [{ text: `✓ ${item}`, variant: 'done' }]
      }
      return []
    }
    default:
      return []
  }
}

// ── Timer helpers ─────────────────────────────────────────────────────────────

function formatTimer(secs: number): string {
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
}

// ── BlockRow ──────────────────────────────────────────────────────────────────

function inferSlot(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('breakfast')) return 'breakfast'
  if (l.includes('lunch'))     return 'lunch'
  if (l.includes('dinner'))    return 'dinner'
  return 'snack'
}

export function BlockRow({
  block, log, onSave, onEdit,
  streakDots, streak, isCurrent, defaultExpanded,
  drift: _drift = 0,
}: BlockRowProps) {
  const qc = useQueryClient()
  const subtype = getBlockSubtype(block)
  const endTime = blockEndTime(block)
  const startTime = block.time_str || block.time.slice(0, 5)

  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const [status, setStatus] = useState(log?.status || '')
  const [actualTime, setActualTime] = useState(log?.actual_time || new Date().toTimeString().slice(0, 5))
  const [spentMins, setSpentMins] = useState<string>(
    log?.actual_duration_minutes != null ? String(log.actual_duration_minutes) : ''
  )
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Duration editor state
  const [editingDuration, setEditingDuration] = useState(false)
  const [editDuration, setEditDuration] = useState(String(block.duration_minutes ?? 30))

  // Timer state
  const [timerActive, setTimerActive] = useState(false)
  const [timerSecs, setTimerSecs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerStartedAt = useRef<number | null>(null)

  // Post-log quick time-adjust state (Fix 4)
  const [justLogged, setJustLogged] = useState(false)
  const [justLoggedTime, setJustLoggedTime] = useState('')
  const justLoggedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Duration mutation
  const durationMut = useMutation({
    mutationFn: (mins: number) => updateRoutineBlock(block.id, { duration_minutes: mins }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine-blocks'] })
      setEditingDuration(false)
    },
  })

  function startTimer() {
    setTimerSecs(0)
    setTimerActive(true)
    timerStartedAt.current = Date.now()
    timerRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000)
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerActive(false)
    const mins = Math.ceil(timerSecs / 60)
    if (mins > 0) setEditDuration(String(mins))
  }

  // Stop timer and immediately log the block (Fix 5)
  function stopAndLog() {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerActive(false)
    const mins = Math.ceil(timerSecs / 60)
    const startedAt = timerStartedAt.current
    const actualT = startedAt
      ? (() => {
          const d = new Date(startedAt)
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        })()
      : new Date().toTimeString().slice(0, 5)
    setStatus('done')
    onSave({
      block_time: block.time,
      status: 'done',
      actual_time: actualT,
      actual_duration_minutes: mins || undefined,
    })
    triggerJustLogged(actualT)
  }

  // Trigger the 4-second post-log adjust widget (Fix 4)
  function triggerJustLogged(time: string) {
    if (justLoggedTimer.current) clearTimeout(justLoggedTimer.current)
    setJustLoggedTime(time)
    setJustLogged(true)
    justLoggedTimer.current = setTimeout(() => setJustLogged(false), 4000)
  }

  // Shift the logged actual_time by delta minutes (Fix 4)
  function shiftActualTime(delta: number) {
    const base = justLoggedTime || new Date().toTimeString().slice(0, 5)
    const newTime = addMinutesToTime(base, delta)
    setJustLoggedTime(newTime)
    onSave({ block_time: block.time, status: log?.status ?? 'done', actual_time: newTime })
    // Reset the auto-hide timer
    if (justLoggedTimer.current) clearTimeout(justLoggedTimer.current)
    justLoggedTimer.current = setTimeout(() => setJustLogged(false), 4000)
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (justLoggedTimer.current) clearTimeout(justLoggedTimer.current)
    }
  }, [])

  function closeDurationEditor() {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerActive(false)
    setEditingDuration(false)
  }

  // Prayer state
  const [prayedInMosque,  setPrayedInMosque]  = useState<boolean | null>(log?.prayed_in_mosque  ?? null)
  const [firstRow,        setFirstRow]        = useState<boolean | null>(log?.first_row         ?? null)
  const [takbiratAlIhram, setTakbiratAlIhram] = useState<boolean | null>(log?.takbirat_al_ihram ?? null)
  const [prayedSunnah,    setPrayedSunnah]    = useState<boolean | null>(log?.prayed_sunnah     ?? null)
  const [morningAdhkar,   setMorningAdhkar]   = useState<boolean | null>(log?.morning_adhkar    ?? null)
  const [eveningAdhkar,   setEveningAdhkar]   = useState<boolean | null>(log?.evening_adhkar    ?? null)

  // Sleep state (pre-filled from note)
  const sleepParsed = parseSleepNote(log?.note ?? '')
  const [sleepHours,   setSleepHours]   = useState(sleepParsed.hours)
  const [sleepQuality, setSleepQuality] = useState(sleepParsed.quality)

  // Exercise state
  const exParsed = parseExerciseNote(log?.note ?? '')
  const [exerciseDuration, setExerciseDuration] = useState(exParsed.duration)
  const [exerciseIntensity, setExerciseIntensity] = useState<'' | 'low' | 'medium' | 'high'>(
    exParsed.intensity || (block.intensity as '' | 'low' | 'medium' | 'high') || ''
  )

  // Quran state
  const [quranPages, setQuranPages] = useState(parseQuranNote(log?.note ?? ''))

  // Adhkar state
  const [adhkarDone, setAdhkarDone] = useState(log?.note?.includes('Adhkar: done') ?? false)

  // Hygiene state (reuses same done/skipped concept, separate variable)
  const [hygieneDone, setHygieneDone] = useState(
    log?.note ? !log.note.includes('Skipped') : false
  )

  // Family state
  const [familyQuality, setFamilyQuality] = useState(parseFamilyNote(log?.note ?? ''))

  // Meal state
  const [mealQuality, setMealQuality] = useState(parseMealNote(log?.note ?? ''))

  // Rest state
  const [restQuality, setRestQuality] = useState(parseRestNote(log?.note ?? ''))

  // Reading state
  const readParsed = parseReadNote(log?.note ?? '')
  const [readPages, setReadPages] = useState(readParsed.pages)
  const [readTopic, setReadTopic] = useState(readParsed.topic)

  // Work state
  const [workDelivered, setWorkDelivered] = useState(log?.note?.startsWith('✓ Delivered:') ?? false)

  // ── Task breakdown: multiple tasks within this block's duration ──────────
  // Stored in note as "30m Task A · 20m Task B [— free text]"
  const [taskItems, setTaskItems] = useState<Array<{ name: string; mins: number }>>(() => {
    const raw = (log?.note ?? '').split(' — ')[0]
    const parts = raw.split(' · ').map(s => s.trim()).filter(Boolean)
    const parsed = parts.map(p => {
      const m = p.match(/^(\d+)m\s+(.+)$/)
      return m ? { mins: parseInt(m[1]), name: m[2] } : null
    })
    return parsed.length > 0 && parsed.every(Boolean)
      ? (parsed as Array<{ name: string; mins: number }>)
      : []
  })
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskMins, setNewTaskMins] = useState('')

  function addTaskItem() {
    const mins = parseInt(newTaskMins)
    if (!newTaskName.trim() || !mins) return
    setTaskItems(prev => [...prev, { name: newTaskName.trim(), mins }])
    setNewTaskName('')
    setNewTaskMins('')
  }

  const totalTaskMins = taskItems.reduce((s, t) => s + t.mins, 0)
  const blockDuration = block.duration_minutes ?? 30

  const isPrayerBlock = subtype === 'prayer'
  const prayerName = isPrayerBlock ? getPrayerName(block.label) : null

  function getStructured(): Record<string, unknown> {
    if (subtype === 'sleep')    return { hours: sleepHours, quality: sleepQuality }
    if (subtype === 'exercise') return { duration: exerciseDuration, intensity: exerciseIntensity }
    if (subtype === 'quran')    return { pages: quranPages }
    if (subtype === 'adhkar')   return { done: adhkarDone }
    if (subtype === 'hygiene')  return { done: hygieneDone }
    if (subtype === 'family')   return { quality: familyQuality }
    if (subtype === 'meal')     return { quality: mealQuality }
    if (subtype === 'rest')     return { quality: restQuality }
    if (subtype === 'reading')  return { pages: readPages, topic: readTopic }
    if (subtype === 'work')     return { delivered: workDelivered, deliverable: block.deliverable ?? '' }
    return {}
  }

  function doSave(overrideStatus?: string) {
    setSaving(true)
    const tasksText = taskItems.length > 0
      ? taskItems.map(t => `${t.mins}m ${t.name}`).join(' · ')
      : ''
    const typeNote = composeNote(subtype, getStructured(), note)
    const finalNote = [tasksText, typeNote].filter(Boolean).join(' — ')
    const savedStatus = overrideStatus ?? status ?? 'done'
    onSave({
      block_time: block.time,
      status: savedStatus,
      actual_time: actualTime || undefined,
      actual_duration_minutes: spentMins ? parseInt(spentMins) : undefined,
      note: finalNote || undefined,
    })
    setStatus(savedStatus)         // immediate local feedback
    setExpanded(false)             // collapse the panel after saving
    setSaving(false)
  }

  async function handleStatusClick(s: string) {
    const newStatus = status === s ? '' : s
    setStatus(newStatus)
    if (newStatus) doSave(newStatus)
  }

  function handlePrayerToggle(
    field: 'prayed_in_mosque' | 'first_row' | 'takbirat_al_ihram' | 'prayed_sunnah',
    current: boolean | null,
    setter: (v: boolean) => void,
  ) {
    const newVal = current !== true
    setter(newVal)
    onSave({ block_time: block.time, status: log?.status ?? status ?? 'done', [field]: newVal })
  }

  function toggleMorningAdhkar() {
    const v = morningAdhkar !== true
    setMorningAdhkar(v)
    onSave({ block_time: block.time, status: log?.status ?? status ?? 'done', morning_adhkar: v })
  }

  function toggleEveningAdhkar() {
    const v = eveningAdhkar !== true
    setEveningAdhkar(v)
    onSave({ block_time: block.time, status: log?.status ?? status ?? 'done', evening_adhkar: v })
  }

  // Quick-log from collapsed row (1 click)
  function handleQuickLog(e: React.MouseEvent, s: string) {
    e.stopPropagation()
    setStatus(s)
    const now = new Date().toTimeString().slice(0, 5)
    const entry: SaveEntry = { block_time: block.time, status: s, actual_time: now }
    // Prayer blocks: default to mosque=true (Fix 7)
    if (isPrayerBlock && s === 'done') {
      entry.prayed_in_mosque = true
    }
    onSave(entry)
    triggerJustLogged(now)
  }

  const structured = getStructured()
  const showSave = hasTypeSpecificData(subtype, structured) || Boolean(note) || Boolean(actualTime) || taskItems.length > 0

  // Minutes late: how much after scheduled start was the block actually logged (Fix 10)
  const minutesLate = log?.actual_time && log.status !== 'skipped'
    ? timeToMinutes(log.actual_time) - timeToMinutes(startTime)
    : 0

  // Collapsed summary chips — shown when logged
  const summaryChips = getLogSummaryBadges(subtype, log)

  return (
    <div
      className={`routine-row ${log?.status ? `logged-${log.status}` : ''} ${isCurrent ? 'block-current' : ''}`}
      data-type={block.type}
      data-subtype={subtype}
      data-block-id={block.id}
      style={{ borderLeftColor: SUBTYPE_BORDER[subtype] ?? 'transparent' }}
    >
      <div className="routine-row-main" onClick={() => setExpanded(p => !p)}>

        {/* ── Top row: identity info ──────────────────────────────────────── */}
        <div className="routine-row-top">
          {isCurrent && (
            <>
              <span className="block-now-chip">● NOW</span>
              {!log?.status && <span className="routine-kbd-hint" title="Keyboard: D=Done, S=Skip, P=Partial">⌨ D/S/P</span>}
            </>
          )}

          <span className="routine-time">
            {startTime}
            <span className="routine-time-sep"> – </span>
            <span className="routine-time-end">{endTime}</span>
          </span>

          <span className="routine-subtype-icon" aria-hidden="true">
            {SUBTYPE_ICONS[subtype] ?? '●'}
          </span>
          <span className="routine-label">{block.label}</span>

          {block.linked_node_title && (
            <span className="routine-goal-badge">
              🎯 {block.linked_node_title}
              {block.linked_node_progress != null && block.linked_node_progress > 0
                ? ` (${block.linked_node_progress}%)` : null}
            </span>
          )}

          {/* Type detail badges */}
          {block.type === 'spiritual' && block.location && (
            <span className="routine-detail-badge routine-detail-spiritual">
              {block.location === 'mosque' ? '🕌' : block.location === 'home' ? '🏠' : '💻'} {block.location}
            </span>
          )}
          {block.type === 'spiritual' && block.target && (
            <span className="routine-detail-badge routine-detail-spiritual">{block.target}</span>
          )}
          {block.type === 'health' && block.exercise_type && (
            <span className="routine-detail-badge routine-detail-health">{block.exercise_type}</span>
          )}
          {block.type === 'health' && block.intensity && (
            <span className={`routine-detail-badge intensity-${block.intensity}`}>{block.intensity}</span>
          )}
          {block.type === 'work' && block.focus_area && (
            <span className="routine-detail-badge routine-detail-work">
              {block.focus_area.replace('_', ' ')}
            </span>
          )}

          <span className="routine-expand-arrow">{expanded ? '▾' : '▸'}</span>
        </div>

        {/* ── Bottom row: metadata + quick actions ────────────────────────── */}
        <div className="routine-row-bottom">
          <div className="routine-row-bottom-meta">
            {/* Duration — clickable to edit */}
            {timerActive
              ? (
                <span
                  className="routine-dur-live-timer"
                  onClick={e => { e.stopPropagation(); stopTimer() }}
                  title="Click to stop timer"
                >
                  ⏱ {formatTimer(timerSecs)}
                </span>
              )
              : (
                <span
                  className="routine-duration"
                  onClick={e => { e.stopPropagation(); setEditingDuration(p => !p) }}
                  title="Click to edit duration"
                >
                  {fmtDuration(block.duration_minutes)}
                </span>
              )
            }

            {!block.is_fixed && <span className="routine-flex-tag">flex</span>}

            {/* Streak dots */}
            {streakDots && streakDots.length > 0 && (
              <span className="routine-streak-chain" title="Last 7 days">
                {streakDots.map((s, i) => (
                  <span
                    key={i}
                    className="routine-streak-dot"
                    style={{ background: s ? STREAK_DOT_COLORS[s] : 'var(--border)' }}
                    title={s ?? 'no log'}
                  />
                ))}
              </span>
            )}
            {streak !== undefined && streak > 0 && (
              <span className="routine-streak-badge">🔥{streak}</span>
            )}
          </div>

          {/* Status badge (logged) OR quick-log action area (unlogged)
              Use log?.status || status so the badge appears immediately on
              click without waiting for React Query to re-fetch. */}
          {(log?.status || status)
            ? (
              <div className="routine-logged-summary" onClick={e => e.stopPropagation()}>
                <span className={`routine-status-badge log-${log?.status || status}`}>
                  {(log?.actual_time || justLoggedTime)
                    ? `${log?.status || status} · ${log?.actual_time || justLoggedTime}`
                    : (log?.status || status)}
                  {minutesLate > 10 && (
                    <span className="routine-late-indicator"> +{minutesLate}m</span>
                  )}
                </span>
                {/* Type-specific summary chips */}
                {summaryChips.map((chip, i) => (
                  <span
                    key={i}
                    className={`routine-summary-chip${chip.variant ? ` chip-${chip.variant}` : ''}`}
                  >
                    {chip.text}
                  </span>
                ))}
              </div>
            )
            : (
              <div className="routine-ql-area" onClick={e => e.stopPropagation()}>
                {/* Large "Done now" primary button for the current (NOW) block */}
                {isCurrent && !timerActive && (
                  <button
                    className="routine-done-now-btn"
                    disabled={saving}
                    onClick={e => handleQuickLog(e, 'done')}
                  >
                    ✓ Done now
                  </button>
                )}
                {/* One-tap block timer */}
                {isCurrent && !timerActive && (
                  <button
                    className="routine-start-timer-btn"
                    onClick={e => { e.stopPropagation(); startTimer() }}
                    title="Start timer — click ⏹ Done when finished"
                  >
                    ▶ Start
                  </button>
                )}
                {timerActive && (
                  <>
                    <span className="routine-timer-display">{formatTimer(timerSecs)}</span>
                    <button
                      className="routine-stop-timer-btn"
                      onClick={e => { e.stopPropagation(); stopAndLog() }}
                    >
                      ⏹ Done
                    </button>
                  </>
                )}
                {/* Standard ✓ / ~ / ✗ quick-log buttons */}
                {!timerActive && (
                  <div className="routine-ql-btns">
                    <button className="routine-ql-btn ql-done"    disabled={saving} title="Done"    onClick={e => handleQuickLog(e, 'done')}>✓</button>
                    <button className="routine-ql-btn ql-partial" disabled={saving} title="Partial"  onClick={e => handleQuickLog(e, 'partial')}>~</button>
                    <button className="routine-ql-btn ql-skipped" disabled={saving} title="Skipped"  onClick={e => handleQuickLog(e, 'skipped')}>✗</button>
                  </div>
                )}
              </div>
            )
          }
        </div>

      </div>

      {/* ── Post-log time-adjust widget (Fix 4) — appears 4s after quick-log ── */}
      {justLogged && (
        <div className="routine-time-adjust-widget" onClick={e => e.stopPropagation()}>
          <span className="routine-time-adjust-label">Logged at {justLoggedTime}</span>
          <button className="routine-time-adj-btn" onClick={() => shiftActualTime(-10)}>−10m</button>
          <button className="routine-time-adj-btn" onClick={() => shiftActualTime(-5)}>−5m</button>
          <button className="routine-time-adj-btn" onClick={() => shiftActualTime(+5)}>+5m</button>
          <button className="routine-time-adj-close" onClick={() => setJustLogged(false)}>✓</button>
        </div>
      )}

      {/* ── Duration editor — shown inline, below header, above expand panel ── */}
      {editingDuration && (
        <div className="routine-dur-editor" onClick={e => e.stopPropagation()}>
          <button
            className="routine-dur-adj"
            onClick={() => setEditDuration(d => String(Math.max(5, Number(d) - 5)))}
          >−5</button>
          <input
            className="routine-dur-input"
            type="number" min="5" max="480"
            value={editDuration}
            onChange={e => setEditDuration(e.target.value)}
          />
          <span className="routine-dur-unit">min</span>
          <button
            className="routine-dur-adj"
            onClick={() => setEditDuration(d => String(Number(d) + 5))}
          >+5</button>

          <div className="routine-dur-sep" />

          {timerActive
            ? (
              <>
                <span className="routine-timer">{formatTimer(timerSecs)}</span>
                <button className="routine-dur-timer-btn timer-stop" onClick={stopTimer}>⏹ Stop</button>
              </>
            )
            : (
              <button className="routine-dur-timer-btn" onClick={startTimer}>⏱ Timer</button>
            )
          }

          <div className="routine-dur-sep" />

          <button
            className="routine-dur-save"
            disabled={durationMut.isPending}
            onClick={() => durationMut.mutate(parseInt(editDuration) || block.duration_minutes || 30)}
          >
            {durationMut.isPending ? '…' : '✓ Save'}
          </button>
          <button className="routine-dur-cancel" onClick={closeDurationEditor}>✕</button>
        </div>
      )}

      {expanded && (
        <div className="routine-log-panel" onClick={e => e.stopPropagation()}>

          <BlockContext block={block} onEdit={onEdit} />
          <BlockNotesHistory blockTime={block.time_str || block.time.slice(0, 5)} />

          {/* Status buttons */}
          <div className="routine-status-buttons">
            {STATUS_LABELS.map(s => (
              <button
                key={s.value}
                className={`routine-status-btn ${status === s.value ? 'active' : ''}`}
                disabled={saving}
                onClick={() => handleStatusClick(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* ── Prayer chips — always visible for prayer blocks ── */}
          {isPrayerBlock && (
            <div className="prayer-details">
              {([
                { key: 'prayed_in_mosque'  as const, label: 'Masjid',             val: prayedInMosque,  set: setPrayedInMosque  },
                { key: 'first_row'         as const, label: '1st row',            val: firstRow,         set: setFirstRow         },
                { key: 'takbirat_al_ihram' as const, label: 'Takbirat Al-Ihram',  val: takbiratAlIhram, set: setTakbiratAlIhram  },
                { key: 'prayed_sunnah'     as const, label: 'Sunnah',             val: prayedSunnah,    set: setPrayedSunnah     },
              ] as Array<{
                key: 'prayed_in_mosque' | 'first_row' | 'takbirat_al_ihram' | 'prayed_sunnah'
                label: string; val: boolean | null; set: (v: boolean) => void
              }>).map(({ key, label, val, set }) => (
                <button
                  key={key}
                  className={`prayer-chip${val === true ? ' prayer-chip--on' : ''}`}
                  onClick={() => handlePrayerToggle(key, val, set)}
                >
                  {val === true ? '✓' : '○'} {label}
                </button>
              ))}

              {/* Morning / Evening Adhkar — shown only on Fajr / Asr blocks */}
              {prayerName === 'fajr' && (
                <button
                  className={`prayer-chip${morningAdhkar === true ? ' prayer-chip--on' : ''}`}
                  onClick={toggleMorningAdhkar}
                >
                  {morningAdhkar === true ? '✓' : '○'} Morning Adhkar
                </button>
              )}
              {prayerName === 'asr' && (
                <button
                  className={`prayer-chip${eveningAdhkar === true ? ' prayer-chip--on' : ''}`}
                  onClick={toggleEveningAdhkar}
                >
                  {eveningAdhkar === true ? '✓' : '○'} Evening Adhkar
                </button>
              )}
            </div>
          )}

          {/* ── Sleep ── */}
          {subtype === 'sleep' && (
            <div className="btf-section">
              <p className="btf-label">How did you sleep?</p>
              <div className="btf-row">
                <div className="sp-field" style={{ flex: '0 0 140px' }}>
                  <label className="sp-label">Hours slept</label>
                  <input className="form-input" type="number" min="0" max="12" step="0.5"
                    placeholder="e.g. 7.5" value={sleepHours} onChange={e => setSleepHours(e.target.value)} />
                </div>
                <div className="sp-field" style={{ flex: 1 }}>
                  <label className="sp-label">Quality</label>
                  <div className="btf-pills">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} className={`btf-pill${sleepQuality === n ? ' btf-pill--active' : ''}`}
                        onClick={() => setSleepQuality(n)}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Exercise ── */}
          {subtype === 'exercise' && (
            <div className="btf-section">
              <p className="btf-label">Exercise log</p>
              <div className="btf-row">
                <div className="sp-field" style={{ flex: '0 0 130px' }}>
                  <label className="sp-label">Duration (min)</label>
                  <input className="form-input" type="number" min="0"
                    placeholder={String(block.duration_minutes ?? '')}
                    value={exerciseDuration} onChange={e => setExerciseDuration(e.target.value)} />
                </div>
                <div className="sp-field" style={{ flex: 1 }}>
                  <label className="sp-label">Intensity</label>
                  <div className="btf-pills">
                    {(['low', 'medium', 'high'] as const).map(lvl => (
                      <button key={lvl}
                        className={`btf-pill btf-pill--${lvl}${exerciseIntensity === lvl ? ' btf-pill--active' : ''}`}
                        onClick={() => setExerciseIntensity(lvl)}>{lvl}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Quran ── */}
          {subtype === 'quran' && (
            <div className="btf-section">
              <div className="sp-field" style={{ maxWidth: 200 }}>
                <label className="sp-label">Pages read today</label>
                <input className="form-input" type="number" min="0" max="604" placeholder="0"
                  value={quranPages} onChange={e => setQuranPages(e.target.value)} />
              </div>
            </div>
          )}

          {/* ── Adhkar ── */}
          {subtype === 'adhkar' && (
            <div className="btf-section">
              <div className="prayer-details">
                <button className={`prayer-chip${adhkarDone ? ' prayer-chip--on' : ''}`}
                  onClick={() => setAdhkarDone(p => !p)}>
                  {adhkarDone ? '✓' : '○'} Adhkar completed
                </button>
              </div>
            </div>
          )}

          {/* ── Meal ── */}
          {subtype === 'meal' && (
            <div className="btf-section">
              <p className="btf-label">Meal check</p>
              <div className="btf-pills">
                {[
                  { value: 'as planned', label: '✓ As planned' },
                  { value: 'modified',   label: '~ Modified'   },
                  { value: 'skipped',    label: '✗ Skipped'    },
                ].map(opt => (
                  <button key={opt.value}
                    className={`btf-pill${mealQuality === opt.value ? ' btf-pill--active' : ''}`}
                    onClick={() => setMealQuality(opt.value)}>{opt.label}</button>
                ))}
              </div>
              <MealBlockLinker date={todayStr()} slot={inferSlot(block.label)} />
            </div>
          )}

          {/* ── Hygiene / prep ── */}
          {subtype === 'hygiene' && (
            <div className="btf-section">
              <div className="prayer-details">
                <button
                  className={`prayer-chip${hygieneDone ? ' prayer-chip--on' : ''}`}
                  onClick={() => setHygieneDone(p => !p)}
                >
                  {hygieneDone ? '✓' : '○'} Done as planned
                </button>
              </div>
            </div>
          )}

          {/* ── Reading ── */}
          {subtype === 'reading' && (
            <div className="btf-section">
              <p className="btf-label">Reading log</p>
              <div className="btf-row">
                <div className="sp-field" style={{ flex: '0 0 140px' }}>
                  <label className="sp-label">Pages read</label>
                  <input className="form-input" type="number" min="0" placeholder="0"
                    value={readPages} onChange={e => setReadPages(e.target.value)} />
                </div>
                <div className="sp-field" style={{ flex: 1 }}>
                  <label className="sp-label">Book / topic</label>
                  <input className="form-input" type="text" placeholder="Optional"
                    value={readTopic} onChange={e => setReadTopic(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── Rest ── */}
          {subtype === 'rest' && (
            <div className="btf-section">
              <p className="btf-label">How was the rest?</p>
              <div className="btf-pills">
                {[
                  { value: 'rested well', label: '✓ Rested well' },
                  { value: 'light rest',  label: '~ Light rest'  },
                  { value: 'no rest',     label: '✗ No rest'     },
                ].map(opt => (
                  <button key={opt.value}
                    className={`btf-pill${restQuality === opt.value ? ' btf-pill--active' : ''}`}
                    onClick={() => setRestQuality(opt.value)}>{opt.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── Family ── */}
          {subtype === 'family' && (
            <div className="btf-section">
              <p className="btf-label">How was it?</p>
              <div className="btf-pills">
                {[
                  { value: 'great',   label: '🌟 Great'   },
                  { value: 'good',    label: '✓ Good'     },
                  { value: 'rushed',  label: '⚡ Rushed'  },
                  { value: 'skipped', label: '✗ Skipped'  },
                ].map(opt => (
                  <button key={opt.value}
                    className={`btf-pill${familyQuality === opt.value ? ' btf-pill--active' : ''}`}
                    onClick={() => setFamilyQuality(opt.value)}>{opt.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── Work deliverable toggle ── */}
          {subtype === 'work' && block.deliverable && (
            <div className="btf-section">
              <button
                className={`btf-deliverable-toggle${workDelivered ? ' btf-deliverable-toggle--done' : ''}`}
                onClick={() => setWorkDelivered(p => !p)}
              >
                <span>{workDelivered ? '✓' : '○'}</span>
                <span>Delivered: {block.deliverable}</span>
              </button>
            </div>
          )}

          {/* ── Task breakdown — log multiple tasks within this block ── */}
          {subtype !== 'prayer' && subtype !== 'sleep' && (
            <div className="btf-section block-tasks">
              <p className="btf-label">Tasks done in this block</p>

              {taskItems.map((t, i) => (
                <div key={i} className="block-task-item">
                  <span className="block-task-dur">{t.mins}m</span>
                  <span className="block-task-name">{t.name}</span>
                  <button
                    className="block-task-remove"
                    onClick={() => setTaskItems(prev => prev.filter((_, j) => j !== i))}
                    title="Remove"
                  >✕</button>
                </div>
              ))}

              <div className="block-task-add">
                <input
                  className="block-task-mins"
                  type="number" min="1" max="480"
                  placeholder="min"
                  value={newTaskMins}
                  onChange={e => setNewTaskMins(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTaskItem()}
                />
                <input
                  className="block-task-input"
                  type="text"
                  placeholder="What did you work on?"
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTaskItem()}
                />
                <button className="block-task-add-btn" onClick={addTaskItem}>+ Add</button>
              </div>

              {taskItems.length > 0 && (
                <div className="block-task-total">
                  <div className="block-task-bar-wrap">
                    <div
                      className="block-task-bar-fill"
                      style={{ width: `${Math.min(100, Math.round((totalTaskMins / blockDuration) * 100))}%` }}
                    />
                  </div>
                  <span className={totalTaskMins > blockDuration ? 'block-task-over' : ''}>
                    {totalTaskMins} / {blockDuration} min
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Common log fields ── */}
          <div className="routine-log-fields">
            <div className="sp-field">
              <label className="sp-label">Actual time</label>
              <input className="form-input" type="time" value={actualTime}
                onChange={e => setActualTime(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label">Time spent (min)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                max="480"
                placeholder="e.g. 30"
                value={spentMins}
                onChange={e => setSpentMins(e.target.value)}
                onBlur={() => {
                  if (spentMins !== String(log?.actual_duration_minutes ?? '')) doSave()
                }}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label">
                {subtype === 'work' ? 'Output — what did you produce?' : 'Notes'}
              </label>
              <textarea className="form-input" rows={2} value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={subtype === 'work' ? 'What did you actually produce or complete?' : 'Optional notes…'} />
            </div>
            {showSave && (
              <button className="btn-primary" style={{ alignSelf: 'flex-end' }}
                disabled={saving} onClick={() => doSave()}>
                Save
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
