import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DayScoreBadge } from '../components/DayScoreBadge'
import { EmptyState } from '../components/EmptyState'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { getTimeline, sendChatMessage } from '../lib/api'
import { formatDate } from '../lib/formatters'

function startOfWeekIso(referenceDate = new Date()) {
  const date = new Date(referenceDate)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date.toISOString().slice(0, 10)
}

function shiftWeek(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function TimelinePage() {
  const [weekStart, setWeekStart] = useState(startOfWeekIso())
  const timelineQuery = useQuery({
    queryKey: ['timeline', weekStart],
    queryFn: () => getTimeline(weekStart),
  })

  const selectedDefault = useMemo(() => {
    if (!timelineQuery.data) {
      return null
    }
    return (
      timelineQuery.data.days.find((day) => day.is_today)?.date
      ?? timelineQuery.data.days[0]?.date
      ?? null
    )
  }, [timelineQuery.data])

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [aiDayNotes, setAiDayNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    setSelectedDate(selectedDefault)
  }, [selectedDefault])

  const dayAnalysisMutation = useMutation({
    mutationFn: (date: string) => {
      const day = timelineQuery.data?.days.find((d) => d.date === date)
      const isFuture = day?.is_future
      const detailSummary = day?.detail_rows
        .map((r) => `${r.domain}: ${r.label} = ${r.value}`)
        .join('; ') || 'no data logged'
      const prompt = isFuture
        ? `[Context: Timeline - ${date}] Give me a short AI preparation note for ${date}. What should I focus on? What should I prepare? Based on my active goals and current situation. 3-4 sentences.`
        : `[Context: Timeline - ${date}] Give me a short honest debrief of ${date}. Detail: ${detailSummary}. Score: ${day?.score ?? 0}/100. What went well? What didn't? 3-4 sentences.`
      return sendChatMessage([{ role: 'user', content: prompt }]).then((r) => ({
        date,
        reply: r.reply,
      }))
    },
    onSuccess: ({ date, reply }) => {
      setAiDayNotes((prev) => ({ ...prev, [date]: reply }))
    },
  })

  if (timelineQuery.isLoading) {
    return <section className="loading-state">Loading timeline...</section>
  }

  if (timelineQuery.isError || !timelineQuery.data) {
    return <section className="error-state">We could not load the timeline.</section>
  }

  const timeline = timelineQuery.data
  const selectedDay = timeline.days.find((day) => day.date === selectedDate) ?? timeline.days[0]
  const activeDays = timeline.days.filter((day) => day.score > 0).length

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Timeline</p>
          <h2>Week rhythm and daily debriefs</h2>
          <p>Move day by day, then inspect the detail and deterministic AI note for each one.</p>
        </div>
        <div className="button-row">
          <button className="button-muted" type="button" onClick={() => setWeekStart(shiftWeek(weekStart, -7))}>
            Previous week
          </button>
          <button className="button-muted" type="button" onClick={() => setWeekStart(startOfWeekIso())}>
            Current week
          </button>
          <button className="button-muted" type="button" onClick={() => setWeekStart(shiftWeek(weekStart, 7))}>
            Next week
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard label="Week start" value={formatDate(timeline.week_start)} />
        <MetricCard label="Week end" value={formatDate(timeline.week_end)} />
        <MetricCard label="Days with signal" value={`${activeDays} / ${timeline.days.length}`} />
        <MetricCard label="Selected score" value={`${selectedDay?.score ?? 0}`} tone="success" />
      </div>

      <Panel title="Week strip" description="Select a day to inspect the debrief or preparation note.">
        <div className="timeline-strip">
          {timeline.days.map((day) => (
            <button
              key={day.date}
              className={day.date === selectedDay?.date ? 'timeline-day active' : 'timeline-day'}
              type="button"
              onClick={() => setSelectedDate(day.date)}
            >
              <strong>{formatDate(day.date)}</strong>
              <DayScoreBadge score={day.score} />
              <div className="timeline-indicators" aria-hidden="true">
                {Object.entries(day.indicators).map(([key, value]) => (
                  <span key={key} className={value ? 'timeline-indicator on' : 'timeline-indicator'} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="two-column">
        <Panel
          title={selectedDay?.is_future ? 'Prepare this day' : 'Debrief this day'}
          description={selectedDay ? formatDate(selectedDay.date) : 'No day selected'}
          aside={
            selectedDay ? (
              <button
                disabled={dayAnalysisMutation.isPending}
                type="button"
                onClick={() => dayAnalysisMutation.mutate(selectedDay.date)}
              >
                {dayAnalysisMutation.isPending
                  ? 'Analyzing...'
                  : selectedDay.is_future
                    ? 'AI prepare'
                    : 'AI debrief'}
              </button>
            ) : null
          }
        >
          {selectedDay ? (
            <div className="stack">
              <div className="callout">
                <p className="eyebrow">{selectedDay.is_future ? 'Prepare' : 'Debrief'}</p>
                <h3>{selectedDay.ai_note}</h3>
              </div>
              {aiDayNotes[selectedDay.date] && (
                <div className="callout">
                  <p className="eyebrow">AI {selectedDay.is_future ? 'preparation' : 'analysis'}</p>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{aiDayNotes[selectedDay.date]}</p>
                </div>
              )}
              <div className="summary-strip">
                <div>
                  <strong>{selectedDay.score}</strong>
                  <p className="muted">Daily score</p>
                </div>
                <div>
                  <strong>{selectedDay.is_today ? 'Yes' : 'No'}</strong>
                  <p className="muted">Today</p>
                </div>
                <div>
                  <strong>{selectedDay.is_future ? 'Future' : 'Past / current'}</strong>
                  <p className="muted">Mode</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="No day selected" body="Pick a day from the week strip to inspect it." />
          )}
        </Panel>

        <Panel title="Day detail" description="Signals captured across health, work, finance, and reflection.">
          {!selectedDay || selectedDay.detail_rows.length === 0 ? (
            <EmptyState
              title="No captured detail"
              body="This day is still quiet. As logs land across domains, the timeline will fill in."
            />
          ) : (
            <ul className="record-list">
              {selectedDay.detail_rows.map((row) => (
                <li key={`${selectedDay.date}-${row.domain}-${row.label}`} className="record-card">
                  <div className="record-card-header">
                    <div>
                      <h3>{row.label}</h3>
                      <div className="list-inline">
                        <span className="record-meta-chip">{row.domain}</span>
                      </div>
                    </div>
                  </div>
                  <p className="muted">{row.value}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  )
}
