import { useLocation } from 'react-router-dom'

export type PageContext = {
  domain: string
  placeholder: string
  contextHint: string
}

const PAGE_MAP: Record<string, PageContext> = {
  '/': {
    domain: 'Command Center',
    placeholder: 'Log something, capture a task, or ask what matters most today...',
    contextHint: '[Context: Command Center page]',
  },
  '/goals': {
    domain: 'Goals',
    placeholder: "Ask about your goal hierarchy, what's blocking you, how to restructure...",
    contextHint: '[Context: Goals page]',
  },
  '/finance': {
    domain: 'Finance',
    placeholder: 'Ask about your financial situation, Kyrgyzstan timeline, income gaps...',
    contextHint: '[Context: Finance page]',
  },
  '/health': {
    domain: 'Health',
    placeholder: 'Ask about sleep patterns, energy trends, health correlations...',
    contextHint: '[Context: Health page]',
  },
  '/habits': {
    domain: 'Habits',
    placeholder: 'Ask about habit patterns, correlations with energy...',
    contextHint: '[Context: Habits page]',
  },
  '/mood': {
    domain: 'Mood',
    placeholder: "Talk about how you're feeling, detect patterns...",
    contextHint: '[Context: Mood page]',
  },
  '/spiritual': {
    domain: 'Spiritual',
    placeholder: 'Reflect spiritually, connect faith to your goals...',
    contextHint: '[Context: Spiritual page]',
  },
  '/schedule': {
    domain: 'Schedule',
    placeholder: "Ask about today's schedule, time allocation, energy management...",
    contextHint: '[Context: Schedule page]',
  },
  '/pipeline': {
    domain: 'Pipeline',
    placeholder: 'Draft a proposal, analyze client fit, strategize your pipeline...',
    contextHint: '[Context: Pipeline page]',
  },
  '/marketing': {
    domain: 'Marketing',
    placeholder: 'Track marketing actions, plan outreach strategy...',
    contextHint: '[Context: Marketing page]',
  },
  '/analytics': {
    domain: 'Analytics',
    placeholder: 'Ask about cross-domain patterns, weekly review insights...',
    contextHint: '[Context: Analytics page]',
  },
  '/timeline': {
    domain: 'Timeline',
    placeholder: 'Ask about your week, debrief a day, prepare for tomorrow...',
    contextHint: '[Context: Timeline page]',
  },
  '/ideas': {
    domain: 'Ideas',
    placeholder: 'Think out loud, explore ideas...',
    contextHint: '[Context: Ideas page]',
  },
  '/decisions': {
    domain: 'Decisions',
    placeholder: 'Record decisions, stress-test reasoning...',
    contextHint: '[Context: Decisions page]',
  },
  '/achievements': {
    domain: 'Achievements',
    placeholder: 'Reflect on achievements...',
    contextHint: '[Context: Achievements page]',
  },
  '/learning': {
    domain: 'Learning',
    placeholder: 'Discuss learning, connect to goals...',
    contextHint: '[Context: Learning page]',
  },
  '/family': {
    domain: 'Family',
    placeholder: 'Talk about family goals...',
    contextHint: '[Context: Family page]',
  },
  '/relationships': {
    domain: 'Relationships',
    placeholder: 'Ask about your network...',
    contextHint: '[Context: Relationships page]',
  },
}

const DEFAULT_CONTEXT: PageContext = {
  domain: 'General',
  placeholder: 'Log sleep, mark habits, ask anything...',
  contextHint: '',
}

export function usePageContext(): PageContext {
  const { pathname } = useLocation()
  return PAGE_MAP[pathname] ?? DEFAULT_CONTEXT
}
