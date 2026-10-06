// IndexedDB for Dexie under Node, and a fixed "today" so date maths is deterministic.
import 'fake-indexeddb/auto'
import { setClock } from '@/lib/dates'

// 6 Oct 2026 is a Tuesday
setClock(() => new Date(2026, 9, 6, 9, 41, 0))
