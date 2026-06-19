import { ChevronDown, Settings as SettingsIcon } from 'lucide-react';
import { useDropdown } from '../hooks/useDropdown';
import { usePreferences } from '../hooks/usePreferences';

export function SettingsMenu() {
  const { open, setOpen, rootRef } = useDropdown();
  const { theme, setTheme, showSubnetLabels, setShowSubnetLabels, showSubnetBoundaries, setShowSubnetBoundaries } =
    usePreferences();

  return (
    <div className="toolbar-menu" ref={rootRef}>
      <button
        type="button"
        className="toolbar-btn"
        onClick={() => setOpen((v) => !v)}
        title="Settings: theme and display options"
      >
        <SettingsIcon size={14} /> Settings <ChevronDown size={12} />
      </button>
      {open && (
        <div className="toolbar-menu-dropdown">
          <div className="toolbar-menu-label">Theme</div>
          <div className="toolbar-menu-toggle-row">
            <button
              type="button"
              className={`toolbar-menu-item${theme === 'dark' ? ' is-active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              Dark
            </button>
            <button
              type="button"
              className={`toolbar-menu-item${theme === 'light' ? ' is-active' : ''}`}
              onClick={() => setTheme('light')}
            >
              Light
            </button>
          </div>
          <div className="toolbar-menu-divider" />
          <label className="toolbar-menu-checkbox">
            <input
              type="checkbox"
              checked={showSubnetLabels}
              onChange={(e) => setShowSubnetLabels(e.target.checked)}
            />
            Show subnet labels on links
          </label>
          <label className="toolbar-menu-checkbox">
            <input
              type="checkbox"
              checked={showSubnetBoundaries}
              onChange={(e) => setShowSubnetBoundaries(e.target.checked)}
            />
            Show network boundaries
          </label>
        </div>
      )}
    </div>
  );
}
