import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FinanceEntryForm } from '../components/FinanceEntryForm'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { StatusPill } from '../components/StatusPill'
import { createFinanceEntry, getFinanceSummary, listFinanceEntries } from '../lib/api'
import { formatCurrency, formatPercent } from '../lib/formatters'
import type { FinanceEntryPayload } from '../lib/types'

export function FinancePage() {
  const queryClient = useQueryClient()
  const summaryQuery = useQuery({
    queryKey: ['finance-summary'],
    queryFn: getFinanceSummary,
  })
  const entriesQuery = useQuery({
    queryKey: ['finance-entries'],
    queryFn: listFinanceEntries,
  })

  const createEntryMutation = useMutation({
    mutationFn: (payload: FinanceEntryPayload) => createFinanceEntry(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finance-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['command-center'] }),
      ])
    },
  })

  if (summaryQuery.isLoading || entriesQuery.isLoading) {
    return <section className="loading-state">Loading finance view...</section>
  }

  if (summaryQuery.isError || entriesQuery.isError || !summaryQuery.data || !entriesQuery.data) {
    return <section className="error-state">We could not load finance data.</section>
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Finance</p>
          <h2>Money movement and independence progress</h2>
          <p>Track the current month, recent entries, and the Kyrgyzstan trigger.</p>
        </div>
        <StatusPill label={`${formatPercent(summaryQuery.data.kyrgyzstan_progress_pct)} to target`} />
      </div>

      <div className="metric-grid">
        <MetricCard label="Income" value={formatCurrency(summaryQuery.data.total_income_eur)} />
        <MetricCard label="Expenses" value={formatCurrency(summaryQuery.data.total_expense_eur)} />
        <MetricCard
          label="Independent income"
          value={formatCurrency(summaryQuery.data.independent_income_eur)}
          tone="success"
        />
        <MetricCard
          label="Months to target"
          value={`${summaryQuery.data.months_to_target ?? '-'}`}
          hint="Based on the 3-month rolling average"
          tone="warning"
        />
      </div>

      <div className="two-column">
        <Panel title="Add a finance entry" description="A fast way to log income or expenses.">
          <FinanceEntryForm
            isSubmitting={createEntryMutation.isPending}
            onSubmit={(payload) => createEntryMutation.mutate(payload)}
          />
        </Panel>

        <Panel title="Recent entries" description="Latest items from the finance ledger.">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Currency</th>
                  <th>Amount (EUR)</th>
                </tr>
              </thead>
              <tbody>
                {entriesQuery.data.results.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.source}</td>
                    <td>{entry.type}</td>
                    <td>{entry.currency}</td>
                    <td>{formatCurrency(entry.amount_eur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </section>
  )
}
