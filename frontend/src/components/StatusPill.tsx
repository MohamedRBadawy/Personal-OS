type StatusPillProps = {
  label: string
}

export function StatusPill({ label }: StatusPillProps) {
  const normalized = label.toLowerCase()
  const variant =
    normalized === 'done'
      ? 'success'
      : normalized === 'blocked'
        ? 'warning'
        : normalized === 'active'
          ? 'active'
          : 'default'

  return <span className={`status-pill ${variant}`}>{label}</span>
}
