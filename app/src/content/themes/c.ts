import { CLIP, ln, tile, type ThemeSet } from '../themeKit'

/* Themes, part C (7.2): Dostoevsky, Adler, Burgundy, Goethe, Machiavelli and Postmodernism.
   Same rules as parts A and B: colours from each world's own materials, every ink reads on both cover stops. */

export const THEMES_C: ThemeSet = {
  // Petersburg canal water at dusk, lit by the amber of an icon lamp. The lampada on its three chains; slanting rain.
  dostoevsky: {
    light: { paper: '#E5E9E3', accent: '#7C5414', cover: ['#3D4842', '#1C2420'], ink: '#F0C674' },
    dark: { paper: '#161D1A', accent: '#E8BE6A', cover: ['#25302A', '#0C1210'], ink: '#F0C674' },
    font: "'PT Serif',serif", glyph: 'Душа', numerals: 'roman', ornament: 'lampada', layout: 'center',
    mark: { shape: '50% 50% 4px 4px' },
    pattern: (i) => `repeating-linear-gradient(104deg,rgba(${i},.07) 0 1px,transparent 1px 10px)`,
  },
  // A Viennese parlour green and cream, the colours of a Volksheim child-guidance room. People in a ring; arcs widening upward.
  adler: {
    light: { paper: '#E2EDE3', accent: '#2F6B45', cover: ['#3D684A', '#244531'], ink: '#F7F2E6' },
    dark: { paper: '#15231A', accent: '#93D1A8', cover: ['#244030', '#0F2017'], ink: '#F1EBDD' },
    font: "Literata,serif", glyph: 'Mut', numerals: 'roman', ornament: 'kinship', layout: 'left',
    mark: { shape: '50%' },
    pattern: (i) => `repeating-radial-gradient(circle at 50% 135%,transparent 0 15px,rgba(${i},.09) 15px 16px)`,
  },
  // Philip the Good's black velvet and the gold of the Fleece. The Golden Fleece on its collar of firesteels; Saint Andrew's saltires.
  burgundy: {
    light: { paper: '#F1E8D6', accent: '#8A6418', cover: ['#2A2522', '#0F0C0B'], ink: '#E2BD5E' },
    dark: { paper: '#1E1914', accent: '#E2BD5E', cover: ['#201B18', '#0A0807'], ink: '#E5C266' },
    font: "Fondamento,serif", glyph: 'Bourgogne', numerals: 'roman', ornament: 'fusil', layout: 'frame',
    mark: { shape: '0', clip: CLIP.SHIELD },
    pattern: tile(26, 26, ln('M9 9L17 17M17 9L9 17', '.1', 1.1) + "<circle cx='0' cy='0' r='1' fill='$.12)'/><circle cx='26' cy='26' r='1' fill='$.12)'/>"),
  },
  // His colour theory's polarity: primrose yellow with deep blue by day, and the other way round at night. The Farbenkreis of 1809.
  goethe: {
    light: { paper: '#F7EFD6', accent: '#2C3F86', cover: ['#EED97A', '#DDBE4F'], ink: '#1B2A57' },
    dark: { paper: '#141A33', accent: '#F0D27A', cover: ['#1E2B5C', '#0D1430'], ink: '#F0D27A' },
    font: "'Crimson Pro',serif", glyph: 'Licht', numerals: 'roman', ornament: 'prism', layout: 'center',
    mark: { shape: '0', clip: CLIP.HEXAGON },
    pattern: (i) => `repeating-conic-gradient(from 200deg at 100% 0%,rgba(${i},.07) 0 1.5deg,transparent 1.5deg 8deg)`,
  },
  // Pietra serena, the grey-blue stone of Florence, with the red of the giglio. The fox of The Prince; San Miniato's inlay.
  machiavelli: {
    light: { paper: '#EDEAE6', accent: '#A3232B', cover: ['#4F5A62', '#2E363C'], ink: '#F4F0E8' },
    dark: { paper: '#1D2124', accent: '#F08A8F', cover: ['#2C3439', '#121619'], ink: '#EFEAE0' },
    font: "Italiana,serif", glyph: 'Stato', numerals: 'roman', ornament: 'fox', layout: 'frame', caps: true, track: '.08em',
    mark: { shape: '4px' },
    pattern: tile(28, 28, ln('M0 14L14 0L28 14L14 28Z', '.09') + ln('M14 9V19M9 14H19', '.07')),
  },
  // Memphis Group laminate: candy pink printed in black (black lit in mint at night). A Chippendale-topped tower; squiggles and dots.
  postmodern: {
    light: { paper: '#FBE3EC', accent: '#B0185E', cover: ['#F4A6C0', '#EF7FA6'], ink: '#141414' },
    dark: { paper: '#1A1820', accent: '#5FE0D0', cover: ['#1A1A1E', '#0B0B0D'], ink: '#5FE0D0' },
    font: "Syne,sans-serif", glyph: 'Simulacre', numerals: 'latin', ornament: 'quotes', layout: 'left',
    mark: { shape: '14px 0' },
    pattern: tile(44, 34, ln('M4 10q4-6 8 0t8 0 8 0', '.15', 1.4) + "<circle cx='34' cy='24' r='2.2' fill='$.13)'/><path d='M6 26l5 4M11 26l-5 4' fill='none' stroke='$.12)' stroke-width='1.2'/>"),
  },
}
