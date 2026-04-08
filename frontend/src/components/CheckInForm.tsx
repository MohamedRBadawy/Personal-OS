import { useState } from 'react'
import type { CheckInPayload } from '../lib/types'
import { EmojiMoodPicker } from './EmojiMoodPicker'

type CheckInFormProps = {
  onSubmit: (payload: CheckInPayload) => void
  isSubmitting: boolean
}

export function CheckInForm({ onSubmit, isSubmitting }: CheckInFormProps) {
  const [sleepHours, setSleepHours] = useState('7.5')
  const [sleepQuality, setSleepQuality] = useState(4)
  const [energyLevel, setEnergyLevel] = useState(3)
  const [exerciseDone, setExerciseDone] = useState(false)
  const [exerciseType, setExerciseType] = useState('')
  const [exerciseDuration, setExerciseDuration] = useState('')
  const [moodScore, setMoodScore] = useState(3)
  const [financeSource, setFinanceSource] = useState('')
  const [financeAmount, setFinanceAmount] = useState('')
  const [financeType, setFinanceType] = useState<'income' | 'expense'>('income')
  const [financeCurrency, setFinanceCurrency] = useState<'EUR' | 'USD' | 'EGP'>('EUR')
  const [isIndependent, setIsIndependent] = useState(true)
  const [inboxText, setInboxText] = useState('')
  const [blockersText, setBlockersText] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const financeDeltas =
      financeSource.trim() && financeAmount.trim()
        ? [
            {
              type: financeType,
              source: financeSource.trim(),
              amount: financeAmount,
              currency: financeCurrency,
              is_independent: isIndependent,
            },
          ]
        : []

    onSubmit({
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      energy_level: energyLevel,
      exercise_done: exerciseDone,
      exercise_type: exerciseDone ? exerciseType : '',
      exercise_duration_mins: exerciseDone && exerciseDuration ? Number(exerciseDuration) : null,
      mood_score: moodScore,
      finance_deltas: financeDeltas,
      inbox_text: inboxText,
      blockers_text: blockersText,
    })
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="sleep-hours">Sleep hours</label>
        <input
          id="sleep-hours"
          min="0"
          name="sleep-hours"
          step="0.5"
          type="number"
          value={sleepHours}
          onChange={(event) => setSleepHours(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="sleep-quality">Sleep quality</label>
        <select
          id="sleep-quality"
          value={sleepQuality}
          onChange={(event) => setSleepQuality(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="energy-level">Energy level</label>
        <select
          id="energy-level"
          value={energyLevel}
          onChange={(event) => setEnergyLevel(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="mood-score">How are you feeling?</label>
        <EmojiMoodPicker id="mood-score" value={moodScore} onChange={setMoodScore} />
      </div>
      <div className="field span-2 checkbox-row">
        <input
          checked={exerciseDone}
          id="exercise-done"
          type="checkbox"
          onChange={(event) => setExerciseDone(event.target.checked)}
        />
        <label htmlFor="exercise-done">I exercised yesterday</label>
      </div>
      <div className="field">
        <label htmlFor="exercise-type">Exercise type</label>
        <input
          id="exercise-type"
          value={exerciseType}
          onChange={(event) => setExerciseType(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="exercise-duration">Exercise duration (mins)</label>
        <input
          id="exercise-duration"
          min="0"
          type="number"
          value={exerciseDuration}
          onChange={(event) => setExerciseDuration(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="finance-source">Finance item source</label>
        <input
          id="finance-source"
          placeholder="Optional"
          value={financeSource}
          onChange={(event) => setFinanceSource(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="finance-amount">Finance item amount</label>
        <input
          id="finance-amount"
          min="0"
          placeholder="Optional"
          step="0.01"
          type="number"
          value={financeAmount}
          onChange={(event) => setFinanceAmount(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="finance-type">Finance item type</label>
        <select
          id="finance-type"
          value={financeType}
          onChange={(event) => setFinanceType(event.target.value as 'income' | 'expense')}
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="finance-currency">Currency</label>
        <select
          id="finance-currency"
          value={financeCurrency}
          onChange={(event) => setFinanceCurrency(event.target.value as 'EUR' | 'USD' | 'EGP')}
        >
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="EGP">EGP</option>
        </select>
      </div>
      <div className="field span-2 checkbox-row">
        <input
          checked={isIndependent}
          id="independent-income"
          type="checkbox"
          onChange={(event) => setIsIndependent(event.target.checked)}
        />
        <label htmlFor="independent-income">Treat this as independent income</label>
      </div>
      <div className="field span-2">
        <label htmlFor="inbox-text">New thought or idea</label>
        <textarea
          id="inbox-text"
          value={inboxText}
          onChange={(event) => setInboxText(event.target.value)}
        />
      </div>
      <div className="field span-2">
        <label htmlFor="blockers-text">What is blocking today?</label>
        <textarea
          id="blockers-text"
          value={blockersText}
          onChange={(event) => setBlockersText(event.target.value)}
        />
      </div>
      <div className="field span-2 form-actions">
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Submitting check-in...' : 'Submit morning check-in'}
        </button>
        <span className="helper-text">Optional finance fields are sent only when filled in.</span>
      </div>
    </form>
  )
}
