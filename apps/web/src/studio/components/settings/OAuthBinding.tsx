import React, { useState, useEffect, useCallback } from 'react'
import {
  Unlink,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Chrome,
  Github,
  MessageCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ─── Types ───────────────────────────────────────────────────────────────────

interface OAuthBinding {
  provider: 'google' | 'github' | 'wechat'
  linked: boolean
  displayName?: string
  avatarUrl?: string
  linkedAt?: string
}

export interface OAuthBindingProps {
  /** Initial bindings state */
  bindings?: OAuthBinding[]
  /** Called when bindings change */
  onChange?: (bindings: OAuthBinding[]) => void
  /** Custom bind handler – redirect URL or callback */
  onBind?: (provider: OAuthBinding['provider']) => void | Promise<void>
  /** Custom unbind handler */
  onUnbind?: (provider: OAuthBinding['provider']) => void | Promise<void>
  /** Check binding status handler */
  onCheckStatus?: (provider: OAuthBinding['provider']) => Promise<OAuthBinding>
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROVIDER_META: Record<
  OAuthBinding['provider'],
  { label: string; icon: React.ReactNode; color: string; description: string }
> = {
  google: {
    label: 'Google',
    icon: <Chrome size={20} />,
    color: '#4285f4',
    description: 'Sign in with Google to sync your account',
  },
  github: {
    label: 'GitHub',
    icon: <Github size={20} />,
    color: '#e0e0e0',
    description: 'Connect your GitHub for identity verification',
  },
  wechat: {
    label: 'WeChat',
    icon: <MessageCircle size={20} />,
    color: '#07c160',
    description: 'Bind WeChat for quick login and notifications',
  },
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  container: {
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 4,
    color: '#e0e0e0',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 24,
  },
  card: (color: string) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 16,
    padding: '16px 20px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    marginBottom: 12,
    transition: 'border-color 0.2s',
  }),
  iconBox: (color: string) => ({
    width: 44,
    height: 44,
    borderRadius: 10,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    background: `${color}18`,
    color,
    flexShrink: 0,
  }),
  info: {
    flex: 1,
  },
  providerLabel: {
    fontSize: 15,
    fontWeight: 500,
    color: '#e0e0e0',
    marginBottom: 2,
  },
  providerDesc: {
    fontSize: 12,
    color: '#888',
  },
  linkedInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'linked') => ({
    padding: '8px 16px',
    borderRadius: 8,
    border: variant === 'ghost' ? '1px solid rgba(255,255,255,0.12)' : 'none',
    background:
      variant === 'primary'
        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
        : variant === 'danger'
          ? 'rgba(220,38,38,0.15)'
          : variant === 'linked'
            ? 'rgba(34,197,94,0.1)'
            : 'transparent',
    color:
      variant === 'linked'
        ? '#22c55e'
        : variant === 'danger'
          ? '#ef4444'
          : variant === 'ghost'
            ? '#b0b0b0'
            : '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 6,
    flexShrink: 0,
  }),
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

export const OAuthBinding: React.FC<OAuthBindingProps> = ({
  bindings: externalBindings,
  onChange,
  onBind,
  onUnbind,
  onCheckStatus,
}) => {
  const { t } = useTranslation()
  const [bindings, setBindings] = useState<OAuthBinding[]>(externalBindings ?? [
    { provider: 'google', linked: false },
    { provider: 'github', linked: false },
    { provider: 'wechat', linked: false },
  ])
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (externalBindings) setBindings(externalBindings)
  }, [externalBindings])

  const sync = useCallback(
    (next: OAuthBinding[]) => {
      setBindings(next)
      onChange?.(next)
    },
    [onChange]
  )

  const handleBind = useCallback(
    async (provider: OAuthBinding['provider']) => {
      setLoading((s) => ({ ...s, [provider]: true }))
      try {
        if (onBind) {
          await onBind(provider)
        } else {
          // Default: redirect to API endpoint
          window.location.href = `/api/auth/${provider}`
          return
        }
        // Check status after bind
        if (onCheckStatus) {
          const status = await onCheckStatus(provider)
          sync(bindings.map((b) => (b.provider === provider ? status : b)))
        }
      } catch (err) {
        console.warn(`[OAuthBinding] Failed to bind ${provider}:`, err)
      } finally {
        setLoading((s) => ({ ...s, [provider]: false }))
      }
    },
    [onBind, onCheckStatus, bindings, sync]
  )

  const handleUnbind = useCallback(
    async (provider: OAuthBinding['provider']) => {
      setLoading((s) => ({ ...s, [provider]: true }))
      try {
        if (onUnbind) {
          await onUnbind(provider)
        } else {
          const res = await fetch(`/api/auth/${provider}/unbind`, { method: 'POST' })
          if (!res.ok) throw new Error('Unbind failed')
        }
        sync(
          bindings.map((b) =>
            b.provider === provider
              ? { ...b, linked: false, displayName: undefined, avatarUrl: undefined, linkedAt: undefined }
              : b
          )
        )
      } catch (err) {
        console.warn(`[OAuthBinding] Failed to unbind ${provider}:`, err)
      } finally {
        setLoading((s) => ({ ...s, [provider]: false }))
      }
    },
    [onUnbind, bindings, sync]
  )

  // Check binding statuses on mount
  useEffect(() => {
    if (!onCheckStatus) return
    const providers: OAuthBinding['provider'][] = ['google', 'github', 'wechat']
    Promise.all(
      providers.map(async (p) => {
        try {
          const status = await onCheckStatus(p)
          return status
        } catch {
          return { provider: p, linked: false } as OAuthBinding
        }
      })
    ).then((results) => sync(results))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        {t('settings.oauth.title', 'OAuth Bindings')}
      </h3>
      <p style={styles.subtitle}>
        {t('settings.oauth.subtitle', 'Connect third-party accounts for quick login and data sync')}
      </p>

      {(Object.keys(PROVIDER_META) as OAuthBinding['provider'][]).map((key) => {
        const meta = PROVIDER_META[key]
        const binding = bindings.find((b) => b.provider === key) ?? { provider: key, linked: false }
        const isLoading = loading[key]

        return (
          <div key={key} style={styles.card(meta.color)}>
            <div style={styles.iconBox(meta.color)}>{meta.icon}</div>
            <div style={styles.info}>
              <div style={styles.providerLabel}>{meta.label}</div>
              <div style={styles.providerDesc}>{meta.description}</div>
              {binding.linked && (
                <div style={styles.linkedInfo}>
                  {binding.avatarUrl && (
                    <img
                      src={binding.avatarUrl}
                      alt=""
                      style={{ width: 18, height: 18, borderRadius: '50%' }}
                    />
                  )}
                  {binding.displayName && <span>{binding.displayName}</span>}
                  {binding.linkedAt && (
                    <span style={{ color: '#555' }}>
                      · {new Date(binding.linkedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              {isLoading ? (
                <span style={styles.btn('ghost')}>
                  <Loader2 size={14} className="spin" /> …
                </span>
              ) : binding.linked ? (
                <>
                  <span style={styles.btn('linked')}>
                    <CheckCircle2 size={14} /> Linked
                  </span>
                  <button
                    style={{ ...styles.btn('danger'), marginLeft: 8 }}
                    onClick={() => handleUnbind(key)}
                    title="Unbind"
                  >
                    <Unlink size={14} /> Unbind
                  </button>
                </>
              ) : (
                <button style={styles.btn('primary')} onClick={() => handleBind(key)}>
                  <ExternalLink size={14} /> Connect
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default OAuthBinding
