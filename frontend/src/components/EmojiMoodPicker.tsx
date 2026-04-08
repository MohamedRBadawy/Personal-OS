const moods = [
  { value: 1, emoji: '\u{1F614}', label: 'Low' },
  { value: 2, emoji: '\u{1F610}', label: 'Below avg' },
  { value: 3, emoji: '\u{1F642}', label: 'Okay' },
  { value: 4, emoji: '\u{1F60A}', label: 'Good' },
  { value: 5, emoji: '\u{1F604}', label: 'Great' },
] as const

type EmojiMoodPickerProps = {
  value: number
  onChange: (value: number) => void
  id?: string
}

export function EmojiMoodPicker({ value, onChange, id }: EmojiMoodPickerProps) {
  return (
    <div className="emoji-mood-picker" role="radiogroup" aria-label="Mood score" id={id}>
      {moods.map((mood) => (
        <button
          key={mood.value}
          type="button"
          role="radio"
          aria-checked={value === mood.value}
          aria-label={`${mood.label} (${mood.value}/5)`}
          className={`emoji-mood-button ${value === mood.value ? 'active' : ''}`}
          onClick={() => onChange(mood.value)}
        >
          <span className="emoji-mood-emoji">{mood.emoji}</span>
          <span className="emoji-mood-label">{mood.label}</span>
        </button>
      ))}
    </div>
  )
}
