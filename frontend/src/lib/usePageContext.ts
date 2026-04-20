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
    domain: 'Goals & Life Plan',
    placeholder: "Ask about your goal hierarchy, blockers, relationships, or how to restructure the life plan...",
    contextHint: '[Context: Goals and life plan page]',
  },
  '/work': {
    domain: 'Work & Career',
    placeholder: 'Ask about deadlines, proposals, pipeline pressure, or what work to prioritize...',
    contextHint: '[Context: Work and career page]',
  },
  '/finance': {
    domain: 'Finance',
    placeholder: 'Ask about your financial situation, income target, gaps, or progress...',
    contextHint: '[Context: Finance page]',
  },
  '/health': {
    domain: 'Health & Body',
    placeholder: 'Ask about capacity, mood patterns, habits, or spiritual consistency...',
    contextHint: '[Context: Health and body page]',
  },
  '/analytics': {
    domain: 'Analytics',
    placeholder: 'Ask about cross-domain patterns, weekly review insights...',
    contextHint: '[Context: Analytics page]',
  },
  '/timeline': {
    domain: 'Achievements & Timeline',
    placeholder: 'Ask about your week, wins, retrospectives, or review patterns...',
    contextHint: '[Context: Achievements and timeline page]',
  },
  '/ideas': {
    domain: 'Ideas & Thinking',
    placeholder: 'Think out loud, explore ideas, challenge a decision, or reason through a problem...',
    contextHint: '[Context: Ideas and thinking page]',
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
