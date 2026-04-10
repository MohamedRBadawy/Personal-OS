export type FinanceEntryType = 'income' | 'expense'
export type CurrencyCode = 'EUR' | 'USD' | 'EGP'

export type FinanceEntry = {
  id: string
  type: FinanceEntryType
  source: string
  amount: string
  amount_eur: number
  amount_egp: number
  currency: CurrencyCode
  category: string
  is_independent: boolean
  is_recurring: boolean
  date: string
  notes: string
}

export type FinanceEntryPayload = {
  type: FinanceEntryType
  source: string
  amount: string
  currency: CurrencyCode
  category?: string
  is_independent: boolean
  is_recurring: boolean
  date: string
  notes: string
}

export type FinanceSummary = {
  month: string
  total_income_eur: number
  total_expense_eur: number
  independent_income_eur: number
  net_eur: number
  kyrgyzstan_progress_pct: number
  months_to_target: number | null
  target_eur: string
  eur_to_usd_rate: string
  eur_to_egp_rate: string
}

export type IncomeSource = {
  id: string
  name: string
  category: string
  monthly_target_eur: string
  baseline_amount_eur: string | null
  active: boolean
  notes: string
}

export type IncomeSourcePayload = {
  name: string
  category: string
  monthly_target_eur: string
  baseline_amount_eur: string | null
  active: boolean
  notes: string
}

export type FinanceOverviewIncomeSource = IncomeSource & {
  realized_this_month_eur: number
  progress_pct: number
}

export type FinanceOverviewPayload = {
  date: string
  summary: FinanceSummary
  monthly_summary: {
    month: string
    income_entry_count: number
    expense_entry_count: number
    recurring_income_eur: number
    recurring_expense_eur: number
  }
  target_tracking: {
    independent_income_eur: number
    target_eur: string
    progress_pct: number
    months_to_target: number | null
    active_income_sources: number
  }
  income_sources: FinanceOverviewIncomeSource[]
  recent_entries: FinanceEntry[]
}

export type FinanceSummaryV2 = {
  id: number
  income_eur: number
  income_egp_direct: number
  income_sources_text: string
  independent_monthly: number
  target_independent: number
  monthly_expenses_egp: number
  notes: string
  debts: Array<{ name: string; amount_egp: number }>
  savings_target_egp: number
  savings_current_egp: number
  monthly_budget_egp: number | null
  category_budgets: Record<string, number>
  surplus_egp: number
  income_egp: number
  exchange_rate: number
  updated_at: string
}

export type IncomeEvent = {
  id: number
  date: string
  source: string
  amount_eur: number
  notes: string
  created_at: string
}

export type MonthlyChartPoint = {
  month: string       // "2026-04"
  label: string       // "Apr 2026"
  income_eur: number
  expense_eur: number
  independent_eur: number
  net_eur: number
}

export type CategoryBreakdownItem = {
  category: string
  label: string
  total_egp: number
  total_eur: number
  count: number
}

export type RecurringChecklistItem = {
  source: string
  type: string
  category: string
  amount: string
  currency: string
  amount_egp: number
  logged_this_month: boolean
}

export type CheckInFinanceDelta = {
  type: FinanceEntryType
  source: string
  amount: string
  currency: CurrencyCode
  is_independent: boolean
}
