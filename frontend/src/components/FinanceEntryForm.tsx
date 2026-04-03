import { useState } from 'react'
import type { FinanceEntryPayload } from '../lib/types'

type FinanceEntryFormProps = {
  onSubmit: (payload: FinanceEntryPayload) => void
  isSubmitting: boolean
}

export function FinanceEntryForm({ onSubmit, isSubmitting }: FinanceEntryFormProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'EGP'>('EUR')
  const [date, setDate] = useState(today)
  const [isIndependent, setIsIndependent] = useState(true)
  const [isRecurring, setIsRecurring] = useState(false)
  const [notes, setNotes] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({
      type,
      source,
      amount,
      currency,
      date,
      is_independent: isIndependent,
      is_recurring: isRecurring,
      notes,
    })
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="entry-type">Type</label>
        <select id="entry-type" value={type} onChange={(event) => setType(event.target.value as 'income' | 'expense')}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="entry-date">Date</label>
        <input id="entry-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      <div className="field span-2">
        <label htmlFor="entry-source">Source</label>
        <input id="entry-source" required value={source} onChange={(event) => setSource(event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="entry-amount">Amount</label>
        <input
          id="entry-amount"
          min="0"
          required
          step="0.01"
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="entry-currency">Currency</label>
        <select
          id="entry-currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value as 'EUR' | 'USD' | 'EGP')}
        >
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="EGP">EGP</option>
        </select>
      </div>
      <div className="field span-2 checkbox-row">
        <input
          checked={isIndependent}
          id="entry-independent"
          type="checkbox"
          onChange={(event) => setIsIndependent(event.target.checked)}
        />
        <label htmlFor="entry-independent">Counts toward independent income</label>
      </div>
      <div className="field span-2 checkbox-row">
        <input
          checked={isRecurring}
          id="entry-recurring"
          type="checkbox"
          onChange={(event) => setIsRecurring(event.target.checked)}
        />
        <label htmlFor="entry-recurring">Recurring monthly item</label>
      </div>
      <div className="field span-2">
        <label htmlFor="entry-notes">Notes</label>
        <textarea id="entry-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      <div className="field span-2 form-actions">
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving entry...' : 'Add finance entry'}
        </button>
      </div>
    </form>
  )
}
