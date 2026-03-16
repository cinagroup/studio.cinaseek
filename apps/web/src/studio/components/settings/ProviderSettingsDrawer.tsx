import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Server,
  Key,
  Globe,
  Settings,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProviderModel {
  id: string
  name: string
  enabled?: boolean
}

export interface Provider {
  id: string
  name: string
  type: string        // 'openai' | 'anthropic' | 'google' | 'ollama' | 'custom'
  apiKey?: string
  baseUrl?: string
  models: ProviderModel[]
  defaultModelId?: string
  enabled?: boolean
  createdAt: number
  updatedAt: number
}

export interface ProviderSettingsDrawerProps {
  /** Current providers list */
  providers: Provider[]
  /** Callback when providers change */
  onChange?: (providers: Provider[]) => void
  /** Whether the drawer is visible */
  open?: boolean
  /** Close handler */
  onClose?: () => void
  /** Custom health-check fetcher – returns true if reachable */
  onHealthCheck?: (provider: Provider) => Promise<boolean>
  /** Custom model loader – returns model list */
  onLoadModels?: (provider: Provider) => Promise<ProviderModel[]>
  /** Z-index (default: 10000) */
  zIndex?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  openai: <Globe size={16} />,
  anthropic: <Globe size={16} />,
  google: <Globe size={16} />,
  ollama: <Server size={16} />,
  custom: <Settings size={16} />,
}

const DEFAULT_MODELS: Record<string, ProviderModel[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', enabled: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', enabled: true },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', enabled: true },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', enabled: true },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', enabled: true },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', enabled: true },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', enabled: true },
  ],
  google: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', enabled: true },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', enabled: true },
  ],
  ollama: [],
  custom: [],
}

const PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'custom', label: 'Custom / OpenAI-compatible' },
]

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  overlay: (z: number) => ({
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: z,
    display: 'flex' as const,
    justifyContent: 'flex-end',
  }),
  drawer: {
    width: 720,
    maxWidth: '95vw',
    height: '100vh',
    background: '#1a1a2e',
    color: '#e0e0e0',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  body: {
    flex: 1,
    display: 'flex' as const,
    overflow: 'hidden',
  },
  sidebar: {
    width: 220,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    overflowY: 'auto' as const,
    padding: '8px',
  },
  sidebarItem: (active: boolean) => ({
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    marginBottom: 4,
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
    fontSize: 13,
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    color: active ? '#a5b4fc' : '#b0b0b0',
    border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
  }),
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e0e0e0',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: '#16162a',
    color: '#e0e0e0',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  btn: (variant: 'primary' | 'ghost' | 'danger') => ({
    padding: '8px 16px',
    borderRadius: 8,
    border: variant === 'ghost' ? '1px solid rgba(255,255,255,0.12)' : 'none',
    background:
      variant === 'primary'
        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
        : variant === 'danger'
          ? '#dc2626'
          : 'transparent',
    color: variant === 'ghost' ? '#b0b0b0' : '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 6,
  }),
  modelItem: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: '8px 12px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.03)',
    marginBottom: 6,
    fontSize: 13,
  },
  badge: (color: string) => ({
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    color,
    background: `${color}18`,
  }),
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ProviderSettingsDrawer: React.FC<ProviderSettingsDrawerProps> = ({
  providers: externalProviders,
  onChange,
  open = true,
  onClose,
  onHealthCheck,
  onLoadModels,
  zIndex = 10000,
}) => {
  const { t } = useTranslation()
  const [providers, setProviders] = useState<Provider[]>(externalProviders ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [healthStatus, setHealthStatus] = useState<Record<string, 'checking' | 'ok' | 'fail'>>({})

  useEffect(() => {
    if (externalProviders) setProviders(externalProviders)
  }, [externalProviders])

  const selected = useMemo(
    () => providers.find((p) => p.id === selectedId) ?? null,
    [providers, selectedId]
  )

  // ── CRUD helpers ──

  const persist = useCallback(
    (next: Provider[]) => {
      setProviders(next)
      onChange?.(next)
    },
    [onChange]
  )

  const addProvider = useCallback(() => {
    const p: Provider = {
      id: uid(),
      name: 'New Provider',
      type: 'openai',
      models: [...DEFAULT_MODELS.openai],
      defaultModelId: 'gpt-4o',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    persist([...providers, p])
    setSelectedId(p.id)
  }, [providers, persist])

  const removeProvider = useCallback(
    (id: string) => {
      const next = providers.filter((p) => p.id !== id)
      persist(next)
      if (selectedId === id) setSelectedId(next[0]?.id ?? null)
    },
    [providers, selectedId, persist]
  )

  const updateField = useCallback(
    <K extends keyof Provider>(key: K, value: Provider[K]) => {
      if (!selected) return
      const next = providers.map((p) =>
        p.id === selected.id ? { ...p, [key]: value, updatedAt: Date.now() } : p
      )
      persist(next)
    },
    [providers, selected, persist]
  )

  // ── Health check ──

  const handleHealthCheck = useCallback(async () => {
    if (!selected) return
    setHealthStatus((s) => ({ ...s, [selected.id]: 'checking' }))
    try {
      const ok = onHealthCheck
        ? await onHealthCheck(selected)
        : await defaultHealthCheck(selected)
      setHealthStatus((s) => ({ ...s, [selected.id]: ok ? 'ok' : 'fail' }))
    } catch {
      setHealthStatus((s) => ({ ...s, [selected.id]: 'fail' }))
    }
  }, [selected, onHealthCheck])

  // ── Load models ──

  const handleLoadModels = useCallback(async () => {
    if (!selected) return
    try {
      const models = onLoadModels
        ? await onLoadModels(selected)
        : await defaultLoadModels(selected)
      if (models.length > 0) {
        const next = providers.map((p) =>
          p.id === selected.id
            ? { ...p, models, defaultModelId: models[0].id, updatedAt: Date.now() }
            : p
        )
        persist(next)
      }
    } catch (err) {
      console.warn('[ProviderSettings] Failed to load models:', err)
    }
  }, [selected, onLoadModels, providers, persist])

  if (!open) return null

  return (
    <div style={styles.overlay(zIndex)} onClick={onClose}>
      <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {t('settings.providers.title', 'Provider Settings')}
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.btn('primary')} onClick={addProvider}>
              <Plus size={14} /> Add
            </button>
            {onClose && (
              <button style={styles.btn('ghost')} onClick={onClose}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Sidebar – provider list */}
          <div style={styles.sidebar}>
            {providers.map((p) => (
              <div
                key={p.id}
                style={styles.sidebarItem(p.id === selectedId)}
                onClick={() => setSelectedId(p.id)}
              >
                {PROVIDER_ICONS[p.type] ?? PROVIDER_ICONS.custom}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: p.enabled ? '#22c55e' : '#666',
                    flexShrink: 0,
                  }}
                />
              </div>
            ))}
            {providers.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: '#666', fontSize: 12 }}>
                No providers yet
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div style={styles.content}>
            {selected ? (
              <>
                {/* Name */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Provider Name</label>
                  <input
                    style={styles.input}
                    value={selected.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g. My OpenAI"
                  />
                </div>

                {/* Type */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Type</label>
                  <select
                    style={styles.select}
                    value={selected.type}
                    onChange={(e) => {
                      const type = e.target.value
                      const models = DEFAULT_MODELS[type] ?? []
                      const defaultModelId = models[0]?.id
                      const next = providers.map((p) =>
                        p.id === selected.id
                          ? { ...p, type, models, defaultModelId, baseUrl: type === 'ollama' ? 'http://localhost:11434' : p.baseUrl, updatedAt: Date.now() }
                          : p
                      )
                      persist(next)
                    }}
                  >
                    {PROVIDER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Base URL */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Base URL</label>
                  <input
                    style={styles.input}
                    value={selected.baseUrl ?? ''}
                    onChange={(e) => updateField('baseUrl', e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>

                {/* API Key */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    <Key size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    API Key
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ ...styles.input, flex: 1 }}
                      type={showApiKey ? 'text' : 'password'}
                      value={selected.apiKey ?? ''}
                      onChange={(e) => updateField('apiKey', e.target.value)}
                      placeholder="sk-..."
                    />
                    <button
                      style={styles.btn('ghost')}
                      onClick={() => setShowApiKey((v) => !v)}
                      title={showApiKey ? 'Hide' : 'Show'}
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Health Check */}
                <div style={styles.fieldGroup}>
                  <button style={styles.btn('primary')} onClick={handleHealthCheck} disabled={healthStatus[selected.id] === 'checking'}>
                    {healthStatus[selected.id] === 'checking' ? (
                      <><RefreshCw size={14} className="spin" /> Checking…</>
                    ) : (
                      <><RefreshCw size={14} /> Health Check</>
                    )}
                  </button>
                  {healthStatus[selected.id] === 'ok' && (
                    <span style={{ ...styles.badge('#22c55e'), marginLeft: 10 }}>
                      <CheckCircle2 size={12} /> Connected
                    </span>
                  )}
                  {healthStatus[selected.id] === 'fail' && (
                    <span style={{ ...styles.badge('#ef4444'), marginLeft: 10 }}>
                      <XCircle size={12} /> Failed
                    </span>
                  )}
                </div>

                {/* Models */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    Models
                    <button
                      style={{ ...styles.btn('ghost'), marginLeft: 8, padding: '4px 10px', fontSize: 11 }}
                      onClick={handleLoadModels}
                    >
                      <RefreshCw size={12} /> Refresh
                    </button>
                  </label>
                  {selected.models.length === 0 && (
                    <div style={{ color: '#666', fontSize: 12, padding: '8px 0' }}>
                      No models loaded. Click Refresh to fetch from provider.
                    </div>
                  )}
                  {selected.models.map((m) => (
                    <div key={m.id} style={styles.modelItem}>
                      <input
                        type="radio"
                        name={`default-model-${selected.id}`}
                        checked={m.id === selected.defaultModelId}
                        onChange={() => updateField('defaultModelId', m.id)}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <span style={{ flex: 1 }}>{m.name || m.id}</span>
                      {m.id === selected.defaultModelId && (
                        <span style={{ ...styles.badge('#6366f1'), fontSize: 10 }}>Default</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Delete */}
                <div style={{ marginTop: 32, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
                  <button style={styles.btn('danger')} onClick={() => removeProvider(selected.id)}>
                    <Trash2 size={14} /> Delete Provider
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                <Server size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p>Select or add a provider</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Default implementations ─────────────────────────────────────────────────

async function defaultHealthCheck(provider: Provider): Promise<boolean> {
  const url = provider.baseUrl ?? defaultBaseUrl(provider.type)
  try {
    const res = await fetch(url.replace(/\/$/, '') + '/models', {
      method: 'GET',
      headers: provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {},
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

async function defaultLoadModels(provider: Provider): Promise<ProviderModel[]> {
  const url = provider.baseUrl ?? defaultBaseUrl(provider.type)
  try {
    const res = await fetch(url.replace(/\/$/, '') + '/models', {
      method: 'GET',
      headers: provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {},
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const json = await res.json()
    const list = json.data ?? json.models ?? json ?? []
    return (Array.isArray(list) ? list : []).map((m: { id?: string; name?: string }) => ({
      id: m.id ?? m.name ?? uid(),
      name: m.name ?? m.id ?? 'Unknown',
      enabled: true,
    }))
  } catch {
    return []
  }
}

function defaultBaseUrl(type: string): string {
  switch (type) {
    case 'ollama':
      return 'http://localhost:11434'
    case 'anthropic':
      return 'https://api.anthropic.com'
    case 'google':
      return 'https://generativelanguage.googleapis.com'
    default:
      return 'https://api.openai.com/v1'
  }
}

export default ProviderSettingsDrawer
