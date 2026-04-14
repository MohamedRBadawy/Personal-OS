interface Tab {
  id: string
  label: string
}

interface HubTabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function HubTabs({ tabs, active, onChange }: HubTabsProps) {
  return (
    <div className="hub-tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`hub-tab${active === t.id ? ' hub-tab--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
