import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  Wrench,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface McpTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface McpServer {
  id: string
  name: string
  type: 'stdio' | 'sse' | 'streamable-http'
  /** For stdio: command + args. For sse/http: url */
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  enabled: boolean
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  tools: McpTool[]
  error?: string
  lastConnected?: number
  createdAt: number
}

export interface McpServicePanelProps {
  /** MCP server list */
  servers?: McpServer[]
  /** Callback when servers change */
  onChange?: (servers: McpServer[]) => void
  /** Custom start/stop handler */
  onToggle?: (serverId: string) => Promise<boolean>
  /** Custom connect handler */
  onConnect?: (serverId: string) => Promise<McpServer>
  /** Custom tool fetcher */
  onFetchTools?: (serverId: string) => Promise<McpTool[]>
  /** Custom delete handler */
  onDelete?: (serverId: string) => Promise<void>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const STATUS_CONFIG: Record<
  McpServer['status'],
  { color: string; label: string; icon: React.ReactNode }
> = {
  connected: { color: '#22c55e', label: 'Connected', icon: <Circle size={8} fill="#22c55e" /> },
  disconnected: { color: '#666', label: 'Disconnected', icon: <Circle size={8} /> },
  connecting: { color: '#f59e0b', label: 'Connecting…', icon: <Loader2 size={8} className="spin" /> },
  error: { color: '#ef4444', label: 'Error', icon: <Circle size={8} fill="#ef4444" /> },
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
    marginBottom: 20,
  },
  serverCard: {
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  serverHeader: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: '14px 20px',
    cursor: 'pointer',
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#e0e0e0',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  serverMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  toolsPanel: {
    padding: '0 20px 16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  toolItem: {
    padding: '8px 12px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.02)',
    marginBottom: 4,
    fontSize: 13,
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
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
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'icon') => ({
    padding: variant === 'icon' ? '6px' : '8px 16px',
    borderRadius: 8,
    border: variant === 'ghost' ? '1px solid rgba(255,255,255,0.12)' : 'none',
    background:
      variant === 'primary'
        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
        : variant === 'danger'
          ? 'rgba(220,38,38,0.15)'
          : 'transparent',
    color:
      variant === 'danger'
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
  }),
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
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    fontWeight: 500,
  },
  addForm: {
    borderRadius: 12,
    border: '1px dashed rgba(99,102,241,0.3)',
    background: 'rgba(99,102,241,0.05)',
    padding: 20,
    marginBottom: 16,
  },
}

// ─── Component ───────────────────────────────────────────────────────────────

export const McpServicePanel: React.FC<McpServicePanelProps> = ({
  servers: externalServers,
  onChange,
  onToggle,
  onConnect,
  onFetchTools,
  onDelete,
}) => {
  const { t } = useTranslation()
  const [servers, setServers] = useState<McpServer[]>(externalServers ?? [])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newServer, setNewServer] = useState({
    name: '',
    type: 'stdio' as McpServer['type'],
    command: '',
    args: '',
    url: '',
  })

  useEffect(() => {
    if (externalServers) setServers(externalServers)
  }, [externalServers])

  const sync = useCallback(
    (next: McpServer[]) => {
      setServers(next)
      onChange?.(next)
    },
    [onChange]
  )

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ── Add server ──

  const handleAdd = useCallback(() => {
    if (!newServer.name.trim()) return
    const server: McpServer = {
      id: uid(),
      name: newServer.name.trim(),
      type: newServer.type,
      command: newServer.type === 'stdio' ? newServer.command.trim() : undefined,
      args: newServer.type === 'stdio' && newServer.args.trim()
        ? newServer.args.trim().split(/\s+/)
        : undefined,
      url: newServer.type !== 'stdio' ? newServer.url.trim() : undefined,
      enabled: true,
      status: 'disconnected',
      tools: [],
      createdAt: Date.now(),
    }
    sync([...servers, server])
    setNewServer({ name: '', type: 'stdio', command: '', args: '', url: '' })
    setShowAddForm(false)
  }, [newServer, servers, sync])

  // ── Toggle enable/disable ──

  const handleToggle = useCallback(
    async (id: string) => {
      if (onToggle) {
        const ok = await onToggle(id)
        sync(
          servers.map((s) => (s.id === id ? { ...s, enabled: ok, status: ok ? 'connecting' : 'disconnected' } : s))
        )
      } else {
        sync(
          servers.map((s) =>
            s.id === id
              ? { ...s, enabled: !s.enabled, status: s.enabled ? 'disconnected' : 'connecting' }
              : s
          )
        )
      }
    },
    [onToggle, servers, sync]
  )

  // ── Connect ──

  const handleConnect = useCallback(
    async (id: string) => {
      sync(servers.map((s) => (s.id === id ? { ...s, status: 'connecting' } : s)))
      try {
        if (onConnect) {
          const updated = await onConnect(id)
          sync(servers.map((s) => (s.id === id ? updated : s)))
        } else {
          // Default: call the internal API
          const res = await fetch(`/api/mcp/${id}/connect`, { method: 'POST' })
          if (!res.ok) throw new Error('Connect failed')
          const data = await res.json()
          sync(
            servers.map((s) =>
              s.id === id
                ? { ...s, status: 'connected' as const, tools: data.tools ?? [], lastConnected: Date.now(), error: undefined }
                : s
            )
          )
        }
      } catch (err) {
        sync(
          servers.map((s) =>
            s.id === id
              ? { ...s, status: 'error' as const, error: String(err) }
              : s
          )
        )
      }
    },
    [onConnect, servers, sync]
  )

  // ── Delete ──

  const handleDelete = useCallback(
    async (id: string) => {
      if (onDelete) {
        await onDelete(id)
      }
      sync(servers.filter((s) => s.id !== id))
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    [onDelete, servers, sync]
  )

  // ── Copy command ──

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h3 style={styles.title}>{t('settings.mcp.title', 'MCP Services')}</h3>
          <p style={styles.subtitle}>
            {t('settings.mcp.subtitle', 'Manage Model Context Protocol servers and their tools')}
          </p>
        </div>
        <button style={styles.btn('primary')} onClick={() => setShowAddForm((v) => !v)}>
          <Plus size={14} /> Add Server
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={styles.addForm}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Server Name</label>
            <input
              style={styles.input}
              value={newServer.name}
              onChange={(e) => setNewServer((s) => ({ ...s, name: e.target.value }))}
              placeholder="my-mcp-server"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Type</label>
            <select
              style={styles.select}
              value={newServer.type}
              onChange={(e) => setNewServer((s) => ({ ...s, type: e.target.value as McpServer['type'] }))}
            >
              <option value="stdio">stdio (Local Process)</option>
              <option value="sse">SSE (Server-Sent Events)</option>
              <option value="streamable-http">Streamable HTTP</option>
            </select>
          </div>
          {newServer.type === 'stdio' ? (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Command</label>
                <input
                  style={styles.input}
                  value={newServer.command}
                  onChange={(e) => setNewServer((s) => ({ ...s, command: e.target.value }))}
                  placeholder="npx @modelcontextprotocol/server-filesystem /path"
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Arguments (space-separated)</label>
                <input
                  style={styles.input}
                  value={newServer.args}
                  onChange={(e) => setNewServer((s) => ({ ...s, args: e.target.value }))}
                  placeholder="--option value"
                />
              </div>
            </>
          ) : (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>URL</label>
              <input
                style={styles.input}
                value={newServer.url}
                onChange={(e) => setNewServer((s) => ({ ...s, url: e.target.value }))}
                placeholder="https://mcp.example.com/sse"
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={styles.btn('ghost')} onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button style={styles.btn('primary')} onClick={handleAdd} disabled={!newServer.name.trim()}>
              Add
            </button>
          </div>
        </div>
      )}

      {/* Server list */}
      {servers.map((server) => {
        const cfg = STATUS_CONFIG[server.status]
        const expanded = expandedIds.has(server.id)

        return (
          <div key={server.id} style={styles.serverCard}>
            <div style={styles.serverHeader} onClick={() => toggleExpand(server.id)}>
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <div style={styles.serverInfo}>
                <div style={styles.serverName}>
                  <Wrench size={14} style={{ color: '#888' }} />
                  {server.name}
                  <span style={styles.badge(cfg.color)}>{cfg.icon} {cfg.label}</span>
                  <span style={{ ...styles.badge('#888'), fontSize: 10 }}>{server.type}</span>
                </div>
                <div style={styles.serverMeta}>
                  {server.type === 'stdio'
                    ? `${server.command ?? '?'} ${server.args?.join(' ') ?? ''}`
                    : server.url ?? '?'}
                  {server.lastConnected && (
                    <span style={{ marginLeft: 12 }}>
                      Last connected: {new Date(server.lastConnected).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
                <button
                  style={styles.btn('icon')}
                  onClick={() => handleToggle(server.id)}
                  title={server.enabled ? 'Disable' : 'Enable'}
                >
                  {server.enabled ? <Power size={14} color="#22c55e" /> : <PowerOff size={14} color="#666" />}
                </button>
                {server.status !== 'connected' && (
                  <button
                    style={styles.btn('icon')}
                    onClick={() => handleConnect(server.id)}
                    title="Connect"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
                <button
                  style={styles.btn('icon')}
                  onClick={() => handleDelete(server.id)}
                  title="Delete"
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              </div>
            </div>

            {/* Expanded tools panel */}
            {expanded && (
              <div style={styles.toolsPanel}>
                {server.error && (
                  <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, color: '#ef4444', fontSize: 12, marginBottom: 12 }}>
                    {server.error}
                  </div>
                )}

                <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tools ({server.tools.length})
                </div>

                {server.tools.length === 0 ? (
                  <div style={{ color: '#555', fontSize: 12, padding: '8px 0' }}>
                    {server.status === 'connected'
                      ? 'No tools available'
                      : 'Connect to the server to load tools'}
                  </div>
                ) : (
                  server.tools.map((tool) => (
                    <div key={tool.name} style={styles.toolItem}>
                      <Wrench size={12} style={{ color: '#666', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}>{tool.name}</span>
                      {tool.description && (
                        <span style={{ color: '#888', fontSize: 11, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tool.description}
                        </span>
                      )}
                      <button
                        style={styles.btn('icon')}
                        onClick={() => handleCopy(tool.name, `${server.id}-${tool.name}`)}
                        title="Copy tool name"
                      >
                        {copiedId === `${server.id}-${tool.name}` ? (
                          <Check size={12} color="#22c55e" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}

      {servers.length === 0 && !showAddForm && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#555', fontSize: 14 }}>
          <Wrench size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>No MCP servers configured</p>
          <p style={{ fontSize: 12, color: '#444', marginTop: 4 }}>
            Add a server to extend capabilities with external tools
          </p>
        </div>
      )}
    </div>
  )
}

export default McpServicePanel
