import { NextRequest, NextResponse } from 'next/server'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BackupData {
  version: string
  exportedAt: string
  providers: unknown[]
  assistants: unknown[]
  topics: unknown[]
  messages: unknown[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Read all data from the SQLite database via the internal DB helper.
 * Falls back to in-memory placeholder data in dev mode.
 */
async function collectAllData(): Promise<BackupData> {
  // Try to import the runtime DB helper if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDb } = require('@/lib/db')
    const db = getDb()

    const providers = db.prepare('SELECT * FROM providers').all()
    const assistants = db.prepare('SELECT * FROM assistants').all()
    const topics = db.prepare('SELECT * FROM topics').all()
    const messages = db.prepare('SELECT * FROM messages').all()

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      providers,
      assistants,
      topics,
      messages,
    }
  } catch {
    // Dev fallback — return empty structure
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      providers: [],
      assistants: [],
      topics: [],
      messages: [],
    }
  }
}

/**
 * Write imported data into the database.
 * @param mode 'overwrite' = clear then insert; 'merge' = upsert by id
 */
async function importData(data: BackupData, mode: 'overwrite' | 'merge') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDb } = require('@/lib/db')
    const db = getDb()

    const tables = ['providers', 'assistants', 'topics', 'messages'] as const

    for (const table of tables) {
      const rows = data[table]
      if (!Array.isArray(rows) || rows.length === 0) continue

      if (mode === 'overwrite') {
        db.prepare(`DELETE FROM ${table}`).run()
      }

      // Build upsert or insert statement dynamically
      // We use INSERT OR REPLACE for SQLite upsert semantics
      const sample = rows[0]
      const columns = Object.keys(sample)
      const placeholders = columns.map(() => '?').join(', ')
      const valuesStr = columns.join(', ')

      const stmt = db.prepare(
        mode === 'overwrite'
          ? `INSERT INTO ${table} (${valuesStr}) VALUES (${placeholders})`
          : `INSERT OR REPLACE INTO ${table} (${valuesStr}) VALUES (${placeholders})`
      )

      const insertMany = db.transaction((items: Record<string, unknown>[]) => {
        for (const item of items) {
          stmt.run(...columns.map((c) => item[c]))
        }
      })

      insertMany(rows)
    }

    return true
  } catch (err) {
    console.error('[Backup API] Import error:', err)
    return false
  }
}

// ─── GET /api/backup ─────────────────────────────────────────────────────────

export async function GET() {
  try {
    const data = await collectAllData()
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cinaseek-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (err) {
    console.error('[Backup API] Export error:', err)
    return NextResponse.json(
      { error: 'Failed to export backup', detail: String(err) },
      { status: 500 }
    )
  }
}

// ─── POST /api/backup ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, mode = 'overwrite' } = body as { data: BackupData; mode?: 'overwrite' | 'merge' }

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Request body must contain a "data" object with providers, assistants, topics, messages' },
        { status: 400 }
      )
    }

    // Basic validation
    const requiredKeys = ['providers', 'assistants', 'topics', 'messages']
    for (const key of requiredKeys) {
      if (!Array.isArray(data[key])) {
        return NextResponse.json(
          { error: `"${key}" must be an array` },
          { status: 400 }
        )
      }
    }

    if (mode !== 'overwrite' && mode !== 'merge') {
      return NextResponse.json(
        { error: 'mode must be "overwrite" or "merge"' },
        { status: 400 }
      )
    }

    const ok = await importData(data, mode)

    if (!ok) {
      return NextResponse.json(
        { error: 'Import failed – check server logs' },
        { status: 500 }
      )
    }

    const imported = {
      providers: data.providers.length,
      assistants: data.assistants.length,
      topics: data.topics.length,
      messages: data.messages.length,
    }

    return NextResponse.json({
      success: true,
      mode,
      imported,
      message: `Imported ${data.messages.length} messages, ${data.topics.length} topics, ${data.assistants.length} assistants, ${data.providers.length} providers`,
    })
  } catch (err) {
    console.error('[Backup API] Import error:', err)
    return NextResponse.json(
      { error: 'Invalid request body', detail: String(err) },
      { status: 400 }
    )
  }
}
