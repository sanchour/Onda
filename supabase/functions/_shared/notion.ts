// Notion client, workspace setup and record mapping. One-way sync: app -> Notion.
// Idempotent: each record maps to one page (notion_pages), so re-running a sync updates instead of duplicating.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { env, sleep } from './http.ts'

const API = 'https://api.notion.com/v1'
const VERSION = '2022-06-28'
const MIN_GAP_MS = 340 // Notion allows an average of three requests per second per integration

export class NotionError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

/** A client bound to one workspace token. Calls are spaced to stay under the rate limit and retried with backoff. */
export class Notion {
  private last = 0
  constructor(private token: string) {}

  async call<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const wait = this.last + MIN_GAP_MS - Date.now()
      if (wait > 0) await sleep(wait)
      this.last = Date.now()
      const res = await fetch(API + path, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, 'Notion-Version': VERSION, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (res.ok) return (await res.json()) as T
      const err = (await res.json().catch(() => ({}))) as { code?: string; message?: string }
      const retryable = res.status === 429 || res.status === 409 || res.status >= 500
      if (!retryable || attempt >= 4) throw new NotionError(res.status, err.code ?? 'error', err.message ?? `Notion ${res.status}`)
      // Honour Retry-After on 429; otherwise back off 0.5s, 1s, 2s, 4s with a little jitter.
      const after = Number(res.headers.get('retry-after'))
      await sleep(after > 0 ? after * 1000 : 500 * 2 ** attempt + Math.random() * 200)
    }
  }
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${env('NOTION_CLIENT_ID')}:${env('NOTION_CLIENT_SECRET')}`)}`, 'Content-Type': 'application/json', 'Notion-Version': VERSION },
    body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  })
  const data = await res.json()
  if (!res.ok) throw new NotionError(res.status, data.error ?? 'oauth', data.error_description ?? 'Notion OAuth failed')
  return data as { access_token: string; workspace_id: string; workspace_name: string | null; bot_id: string; duplicated_template_id: string | null }
}

export async function revokeNotionToken(token: string): Promise<void> {
  await fetch(`${API}/oauth/revoke`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${env('NOTION_CLIENT_ID')}:${env('NOTION_CLIENT_SECRET')}`)}`, 'Content-Type': 'application/json', 'Notion-Version': VERSION },
    body: JSON.stringify({ token }),
  })
}

/* ── Property helpers ──────────────────────────────────────── */
/** Notion caps one text object at 2000 characters: long text becomes several. */
const rich = (s: string | null | undefined) => {
  const text = s ?? ''
  const parts: { type: 'text'; text: { content: string } }[] = []
  for (let i = 0; i < text.length && parts.length < 100; i += 2000) parts.push({ type: 'text', text: { content: text.slice(i, i + 2000) } })
  return { rich_text: parts }
}
const title = (s: string) => ({ title: [{ type: 'text', text: { content: s.slice(0, 2000) } }] })
const num = (n: number | null | undefined) => ({ number: n ?? null })
const date = (d: string | null | undefined) => ({ date: d ? { start: d } : null })
const select = (name: string | null | undefined) => ({ select: name ? { name } : null })
const multi = (names: string[]) => ({ multi_select: names.slice(0, 100).map((name) => ({ name: name.replace(/,/g, ' ').slice(0, 100) })) })
const relation = (id: string | null | undefined) => ({ relation: id ? [{ id }] : [] })

const DB_KEYS = ['lagos', 'checkIns', 'runs', 'journal', 'reflections'] as const
export type DbKey = (typeof DB_KEYS)[number]
export type DatabaseIds = Partial<Record<DbKey, string>>

const DB_TITLES: Record<DbKey, string> = { lagos: 'Lagos', checkIns: 'Check Ins', runs: 'Ondas', journal: 'Journal', reflections: 'Reflections' }

/** Database property schemas, matching the app's data model. Relations point at the Lagos and Ondas databases. */
function schema(key: DbKey, ids: DatabaseIds): Record<string, unknown> {
  const text = { rich_text: {} }
  const rel = (to: DbKey) => (ids[to] ? { relation: { database_id: ids[to], single_property: {} } } : text)
  const common = { 'Record ID': text }
  switch (key) {
    case 'lagos':
      return { Name: { title: {} }, Why: text, Icon: text, 'Length (days)': { number: {} }, Frequency: { select: { options: [{ name: 'Daily' }, { name: 'Weekdays' }, { name: 'Weekly' }] } }, Started: { date: {} }, Ended: { date: {} }, Reminder: text, Origin: text, ...common }
    case 'checkIns':
      return { Name: { title: {} }, Lago: rel('lagos'), Date: { date: {} }, Status: { select: { options: [{ name: 'Done', color: 'green' }, { name: 'Missed', color: 'red' }] } }, Note: text, ...common }
    case 'runs':
      return { Name: { title: {} }, Onda: text, 'Length (days)': { number: {} }, Started: { date: {} }, Ended: { date: {} }, State: { select: { options: [{ name: 'Active', color: 'blue' }, { name: 'Complete', color: 'green' }, { name: 'Ended', color: 'gray' }] } }, Intention: text, ...common }
    case 'journal':
      return { Name: { title: {} }, Onda: rel('runs'), Day: { number: {} }, Date: { date: {} }, Prompt: text, Entry: text, ...common }
    case 'reflections':
      return { Name: { title: {} }, Onda: rel('runs'), Date: { date: {} }, Kept: { multi_select: {} }, Answers: text, ...common }
  }
}

/** Find or create the parent page, then create any missing databases. Safe to call again after a partial failure. */
export async function ensureWorkspace(n: Notion, existing: { parent_page_id: string | null; database_ids: DatabaseIds }, templateId?: string | null) {
  let parent = existing.parent_page_id
  const parentTitle = 'Onda'
  if (!parent) {
    // Pages the user shared during authorization, top-level ones first.
    const found = await n.call<{ results: { id: string; parent: { type: string } }[] }>('POST', '/search', { filter: { property: 'object', value: 'page' }, page_size: 25 })
    const shared = templateId ?? found.results.find((p) => p.parent.type === 'workspace')?.id ?? found.results[0]?.id
    const page = await n.call<{ id: string }>('POST', '/pages', {
      parent: shared ? { type: 'page_id', page_id: shared } : { type: 'workspace', workspace: true },
      properties: { title: title('Onda').title },
      children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: 'Lagos, Ondas, journals and reflections, kept up to date by Onda. Edits made here are not sent back to the app.' } }] } }],
    })
    parent = page.id
  }
  const ids: DatabaseIds = { ...existing.database_ids }
  // Lagos and Ondas first: the other three relate to them.
  for (const key of ['lagos', 'runs', 'checkIns', 'journal', 'reflections'] as const) {
    if (ids[key]) continue
    const db = await n.call<{ id: string }>('POST', '/databases', { parent: { type: 'page_id', page_id: parent }, title: [{ type: 'text', text: { content: DB_TITLES[key] } }], properties: schema(key, ids) })
    ids[key] = db.id
  }
  return { parent_page_id: parent, parent_title: parentTitle, database_ids: ids }
}

/* ── Record -> page properties ─────────────────────────────── */
type Doc = Record<string, unknown> & { id: string }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const day = (iso: unknown) => (typeof iso === 'string' ? iso.slice(0, 10) : null)

export interface MapContext {
  /** record id -> Notion page id, for relations */
  pageOf: (collection: DbKey, recordId: string) => string | undefined
  /** record id -> document, for titles that need a related name */
  docOf: (collection: DbKey, recordId: string) => Doc | undefined
}

export function toProperties(collection: DbKey, d: Doc, ctx: MapContext): Record<string, unknown> {
  const id = { 'Record ID': rich(d.id) }
  switch (collection) {
    case 'lagos': {
      const reminder = d.reminder as { on?: boolean; time?: string } | undefined
      return { Name: title(String(d.name ?? 'Lago')), Why: rich(d.why as string), Icon: rich(d.icon as string), 'Length (days)': num(d.lengthDays as number), Frequency: select(cap(String(d.frequency ?? 'daily'))), Started: date(d.startedAt as string), Ended: date(d.endedAt as string), Reminder: rich(reminder?.on ? reminder.time : 'Off'), Origin: rich(d.origin as string), ...id }
    }
    case 'checkIns': {
      const lago = ctx.docOf('lagos', d.lagoId as string)
      return { Name: title(`${lago?.name ?? 'Lago'} · ${d.date}`), Lago: relation(ctx.pageOf('lagos', d.lagoId as string)), Date: date(d.date as string), Status: select(d.status === 'missed' ? 'Missed' : 'Done'), Note: rich(d.note as string), ...id }
    }
    case 'runs': {
      const snap = d.snapshot as { name?: string } | undefined
      return { Name: title(snap?.name ?? String(d.ondaId)), Onda: rich(d.ondaId as string), 'Length (days)': num(d.lengthDays as number), Started: date(d.startedAt as string), Ended: date(d.endedAt as string), State: select(cap(String(d.state ?? 'active'))), Intention: rich(d.intention as string), ...id }
    }
    case 'journal': {
      const run = ctx.docOf('runs', d.runId as string)
      const name = (run?.snapshot as { name?: string } | undefined)?.name ?? 'Onda'
      return { Name: title(`Day ${d.day} · ${name}`), Onda: relation(ctx.pageOf('runs', d.runId as string)), Day: num(d.day as number), Date: date(day(d.at)), Prompt: rich(d.prompt as string), Entry: rich(d.text as string), ...id }
    }
    case 'reflections': {
      const run = ctx.docOf('runs', d.runId as string)
      const snap = run?.snapshot as { name?: string; practices?: { id: string; name: string }[] } | undefined
      const kept = ((d.kept as string[]) ?? []).map((k) => snap?.practices?.find((p) => p.id === k)?.name ?? k)
      const answers = ((d.answers as { prompt: string; text: string }[]) ?? []).map((a) => `${a.prompt}\n${a.text || '(no answer)'}`).join('\n\n')
      return { Name: title(`${snap?.name ?? 'Onda'} · Final reflection`), Onda: relation(ctx.pageOf('runs', d.runId as string)), Date: date(day(d.at)), Kept: multi(kept), Answers: rich(answers), ...id }
    }
  }
}

export const isDbKey = (c: string): c is DbKey => (DB_KEYS as readonly string[]).includes(c)

/** Which collections the user's Save toggles allow. */
export function allowedCollections(s: { notionLagos: boolean; notionOndas: boolean; notionReflections: boolean }): Set<DbKey> {
  const out = new Set<DbKey>()
  if (s.notionLagos) (['lagos', 'checkIns'] as const).forEach((c) => out.add(c))
  if (s.notionOndas) (['runs', 'journal'] as const).forEach((c) => out.add(c))
  if (s.notionReflections) out.add('reflections')
  return out
}

export type { SupabaseClient }
