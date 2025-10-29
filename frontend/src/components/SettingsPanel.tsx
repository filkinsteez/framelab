import { useState } from 'react';

interface SettingsPanelProps {
  visible?: boolean;
  onClose?: () => void;
}

interface Settings {
  rippleEnabled: boolean;
  rippleIntensity: number;
  generationStrength: number;
  guidanceScale: number;
  numImages: number;
}

/**
 * Settings panel for configuring app behavior
 */
export function SettingsPanel({ visible = false, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>({
    rippleEnabled: true,
    rippleIntensity: 1.0,
    generationStrength: 0.75,
    guidanceScale: 7.5,
    numImages: 4,
  });

  if (!visible) return null;

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        right: 16,
        width: '300px',
        backgroundColor: 'white',
        border: '2px solid #333',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        maxHeight: 'calc(100vh - 100px)',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
          Settings
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Settings content */}
      <div style={{ padding: '16px' }}>
        {/* Ripple Effects Section */}
        <Section title="Ripple Effects">
          <SettingRow label="Enable Ripples">
            <input
              type="checkbox"
              checked={settings.rippleEnabled}
              onChange={(e) => updateSetting('rippleEnabled', e.target.checked)}
            />
          </SettingRow>

          <SettingRow label="Intensity">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.rippleIntensity}
              onChange={(e) =>
                updateSetting('rippleIntensity', parseFloat(e.target.value))
              }
              disabled={!settings.rippleEnabled}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#666' }}>
              {settings.rippleIntensity.toFixed(1)}
            </span>
          </SettingRow>
        </Section>

        {/* AI Generation Section */}
        <Section title="AI Generation">
          <SettingRow label="Strength">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.generationStrength}
              onChange={(e) =>
                updateSetting('generationStrength', parseFloat(e.target.value))
              }
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#666' }}>
              {settings.generationStrength.toFixed(2)}
            </span>
          </SettingRow>

          <SettingRow label="Guidance Scale">
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={settings.guidanceScale}
              onChange={(e) =>
                updateSetting('guidanceScale', parseFloat(e.target.value))
              }
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#666' }}>
              {settings.guidanceScale.toFixed(1)}
            </span>
          </SettingRow>

          <SettingRow label="Number of Images">
            <select
              value={settings.numImages}
              onChange={(e) =>
                updateSetting('numImages', parseInt(e.target.value))
              }
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </SettingRow>
        </Section>

        {/* Info Section */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#666',
            lineHeight: '1.5',
          }}
        >
          <strong>Note:</strong> Settings take effect on next generation or action.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h4
        style={{
          margin: '0 0 12px 0',
          fontSize: '13px',
          fontWeight: '600',
          color: '#333',
        }}
      >
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '12px', color: '#555', fontWeight: '500' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

