export type JournalEntry = {
  id: number
  date: string
  mood_note: string
  gratitude: string
  wins: string
  tomorrow_focus: string
  created_at: string
  updated_at: string
}

export type JournalEntryPayload = {
  mood_note?: string
  gratitude?: string
  wins?: string
  tomorrow_focus?: string
}
