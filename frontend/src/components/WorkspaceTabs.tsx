type WorkspaceTab = {
  id: string
  label: string
}

type WorkspaceTabsProps = {
  tabs: WorkspaceTab[]
  activeTab: string
  onChange: (tabId: string) => void
}

export function WorkspaceTabs({ tabs, activeTab, onChange }: WorkspaceTabsProps) {
  return (
    <div className="button-row workspace-tabbar" role="tablist" aria-label="Workspace tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? 'button-muted active' : 'button-muted'}
          role="tab"
          type="button"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
