import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { HealthLog, WorkoutSession } from '../../lib/types'
import { LatestWorkoutVisualizationCard } from './LatestWorkoutVisualizationCard'

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    date: '2026-04-11',
    title: 'Evening session',
    session_type: 'strength',
    duration_mins: 32,
    notes: '',
    health_log: null,
    created_at: '2026-04-11T18:30:00Z',
    exercises: [
      {
        id: 'exercise-1',
        session: 'session-1',
        name: 'Bench Press',
        category: 'compound',
        order: 0,
        notes: '',
        primary_muscle: 'chest',
        secondary_muscles: ['shoulders', 'triceps'],
        sets: [
          { id: 'set-1', exercise: 'exercise-1', set_number: 1, reps: 10, weight_kg: '60', duration_secs: null, distance_km: null, notes: '' },
          { id: 'set-2', exercise: 'exercise-1', set_number: 2, reps: 8, weight_kg: '65', duration_secs: null, distance_km: null, notes: '' },
          { id: 'set-3', exercise: 'exercise-1', set_number: 3, reps: 6, weight_kg: '70', duration_secs: null, distance_km: null, notes: '' },
        ],
      },
      {
        id: 'exercise-2',
        session: 'session-1',
        name: 'Lat Pulldown',
        category: 'compound',
        order: 1,
        notes: '',
        primary_muscle: 'back',
        secondary_muscles: ['biceps'],
        sets: [
          { id: 'set-4', exercise: 'exercise-2', set_number: 1, reps: 12, weight_kg: '45', duration_secs: null, distance_km: null, notes: '' },
          { id: 'set-5', exercise: 'exercise-2', set_number: 2, reps: 12, weight_kg: '50', duration_secs: null, distance_km: null, notes: '' },
        ],
      },
    ],
    ...overrides,
  }
}

function makeBodyLog(index: number, overrides: Partial<HealthLog> = {}): HealthLog {
  const day = String(16 - index).padStart(2, '0')
  return {
    id: `log-${index}`,
    date: `2026-04-${day}`,
    sleep_hours: index % 2 === 0 ? '7.5' : '6.8',
    sleep_quality: 4,
    energy_level: index % 3 === 0 ? 5 : 4,
    exercise_done: index % 2 === 0,
    exercise_type: index % 2 === 0 ? 'Gym' : '',
    exercise_duration_mins: index % 2 === 0 ? 45 : null,
    weight_kg: index < 6 ? `${78 - index * 0.3}` : null,
    nutrition_notes: '',
    ...overrides,
  }
}

describe('LatestWorkoutVisualizationCard', () => {
  test('shows body logs by default and allows range filters', () => {
    const bodyLogs = Array.from({ length: 10 }, (_, index) => makeBodyLog(index))

    render(<LatestWorkoutVisualizationCard sessions={[makeSession()]} bodyLogs={bodyLogs} />)

    expect(screen.getByRole('heading', { name: /last 7 body entries/i })).toBeInTheDocument()
    expect(screen.getByText(/showing 7 logs in this view/i)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('range-14'))

    expect(screen.getByRole('heading', { name: /last 14 body entries/i })).toBeInTheDocument()
    expect(screen.getByText(/showing 10 logs in this view/i)).toBeInTheDocument()
  })

  test('shows an empty body-log state when no data is available', () => {
    render(<LatestWorkoutVisualizationCard sessions={[]} bodyLogs={[]} />)

    expect(screen.getByText(/no body logs yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open today/i })).toHaveAttribute('href', '#body-log-panel')
  })

  test('falls back to body-log exercise entries in the workouts tab', () => {
    render(<LatestWorkoutVisualizationCard sessions={[]} bodyLogs={[makeBodyLog(0, { exercise_type: 'Gym strength: lat pulldown and shoulder press' })]} />)

    fireEvent.click(screen.getByTestId('mode-workouts'))

    expect(screen.getByText('From body logs')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /last 7 workout entries/i })).toBeInTheDocument()
    expect(screen.getByText(/exercise entries derived from body logs/i)).toBeInTheDocument()
  })

  test('switches to workouts, sorts newest session, and prioritizes primary muscle hits', () => {
    const olderSession = makeSession({
      id: 'session-older',
      date: '2026-04-07',
      title: 'Older session',
      created_at: '2026-04-07T08:00:00Z',
      duration_mins: 20,
      exercises: [],
    })

    const latestSession = makeSession({
      id: 'session-latest',
      date: '2026-04-11',
      title: 'Evening session',
      created_at: '2026-04-11T20:27:00Z',
      exercises: [
        {
          id: 'exercise-a',
          session: 'session-latest',
          name: 'Bench Press',
          category: 'compound',
          order: 0,
          notes: '',
          primary_muscle: 'chest',
          secondary_muscles: ['shoulders'],
          sets: [
            { id: 'set-a1', exercise: 'exercise-a', set_number: 1, reps: 10, weight_kg: '60', duration_secs: null, distance_km: null, notes: '' },
            { id: 'set-a2', exercise: 'exercise-a', set_number: 2, reps: 10, weight_kg: '60', duration_secs: null, distance_km: null, notes: '' },
          ],
        },
        {
          id: 'exercise-b',
          session: 'session-latest',
          name: 'Shoulder Press',
          category: 'compound',
          order: 1,
          notes: '',
          primary_muscle: 'shoulders',
          secondary_muscles: ['triceps'],
          sets: [
            { id: 'set-b1', exercise: 'exercise-b', set_number: 1, reps: 8, weight_kg: '28', duration_secs: null, distance_km: null, notes: '' },
          ],
        },
      ],
    })

    render(<LatestWorkoutVisualizationCard sessions={[olderSession, latestSession]} bodyLogs={[makeBodyLog(0)]} />)

    fireEvent.click(screen.getByTestId('mode-workouts'))

    expect(screen.getByText(/evening session/i)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('region-front-shoulders'))
    expect(screen.getByText(/1 set contributed/i)).toBeInTheDocument()
    expect(screen.getByText('52 min')).toBeInTheDocument()
  })

  test('toggles the workout breakdown and lists exercise chips', () => {
    render(<LatestWorkoutVisualizationCard sessions={[makeSession()]} bodyLogs={[]} />)

    fireEvent.click(screen.getByTestId('mode-workouts'))
    fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))

    expect(screen.getByText(/most trained muscles/i)).toBeInTheDocument()
    expect(screen.getByText(/exercise breakdown/i)).toBeInTheDocument()
    expect(screen.getByText(/bench press/i)).toBeInTheDocument()
    expect(screen.getByText(/primary - chest/i)).toBeInTheDocument()
    expect(screen.getByText(/secondary - shoulders/i)).toBeInTheDocument()
  })
})
