/* Headings in the Onda's own language (8.1, Settings > Appearance). With it on, Today and the times of day on the Ondas
   tab, and the Stats headings, are written in the language of the running Onda, and in a non-Latin script the app's
   name is written in that script too (still read "Onda"). An Onda whose language has no dependable modern form here
   (Ancient Egyptian, Quechua, Pali, the Pacific languages...) keeps English. */

import { useActiveRun, useSettings } from '@/data/hooks'

export type HeadKey = 'onda' | 'today' | 'immerse' | 'morning' | 'afternoon' | 'evening' | 'consistency' | 'activity' | 'history' | 'achievements'
type Heads = Record<HeadKey, string>

// `onda` is set only where the script is not Latin
const L = (onda: string, today: string, immerse: string, morning: string, afternoon: string, evening: string, consistency: string, activity: string, history: string, achievements: string): Heads =>
  ({ onda, today, immerse, morning, afternoon, evening, consistency, activity, history, achievements })

const LANGS: Record<string, Heads> = {
  el: L('Όντα', 'Σήμερα', 'Εμβύθιση', 'Πρωί', 'Απόγευμα', 'Βράδυ', 'Συνέπεια', 'Δραστηριότητα', 'Ιστορικό', 'Επιτεύγματα'),
  la: L('', 'Hodie', 'Immersio', 'Mane', 'Post meridiem', 'Vesper', 'Constantia', 'Actio', 'Historia', 'Res gestae'),
  ar: L('أوندا', 'اليوم', 'انغماس', 'الصباح', 'بعد الظهر', 'المساء', 'الثبات', 'النشاط', 'السجل', 'الإنجازات'),
  he: L('אונדה', 'היום', 'טבילה', 'בוקר', 'צהריים', 'ערב', 'עקביות', 'פעילות', 'היסטוריה', 'הישגים'),
  fa: L('اوندا', 'امروز', 'غوطه‌وری', 'صبح', 'بعدازظهر', 'شب', 'پایداری', 'فعالیت', 'تاریخچه', 'دستاوردها'),
  ru: L('Онда', 'Сегодня', 'Погружение', 'Утро', 'День', 'Вечер', 'Постоянство', 'Активность', 'История', 'Достижения'),
  ja: L('オンダ', '今日', '没入', '朝', '昼', '夕べ', '継続', '活動', '履歴', '実績'),
  zh: L('翁達', '今日', '沉浸', '早晨', '午後', '傍晚', '恆心', '活動', '歷程', '成就'),
  hi: L('ओंडा', 'आज', 'तल्लीनता', 'सुबह', 'दोपहर', 'शाम', 'निरंतरता', 'गतिविधि', 'इतिहास', 'उपलब्धियाँ'),
  sa: L('ओण्डा', 'अद्य', 'निमज्जनम्', 'प्रातः', 'अपराह्णः', 'सायम्', 'नैरन्तर्यम्', 'क्रिया', 'इतिहासः', 'सिद्धयः'),
  pa: L('ਓਂਡਾ', 'ਅੱਜ', 'ਲੀਨਤਾ', 'ਸਵੇਰ', 'ਦੁਪਹਿਰ', 'ਸ਼ਾਮ', 'ਨਿਰੰਤਰਤਾ', 'ਗਤੀਵਿਧੀ', 'ਇਤਿਹਾਸ', 'ਪ੍ਰਾਪਤੀਆਂ'),
  de: L('', 'Heute', 'Eintauchen', 'Morgen', 'Nachmittag', 'Abend', 'Beständigkeit', 'Aktivität', 'Verlauf', 'Erfolge'),
  fr: L('', 'Aujourd’hui', 'Immersion', 'Matin', 'Après-midi', 'Soir', 'Constance', 'Activité', 'Historique', 'Réussites'),
  es: L('', 'Hoy', 'Inmersión', 'Mañana', 'Tarde', 'Noche', 'Constancia', 'Actividad', 'Historial', 'Logros'),
  it: L('', 'Oggi', 'Immersione', 'Mattina', 'Pomeriggio', 'Sera', 'Costanza', 'Attività', 'Storico', 'Traguardi'),
  tr: L('', 'Bugün', 'Dalış', 'Sabah', 'Öğleden sonra', 'Akşam', 'Süreklilik', 'Etkinlik', 'Geçmiş', 'Başarılar'),
  ga: L('', 'Inniu', 'Tumadh', 'Maidin', 'Iarnóin', 'Tráthnóna', 'Comhsheasmhacht', 'Gníomhaíocht', 'Stair', 'Éachtaí'),
  is: L('', 'Í dag', 'Innlifun', 'Morgunn', 'Síðdegi', 'Kvöld', 'Stöðugleiki', 'Virkni', 'Saga', 'Afrek'),
  sw: L('', 'Leo', 'Kuzama', 'Asubuhi', 'Mchana', 'Jioni', 'Uthabiti', 'Shughuli', 'Historia', 'Mafanikio'),
  zu: L('', 'Namuhla', 'Ukucwila', 'Ekuseni', 'Ntambama', 'Kusihlwa', 'Ukuqina', 'Umsebenzi', 'Umlando', 'Impumelelo'),
  ms: L('', 'Hari ini', 'Penghayatan', 'Pagi', 'Tengah hari', 'Petang', 'Ketekalan', 'Aktiviti', 'Sejarah', 'Pencapaian'),
  fy: L('', 'Hjoed', 'Ûnderdompeling', 'Moarn', 'Middei', 'Jûn', 'Bestindichheid', 'Aktiviteit', 'Skiednis', 'Prestaasjes'),
}

/** Each shipped Onda's language; an Onda left out keeps English. */
const ONDA_LANG: Record<string, keyof typeof LANGS> = {
  stoic: 'el', plato: 'el', epicurus: 'el', cynic: 'el', cyrenaic: 'el', christian: 'el', gnostic: 'el', hermes: 'el',
  rome: 'la',
  abbasid: 'ar', sunni: 'ar', shia: 'ar',
  judaism: 'he',
  mughal: 'fa', sufi: 'fa', zoroaster: 'fa',
  dostoevsky: 'ru', soviet: 'ru',
  zen: 'ja', shinto: 'ja',
  confucian: 'zh', tao: 'zh', qing: 'zh', mahayana: 'zh',
  gandhi: 'hi',
  hindu: 'sa', vedanta: 'sa', jain: 'sa',
  sikh: 'pa',
  adler: 'de', freud: 'de', goethe: 'de', habsburg: 'de', jung: 'de', kant: 'de', nietzsche: 'de', hre: 'de',
  existential: 'fr', burgundy: 'fr',
  cuba: 'es',
  machiavelli: 'it', renaissance: 'it',
  ottoman: 'tr',
  celtic: 'ga',
  norse: 'is',
  bantu: 'sw',
  ubuntu: 'zu', zulu: 'zu',
  johor: 'ms',
  frisian: 'fy',
}

/** A heading in the running Onda's language when Appearance asks for it, otherwise the English one it is given. */
export function useHead() {
  const on = useSettings().nativeHeads
  const run = useActiveRun()
  const nh = on ? nativeHeads(run?.ondaId) : undefined
  return (key: HeadKey, english: string) => (nh && nh[key]) || english
}

/** The heading key for a time of day on the plan (Special keeps English). */
export const slotHead = (slot: string): HeadKey | undefined => (({ Immerse: 'immerse', Morning: 'morning', Afternoon: 'afternoon', Evening: 'evening' }) as Record<string, HeadKey>)[slot]

/** The headings for an Onda, or undefined when it keeps English. */
export function nativeHeads(ondaId: string | undefined): Heads | undefined {
  const lang = ondaId ? ONDA_LANG[ondaId] : undefined
  return lang ? LANGS[lang] : undefined
}
