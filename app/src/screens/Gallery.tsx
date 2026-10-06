import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORIES, CATEGORY_NAMES, FEATURED, TOP_CATEGORIES, TOP_LAGOS, type GalleryLago } from '@/data/catalog'
import { BackButton, Screen } from '@/nav/Screen'
import { useNav, type StackEntry } from '@/nav/store'
import { Button, GlassButton } from '@/ui/buttons'
import { Icon } from '@/ui/Icon'
import s from './screens.module.css'

const nf = new Intl.NumberFormat('de-DE')

function Tile({ it, tall }: { it: GalleryLago; tall?: boolean }) {
  const { t } = useTranslation()
  const openSheet = useNav((n) => n.openSheet)
  return (
    <button type="button" className={tall ? `${s.tile} ${s.tileTall}` : s.tile} onClick={() => openSheet({ name: 'lagoInfo', info: it })}>
      <Icon name={it.icon} weight="fill" size={26} />
      <span>
        <span className={s.tileName} style={{ display: 'block' }}>{it.name}</span>
        <span className={s.sub} style={{ display: 'block' }}>{t('common.daysCap', { count: it.length })}</span>
      </span>
    </button>
  )
}

/** Gallery: Top Lagos entry, a snapping Featured carousel, then two Lagos per category. */
export function Gallery() {
  const { t } = useTranslation()
  const { push, openSheet } = useNav()
  return (
    <Screen bg="page" chrome={<BackButton />}>
      <div className={s.pageHead}>
        <h1 className={s.largeTitle}>{t('gallery.title')}</h1>
      </div>
      <button type="button" className={s.topEntry} onClick={() => push({ name: 'top' })}>
        <span className={`${s.circle} ${s.topEntryIcon}`}>
          <Icon name="trophy" weight="fill" size={22} />
        </span>
        <span style={{ flex: 1 }}>
          <span className={s.rowTitle} style={{ display: 'block' }}>{t('gallery.topLagos')}</span>
          <span className={s.sub} style={{ display: 'block' }}>{t('gallery.topSub')}</span>
        </span>
        <Icon name="caret-right" weight="bold" size={18} color="var(--label-quaternary)" />
      </button>

      <h2 className={s.h20} style={{ padding: '20px 20px 12px' }}>{t('gallery.featured')}</h2>
      <div className={`hscroll ${s.featuredScroll}`}>
        {FEATURED.map((f) => (
          <div key={f.name} className={s.featured}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={s.kicker11}>{t('gallery.kicker', { count: f.length })}</div>
              <div className={s.featuredName}>{f.name}</div>
              <div className={s.sub} style={{ marginTop: 4 }}>{f.desc}</div>
              <div style={{ marginTop: 14 }}>
                <Button size="sm" onClick={() => openSheet({ name: 'lagoInfo', info: f })}>
                  {t('gallery.startNow')}
                </Button>
              </div>
            </div>
            <div className={`${s.circle} ${s.featuredRing}`} aria-hidden>
              <Icon name={f.icon} weight="fill" size={36} />
            </div>
          </div>
        ))}
      </div>

      {CATEGORY_NAMES.map((name) => (
        <section key={name}>
          <button type="button" className={s.groupHead} onClick={() => push({ name: 'category', cat: name })}>
            <h2 className={s.h20}>{name}</h2>
            <Icon name="caret-right" weight="bold" size={18} color="var(--label-secondary)" />
          </button>
          <div className={s.grid2}>
            {CATEGORIES[name]!.slice(0, 2).map((it) => (
              <Tile key={it.name} it={it} />
            ))}
          </div>
        </section>
      ))}
    </Screen>
  )
}

/** One category: all of its Lagos, two per row. */
export function Category({ entry }: { entry: Extract<StackEntry, { name: 'category' }> }) {
  const { t } = useTranslation()
  const items = CATEGORIES[entry.cat] ?? []
  return (
    <Screen bg="page" chrome={<BackButton />}>
      <div className={s.pageHead}>
        <h1 className={s.largeTitle}>{entry.cat}</h1>
        <div className={`${s.sub} ${s.sub2}`}>{t('gallery.catSub', { count: items.length })}</div>
      </div>
      <div className={s.grid2} style={{ paddingTop: 20 }}>
        {items.map((it) => (
          <Tile key={it.name} it={it} tall />
        ))}
      </div>
    </Screen>
  )
}

/** Top Lagos: ranked list with a category filter menu. */
export function TopLagos() {
  const { t } = useTranslation()
  const { openSheet, openMenu } = useNav()
  const all = t('gallery.allCategories')
  const [cat, setCat] = useState<string | null>(null)
  const trigger = useRef<HTMLDivElement>(null)
  const list = TOP_LAGOS.filter((x) => !cat || x.cat === cat)

  const menu = () => {
    const r = trigger.current?.getBoundingClientRect()
    if (!r) return
    openMenu({
      anchor: r,
      align: 'end',
      items: [null, ...TOP_CATEGORIES].map((c) => ({ label: c ?? all, checked: c === cat, onClick: () => setCat(c) })),
    })
  }

  return (
    <Screen
      bg="page"
      chrome={
        <>
          <BackButton />
          <div ref={trigger}>
            <GlassButton label={cat ?? all} onClick={menu} />
          </div>
        </>
      }
    >
      <div className={s.pageHead}>
        <h1 className={s.largeTitle}>{t('gallery.topLagos')}</h1>
      </div>
      <ol className={s.stack10} style={{ padding: '16px 16px 0', margin: 0, listStyle: 'none' }}>
        {list.map((it, i) => (
          <li key={it.name}>
            <button type="button" className={s.topRow} onClick={() => openSheet({ name: 'lagoInfo', info: it })}>
              <span className={s.topRank}>{i + 1}</span>
              <span className={s.topBody}>
                <span style={{ width: 32, display: 'flex', justifyContent: 'center', flex: 'none' }}>
                  <Icon name={it.icon} weight="fill" size={26} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className={s.topName} style={{ display: 'block' }}>{it.name}</span>
                  <span className={s.sub} style={{ display: 'block' }}>{t('common.daysCap', { count: it.length })}</span>
                </span>
                <span className={s.topCount}>
                  <Icon name="users-three" weight="fill" size={22} />
                  <span>{nf.format(it.count ?? 0)}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </Screen>
  )
}
