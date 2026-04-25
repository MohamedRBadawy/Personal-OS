import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { vi } from 'vitest'
import { renderWithProviders } from '../../test/test-utils'
import { IntelligenceSurface } from './IntelligenceSurface'
import { listDueDecisions, updateReviewCommitment } from '../../lib/api'
import type { CommandCenterPayload, CommandCenterPriorityItem } from '../../lib/types'

vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  listDueDecisions: vi.fn(),
  updateReviewCommitment: vi.fn(),
}))

function priority(overrides: Partial<CommandCenterPriorityItem>): CommandCenterPriorityItem {
  return {
    id: 'item-1',
    code: null,
    title: 'Default priority',
    type: 'task',
    category: 'Work',
    status: 'available',
    parent: null,
    parent_title: null,
    notes: '',
    deps: [],
    blocked_by_titles: [],
    ancestor_titles: [],
    progress_pct: 0,
    due_date: null,
    manual_priority: null,
    dependency_unblock_count: 0,
    recommended_tool: 'Codex',
    tool_reasoning: 'Use the coding workspace.',
    is_overdue: false,
    due_in_days: null,
    ...overrides,
  }
}

const cc = {
  date: '2026-04-04',
  key_signals: ['Independent income work is still highest leverage.'],
  overwhelm: {
    date: '2026-04-04',
    overwhelm_score: 2,
    reduced_mode: true,
    max_priorities: 3,
    burnout_risk: false,
    signals: ['Too many active commitments.'],
  },
  priorities: [
    priority({ id: 'top', title: 'Ship the synthesis surface', status: 'active', dependency_unblock_count: 2 }),
    priority({ id: 'ready', title: 'Write outreach follow-up', status: 'available', recommended_tool: 'Claude' }),
    priority({ id: 'blocked', title: 'Launch offer page', status: 'blocked', blocked_by_titles: ['Finish case study', 'Choose price'] }),
    priority({ id: 'done', title: 'Archived cleanup', status: 'done' }),
  ],
  health_today: {
    summary: {
      avg_sleep_7d: 7,
      avg_energy_7d: 3,
      avg_sleep_30d: 7.2,
      avg_mood_7d: 3,
      avg_mood_30d: 3.1,
      avg_quran_7d: 2,
      exercise_streak: 2,
      full_prayer_streak: 1,
      habit_completion_rate_7d: 60,
      habit_completion_rate_30d: 58,
      prayer_completion_rate_7d: 72,
      dhikr_completion_rate_7d: 43,
      spiritual_consistency_7d: 57,
      low_energy_today: false,
      low_sleep_today: false,
      low_mood_today: false,
      low_mood_streak: 0,
      prayer_gap_streak: 0,
      health_logged_today: false,
      mood_logged_today: false,
      spiritual_logged_today: false,
      active_habits_count: 2,
      habits_completed_today: 0,
    },
  },
  finance: {
    summary: {
      month: '2026-04-01',
      total_income_eur: 700,
      total_expense_eur: 100,
      independent_income_eur: 250,
      net_eur: 600,
      kyrgyzstan_progress_pct: 25,
      months_to_target: 3,
      target_eur: '1000.00',
      eur_to_usd_rate: '1.08',
      eur_to_egp_rate: '33.5',
    },
    recent_entries: [],
  },
  status_cards: [
    { id: 'goals', label: 'Goals', value: 2, total: 5, status: 'attention', detail: 'Two priorities still open.', route: '/goals' },
  ],
} as unknown as CommandCenterPayload

describe('IntelligenceSurface', () => {
  test('answers the four home questions from the command-center payload', () => {
    vi.mocked(listDueDecisions).mockResolvedValue([])
    renderWithProviders(<IntelligenceSurface cc={cc} />)

    expect(screen.getByRole('button', { name: /what matters most/i })).toBeInTheDocument()
    expect(screen.getByText(/ship the synthesis surface/i)).toBeInTheDocument()
    expect(screen.getByText(/reduced mode is on/i)).toBeInTheDocument()

    const readyPanel = screen.getByTestId('intelligence-q2')
    expect(within(readyPanel).getByText(/write outreach follow-up/i)).toBeInTheDocument()
    expect(within(readyPanel).queryByText(/launch offer page/i)).not.toBeInTheDocument()
    expect(within(readyPanel).queryByText(/archived cleanup/i)).not.toBeInTheDocument()

    const blockersPanel = screen.getByTestId('intelligence-q3')
    expect(within(blockersPanel).getByText(/launch offer page/i)).toBeInTheDocument()
    expect(within(blockersPanel).getByText(/finish case study/i)).toBeInTheDocument()
    expect(within(blockersPanel).getByText(/choose price/i)).toBeInTheDocument()

    const trendPanel = screen.getByTestId('intelligence-q4')
    expect(within(trendPanel).getByText(/sleep 7d/i)).toBeInTheDocument()
    expect(within(trendPanel).getByText(/7h/i)).toBeInTheDocument()
    expect(within(trendPanel).getByText(/kyrgyzstan/i)).toBeInTheDocument()
    expect(within(trendPanel).getByText(/25%/i)).toBeInTheDocument()
    expect(within(trendPanel).getByText(/independent income work is still highest leverage/i)).toBeInTheDocument()
    expect(within(trendPanel).getByText(/goals/i)).toBeInTheDocument()
  })

  test('lets prior commitments be marked from the Q4 panel', async () => {
    vi.mocked(listDueDecisions).mockResolvedValue([])
    vi.mocked(updateReviewCommitment).mockResolvedValue({
      id: 'commitment-1',
      review: 'review-1',
      action_type: 'stop',
      description: 'Stop opening new side quests before outreach is done.',
      node_update: null,
      node_update_title: null,
      checked_in_review: null,
      was_kept: true,
      created_at: '2026-04-04T00:00:00Z',
    })
    const user = userEvent.setup()

    renderWithProviders(
      <IntelligenceSurface
        cc={{
          ...cc,
          prior_commitments_due: [
            {
              id: 'commitment-1',
              action_type: 'stop',
              description: 'Stop opening new side quests before outreach is done.',
              from_week: '2026-03-30',
            },
          ],
        }}
      />,
    )

    const trendPanel = screen.getByTestId('intelligence-q4')
    expect(within(trendPanel).getByText(/did you keep this/i)).toBeInTheDocument()

    await user.click(within(trendPanel).getByRole('button', { name: /yes/i }))

    expect(updateReviewCommitment).toHaveBeenCalledWith('commitment-1', { was_kept: true })
    await waitFor(() => {
      expect(within(trendPanel).queryByText(/stop opening new side quests/i)).not.toBeInTheDocument()
    })
  })
})
