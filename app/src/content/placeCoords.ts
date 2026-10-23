/* Where each Onda began and where each of its places to visit stands, as [latitude, longitude] (8.1), for the maps in the
   Full Guide ("Where it took root") and Immersion (Travel). Places are keyed by their id without the "place-" prefix; the
   same place in two Ondas shares one entry. A place that is anywhere (a dark-sky site near you) has none and gets no pin.
   Festivals are not pinned: most are held in many places, or the date matters more than the spot. */

export const ONDA_ORIGIN: Record<string, [number, number]> = {
  abbasid: [33.31, 44.36], aboriginal: [-25.0, 134.0], adler: [48.21, 16.37], animism: [39.0, -98.0], aztec: [19.43, -99.13],
  bantu: [-6.0, 30.0], burgundy: [47.32, 5.04], celtic: [52.5, -5.0], christian: [31.78, 35.23], confucian: [35.59, 116.99],
  cuba: [23.13, -82.38], cynic: [37.98, 23.73], cyrenaic: [32.82, 21.86], discordia: [33.98, -118.03], dostoevsky: [59.93, 30.34],
  egypt: [27.0, 31.2], epicurus: [37.98, 23.73], existential: [48.85, 2.35], freud: [48.22, 16.36], frisian: [53.2, 5.8],
  gandhi: [23.0, 77.0], gnostic: [31.2, 29.92], goethe: [50.98, 11.33], habsburg: [48.21, 16.37], hermes: [31.2, 29.92],
  hindu: [25.32, 82.97], hre: [50.11, 8.68], inca: [-13.53, -71.97], jain: [25.99, 85.13], johor: [1.46, 103.76],
  judaism: [31.78, 35.23], jung: [47.37, 8.54], kant: [54.71, 20.51], khmer: [13.41, 103.87], maasai: [-1.5, 35.15],
  machiavelli: [43.77, 11.25], mahayana: [34.27, 108.95], melanesia: [-6.0, 147.0], micronesia: [6.88, 158.22], mongol: [47.2, 102.8],
  mughal: [27.18, 78.01], nietzsche: [51.24, 12.12], norse: [62.0, 10.0], ottoman: [41.01, 28.98], plato: [37.98, 23.73],
  polynesia: [-16.83, -151.43], postmodern: [40.71, -74.0], qing: [39.92, 116.39], rasta: [17.99, -76.79], renaissance: [43.77, 11.25],
  rome: [41.89, 12.49], shia: [31.99, 44.31], shinto: [34.46, 136.73], sikh: [31.63, 74.87], sixties: [38.89, -77.03],
  soviet: [55.75, 37.62], stoic: [37.98, 23.72], sufi: [37.87, 32.48], sunni: [24.47, 39.61], tao: [34.06, 108.33],
  theravada: [8.31, 80.4], tibet: [29.65, 91.13], transc: [42.46, -71.35], twenties: [40.75, -73.98], ubuntu: [-26.2, 28.05],
  vedanta: [25.32, 82.97], yoruba: [7.47, 4.56], zen: [35.01, 135.77], zoroaster: [31.9, 54.37], zulu: [-28.32, 31.42],
}

export const PLACE_AT: Record<string, [number, number]> = {
  // abbasid
  samarra: [34.2, 43.87], 'mustansiriya-madrasa-and-al-mutanabbi-street': [33.34, 44.39], 'mosque-of-ibn-tulun': [30.03, 31.25],
  'museum-of-islamic-art': [25.3, 51.54], 'chester-beatty': [53.34, -6.27], 'house-of-wisdom': [25.29, 55.47],
  // aboriginal
  'uluru-and-kata-tjuta': [-25.34, 131.04], kakadu: [-12.67, 132.47], 'budj-bim': [-38.07, 141.92], 'lake-mungo': [-33.73, 143.06],
  'brewarrina-fish-traps': [-29.96, 146.86], 'the-aboriginal-tent-embassy': [-35.3, 149.13],
  // adler
  'vienna-central-cemetery': [48.15, 16.44], 'volkshochschule-ottakring': [48.21, 16.31], 'karl-marx-hof': [48.25, 16.36], 'the-wienerwald': [48.2, 16.1],
  // animism
  'national-museum-of-the-american-indian': [38.89, -77.02], 'cahokia-mounds': [38.66, -90.06], 'chaco-culture-national-historical-park': [36.06, -107.96],
  'taos-pueblo': [36.44, -105.55], 'heard-museum': [33.47, -112.07],
  // aztec
  'templo-mayor': [19.435, -99.131], 'national-museum-of-anthropology': [19.426, -99.186], xochimilco: [19.26, -99.1], tlatelolco: [19.451, -99.137],
  teotihuacan: [19.69, -98.84], malinalco: [18.95, -99.5],
  // bantu
  'great-zimbabwe': [-20.27, 30.93], 'kilwa-kisiwani': [-8.96, 39.51], 'lamu-old-town': [-2.27, 40.9], 'mbanza-kongo': [-6.27, 14.24],
  'the-kasubi-tombs': [0.33, 32.55], mapungubwe: [-22.19, 29.39],
  // burgundy
  'palace-of-the-dukes-of-burgundy': [47.32, 5.04], 'hospices-de-beaune': [47.02, 4.84], 'chartreuse-de-champmol': [47.32, 5.02], bruges: [51.21, 3.22],
  'saint-bavo-s-cathedral': [51.05, 3.73], 'bern-historical-museum': [46.94, 7.45],
  // celtic
  'the-hill-of-tara': [53.58, -6.61], 'skellig-michael': [51.77, -10.54], iona: [56.33, -6.41], 'dun-aonghasa': [53.13, -9.77], hallstatt: [47.56, 13.65],
  'the-latenium': [47.0, 6.98],
  // christian
  'the-church-of-the-holy-sepulchre': [31.778, 35.23], 'the-camino-de-santiago': [42.88, -8.54], lalibela: [12.03, 39.04], taize: [46.51, 4.68], assisi: [43.07, 12.62],
  // confucian
  qufu: [35.6, 116.99], 'temple-of-confucius-and-imperial-academy': [39.95, 116.41], 'temple-of-literature': [21.03, 105.84], sungkyunkwan: [37.59, 126.99],
  'yuelu-academy': [28.18, 112.94], 'taipei-confucius-temple': [25.07, 121.52],
  // cuba
  'old-havana': [23.14, -82.35], 'vinales-valley': [22.62, -83.71], trinidad: [21.8, -79.98], 'casa-de-la-trova': [20.02, -75.83], matanzas: [23.04, -81.58],
  'callejon-de-hamel': [23.135, -82.38], 'calle-ocho': [25.77, -80.22], 'ybor-city': [27.96, -82.44],
  // cynic, cyrenaic, plato, epicurus, stoic
  sinop: [42.03, 35.15], 'the-ancient-agora': [37.975, 23.722], 'ancient-corinth': [37.91, 22.88], delphi: [38.48, 22.5], 'the-raphael-rooms': [41.906, 12.456],
  cyrene: [32.82, 21.86], 'the-british-museum-cyrene-sculptures': [51.52, -0.13], ortygia: [37.06, 15.29], aegina: [37.75, 23.43],
  'plato-s-academy': [37.99, 23.71], 'the-stanza-della-segnatura': [41.906, 12.456],
  'the-kerameikos': [37.978, 23.718], 'herculaneum-and-the-villa-of-the-papyri': [40.81, 14.35], 'national-archaeological-museum': [40.85, 14.25],
  'the-getty-villa': [34.05, -118.56], samos: [37.75, 26.98],
  'the-painted-porch': [37.976, 23.722], 'stoa-of-attalos': [37.975, 23.724], 'equestrian-statue-of-marcus-aurelius': [41.893, 12.483], carnuntum: [48.11, 16.86],
  nicopolis: [39.0, 20.73],
  // discordia
  'an-all-night-bowling-alley': [33.98, -118.03], 'the-french-quarter': [29.96, -90.06], 'the-grave-of-emperor-norton': [37.67, -122.45],
  'mathew-street': [53.406, -2.988], 'the-isle-of-jura': [55.95, -5.95],
  // dostoevsky
  'dostoevsky-literary-memorial-museum': [59.927, 30.352], 'sennaya-square-and-stolyarny-lane': [59.927, 30.318], 'optina-pustyn': [54.05, 35.83],
  'dostoevsky-house-museum': [57.99, 31.36], 'tikhvin-cemetery': [59.92, 30.39],
  // egypt
  giza: [29.98, 31.13], 'grand-egyptian-museum': [29.99, 31.12], karnak: [25.72, 32.66], 'valley-of-the-kings': [25.74, 32.6], 'deir-el-medina': [25.73, 32.6],
  abydos: [26.18, 31.92], saqqara: [29.87, 31.22],
  // existential
  'cafe-de-flore': [48.854, 2.333], 'montparnasse-cemetery': [48.838, 2.327], lourmarin: [43.76, 5.36], tipasa: [36.59, 2.45], 'assistens-cemetery': [55.69, 12.55],
  // freud
  'sigmund-freud-museum': [48.219, 16.363], 'freud-museum-london': [51.547, -0.178], 'cafe-landtmann': [48.211, 16.361], bellevue: [48.26, 16.32],
  'freud-s-birthplace': [49.64, 18.16],
  // frisian
  leeuwarden: [53.2, 5.8], 'the-eise-eisinga-planetarium': [53.19, 5.54], 'the-terp-of-hegebeintum': [53.34, 5.84], 'the-wadden-sea': [53.4, 6.0],
  'the-wouda-pumping-station': [52.84, 5.69], 'the-red-cliff': [52.91, 5.42],
  // gandhi
  'sabarmati-ashram': [23.06, 72.58], 'sevagram-ashram': [20.73, 78.66], 'gandhi-smriti': [28.6, 77.21], 'raj-ghat': [28.64, 77.25],
  'pietermaritzburg-railway-station': [-29.6, 30.38], 'mani-bhavan': [18.96, 72.81],
  // gnostic
  'coptic-museum': [30.006, 31.23], montsegur: [42.88, 1.83], 'museum-of-catharism': [43.49, 2.37], 'cao-an': [24.73, 118.5],
  // goethe
  'goethe-s-house': [50.977, 11.327], 'goethe-s-garden-house': [50.976, 11.336], 'goethe-house': [50.111, 8.678], kickelhahn: [50.66, 10.89],
  'auerbachs-keller': [51.34, 12.375],
  // habsburg
  'the-hofburg': [48.207, 16.366], schonbrunn: [48.185, 16.312], 'the-imperial-crypt': [48.206, 16.37], 'cafe-sperl': [48.197, 16.357], 'bad-ischl': [47.71, 13.62],
  trieste: [45.65, 13.78],
  // hermes
  'siena-cathedral': [43.318, 11.329], 'embassy-of-the-free-mind': [52.37, 4.885], hermopolis: [27.78, 30.8], 'villa-medici-at-careggi': [43.81, 11.25],
  'museum-of-alchemists-and-magicians-of-old-prague': [50.087, 14.4],
  // hindu, vedanta
  varanasi: [25.32, 83.01], 'meenakshi-temple': [9.92, 78.12], 'rishikesh-and-haridwar': [30.0, 78.2], hampi: [15.33, 76.46], 'uluwatu-and-besakih': [-8.6, 115.25],
  kalady: [10.17, 76.44], sringeri: [13.42, 75.25], 'sri-ramanasramam': [12.22, 79.06], rishikesh: [30.09, 78.27], 'belur-math': [22.63, 88.36],
  // hre
  'aachen-cathedral': [50.77, 6.08], nuremberg: [49.45, 11.08], regensburg: [49.02, 12.1], 'the-imperial-treasury': [48.206, 16.365], 'the-fuggerei': [48.37, 10.9],
  'the-wartburg': [50.97, 10.31],
  // inca
  'machu-picchu': [-13.16, -72.55], 'cusco-the-qorikancha-and-sacsayhuaman': [-13.52, -71.98], ollantaytambo: [-13.26, -72.26],
  'moray-and-the-salt-pans-of-maras': [-13.33, -72.2], 'isla-del-sol': [-16.02, -69.17], ingapirca: [-2.55, -78.88],
  // jain
  shravanabelagola: [12.86, 76.49], palitana: [21.48, 71.8], ranakpur: [25.12, 73.47], 'dilwara-mount-abu': [24.61, 72.72],
  // johor
  'kota-johor-lama': [1.59, 103.98], 'kampung-makam': [1.75, 103.9], 'the-sultan-abu-bakar-state-mosque-and-the-grand-palace': [1.46, 103.75],
  'penyengat-island': [0.94, 104.41], 'kampong-glam': [1.3, 103.86], muar: [2.05, 102.57],
  // judaism
  'the-western-wall': [31.777, 35.234], 'the-jewish-quarter-josefov': [50.09, 14.42], 'the-portuguese-synagogue': [52.367, 4.908],
  'kazimierz-and-the-polin-museum': [50.05, 19.94], 'the-tenement-museum-and-eldridge-street-synagogue': [40.719, -73.99],
  // jung
  'c-g-jung-house-museum': [47.32, 8.58], 'bollingen-tower': [47.22, 8.89], 'monte-verita-and-eranos': [46.16, 8.77], 'basel-minster': [47.556, 7.592],
  kesswil: [47.6, 9.32],
  // kant
  'kant-s-tomb-and-the-cathedral': [54.706, 20.512], 'the-kant-house-at-veselovka': [54.62, 21.79], 'east-prussian-state-museum': [53.25, 10.41],
  'the-philosophers-walk': [49.416, 8.705],
  // khmer
  'angkor-wat': [13.41, 103.87], 'the-bayon-and-angkor-thom': [13.44, 103.86], 'ta-prohm': [13.435, 103.89], 'banteay-srei': [13.6, 103.96],
  'phnom-kulen': [13.57, 104.11], 'the-west-baray': [13.44, 103.78],
  // maasai
  'maasai-mara-and-its-conservancies': [-1.5, 35.14], amboseli: [-2.65, 37.26], ngorongoro: [-3.2, 35.5], 'ol-doinyo-lengai': [-2.76, 35.91],
  'the-loita-forest': [-1.75, 35.75], 'il-ngwesi': [0.35, 37.35],
  // machiavelli
  'palazzo-vecchio': [43.769, 11.256], albergaccio: [43.68, 11.2], 'basilica-of-santa-croce': [43.768, 11.262], 'orti-oricellari': [43.776, 11.245],
  // mahayana
  'mount-putuo': [30.0, 122.39], haeinsa: [35.8, 128.1], 'todai-ji': [34.69, 135.84], 'the-mogao-caves': [40.04, 94.8], 'plum-village': [44.66, 0.33],
  // melanesia
  'kuk-early-agricultural-site': [-5.78, 144.33], 'chief-roi-mata-s-domain': [-17.62, 168.17], 'tjibaou-cultural-centre': [-22.25, 166.48],
  'the-sepik-river': [-4.2, 143.6], levuka: [-17.68, 178.84], 'mount-yasur': [-19.53, 169.44],
  // micronesia
  'nan-madol': [6.84, 158.33], 'the-rock-islands': [7.25, 134.39], 'the-house-of-taga': [14.96, 145.63], 'the-stone-money-banks': [9.53, 138.12],
  'bikini-atoll': [11.6, 165.38], leluh: [5.33, 163.03],
  // mongol
  kharkhorin: [47.2, 102.82], 'burkhan-khaldun': [48.76, 109.0], 'chinggis-khaan-national-museum': [47.92, 106.92],
  'the-equestrian-statue-at-tsonjin-boldog': [47.81, 107.54], 'the-orkhon-valley': [47.55, 102.3], 'the-site-of-xanadu': [42.36, 116.18],
  // mughal
  'the-taj-mahal-and-agra-fort': [27.175, 78.04], 'fatehpur-sikri': [27.09, 77.66], 'humayun-s-tomb': [28.593, 77.25], 'the-red-fort': [28.656, 77.241],
  'lahore-fort-and-the-shalimar-gardens': [31.59, 74.31], 'the-garden-of-babur': [34.5, 69.16],
  // nietzsche
  'nietzsche-house': [46.43, 9.77], 'the-zarathustra-stone': [46.45, 9.8], 'the-nietzsche-path': [43.73, 7.36], 'piazza-carlo-alberto': [45.068, 7.685],
  rocken: [51.24, 12.12], 'the-nietzsche-archive': [50.97, 11.32],
  // norse
  ingvellir: [64.26, -21.13], 'viking-ship-museum': [55.65, 12.08], jelling: [55.76, 9.42], birka: [59.33, 17.54], 'l-anse-aux-meadows': [51.6, -55.53],
  'lofotr-viking-museum': [68.25, 13.79],
  // ottoman
  'topkap-palace': [41.011, 28.983], 'the-suleymaniye': [41.016, 28.964], 'the-grand-bazaar': [41.011, 28.968], 'edirne-and-the-selimiye-mosque': [41.68, 26.56],
  safranbolu: [41.25, 32.69], 'the-old-bridge-at-mostar': [43.34, 17.81],
  // polynesia
  taputapuatea: [-16.83, -151.36], 'rapa-nui': [-27.12, -109.37], 'waitangi-treaty-grounds': [-35.27, 174.08], 'pu-uhonua-o-honaunau': [19.42, -155.91],
  'ha-amonga-a-maui': [-21.13, -175.05], 'te-papa-tongarewa': [-41.29, 174.78],
  // postmodern
  'piazza-d-italia': [29.948, -90.066], '550-madison-avenue': [40.76, -73.97], 'the-portland-building': [45.516, -122.68], 'neue-staatsgalerie': [48.78, 9.19],
  'the-las-vegas-strip': [36.11, -115.17], 'westin-bonaventure-hotel': [34.053, -118.256],
  // qing
  'the-palace-museum': [39.916, 116.397], 'the-summer-palace': [39.999, 116.275], 'the-mountain-resort': [40.99, 117.94],
  'the-classical-gardens-of-suzhou': [31.32, 120.63], pingyao: [37.2, 112.18], 'national-palace-museum': [25.1, 121.55],
  // rasta
  'bob-marley-museum': [18.02, -76.78], 'rastafari-indigenous-village': [18.45, -77.93], pinnacle: [18.06, -76.93], shashamane: [7.2, 38.6],
  'holy-trinity-cathedral': [9.03, 38.77],
  // renaissance
  'florence-cathedral': [43.773, 11.256], 'the-uffizi': [43.768, 11.255], 'the-ducal-palace': [43.72, 12.64], 'the-vatican-museums': [41.906, 12.454],
  'santa-maria-delle-grazie': [45.466, 9.171], 'clos-luce': [47.41, 0.99],
  // rome
  'the-roman-forum-and-the-palatine': [41.89, 12.49], 'the-pantheon': [41.899, 12.477], 'pompeii-and-herculaneum': [40.75, 14.49], 'ostia-antica': [41.76, 12.29],
  'hadrian-s-wall-and-vindolanda': [54.99, -2.36], 'the-baths-of-caracalla': [41.879, 12.492],
  // shia
  karbala: [32.62, 44.03], najaf: [31.99, 44.31], mashhad: [36.29, 59.61], isfahan: [32.65, 51.67], 'bara-imambara': [26.87, 80.91],
  // shinto
  'ise-jingu': [34.455, 136.726], 'izumo-taisha': [35.4, 132.69], 'fushimi-inari-taisha': [34.967, 135.773], 'itsukushima-shrine': [34.296, 132.32],
  'meiji-jingu': [35.676, 139.699],
  // sikh
  'sri-harmandir-sahib': [31.62, 74.877], 'anandpur-sahib': [31.24, 76.5], 'gurdwara-darbar-sahib-kartarpur': [32.09, 75.02],
  'gurdwara-bangla-sahib': [28.626, 77.209], 'gurdwara-sri-guru-singh-sabha': [51.51, -0.38],
  // sixties
  'international-civil-rights-center-and-museum': [36.07, -79.79], 'edmund-pettus-bridge': [32.405, -87.02], 'the-lincoln-memorial': [38.889, -77.05],
  'haight-ashbury': [37.77, -122.447], 'bethel-woods': [41.7, -74.88], 'kennedy-space-center': [28.57, -80.65],
  // soviet
  'museum-of-occupations-and-freedom-fights': [54.687, 25.27], 'the-corner-house': [56.956, 24.12], 'grutas-park': [54.02, 24.07], 'karlag-museum': [49.66, 72.65],
  'tsiolkovsky-state-museum-of-the-history-of-cosmonautics': [54.51, 36.24], 'moscow-metro': [55.75, 37.62],
  // sufi
  'mevlana-museum': [37.87, 32.5], 'nizamuddin-dargah': [28.591, 77.242], 'ajmer-sharif-dargah': [26.456, 74.628], 'galata-mevlevi-lodge': [41.028, 28.975],
  'mausoleum-of-khoja-ahmed-yasawi': [43.3, 68.27],
  // sunni
  'mecca-and-medina': [21.42, 39.83], 'al-azhar-mosque-and-islamic-cairo': [30.046, 31.263], 'the-great-mosque-of-kairouan': [35.68, 10.1],
  'the-mosque-cathedral-of-cordoba': [37.879, -4.78], 'istiqlal-mosque': [-6.17, 106.83],
  // tao
  'wudang-mountains': [32.4, 111.0], 'white-cloud-temple': [39.9, 116.34], 'mount-tai': [36.26, 117.1], louguantai: [34.06, 108.33], 'mount-longhu': [28.12, 116.97],
  // theravada, tibet
  anuradhapura: [8.33, 80.4], 'shwedagon-pagoda': [16.8, 96.15], 'luang-prabang': [19.89, 102.13], 'wat-pah-nanachat': [15.2, 104.75], 'bodh-gaya': [24.7, 84.99],
  boudhanath: [27.72, 85.36], dharamshala: [32.22, 76.32], jokhang: [29.65, 91.13], samye: [29.33, 91.5], 'mount-kailash': [31.07, 81.31],
  // transc
  'walden-pond': [42.44, -71.34], 'ralph-waldo-emerson-house': [42.458, -71.343], 'the-old-manse': [42.469, -71.35], 'orchard-house': [42.455, -71.335],
  'authors-ridge': [42.464, -71.344], 'fruitlands-museum': [42.51, -71.6],
  // twenties
  'schomburg-center-for-research-in-black-culture': [40.814, -73.941], 'the-chrysler-building-lobby': [40.752, -73.975],
  'green-mill-cocktail-lounge': [41.969, -87.66], 'new-orleans-jazz-museum': [29.962, -90.057], 'greenwood-rising': [36.16, -95.99],
  'scott-and-zelda-fitzgerald-museum': [32.37, -86.29],
  // ubuntu
  'robben-island': [-33.81, 18.37], 'constitution-hill': [-26.19, 28.04], 'apartheid-museum': [-26.24, 28.01], 'vilakazi-street': [-26.24, 27.91],
  'nelson-mandela-capture-site': [-29.53, 30.23],
  // yoruba
  'osun-osogbo-sacred-grove': [7.76, 4.55], 'ile-ife': [7.47, 4.56], 'olumo-rock': [7.16, 3.35], 'national-museum-lagos': [6.445, 3.403], pelourinho: [-12.97, -38.51],
  // zen
  'eihei-ji': [36.05, 136.36], 'ryoan-ji': [35.034, 135.718], 'daitoku-ji': [35.044, 135.746], 'engaku-ji': [35.337, 139.548], 'shaolin-temple': [34.51, 112.94],
  'tassajara-zen-mountain-center': [36.23, -121.55],
  // zoroaster
  yazd: [31.9, 54.37], 'chak-chak-pir-e-sabz': [32.13, 54.16], 'persepolis-and-naqsh-e-rustam': [29.94, 52.89], udvada: [20.48, 72.87],
  'takht-e-soleyman': [36.6, 47.24],
  // zulu
  isandlwana: [-28.36, 30.65], 'the-emakhosini-valley': [-28.28, 31.35], ondini: [-28.32, 31.42], kwadukuza: [-29.33, 31.29], ncome: [-28.03, 30.53],
  'the-luthuli-museum': [-29.38, 31.25],
}

/** A place's coordinates, or undefined when it has none (anywhere, or a festival). */
export const placeAt = (id: string): [number, number] | undefined => PLACE_AT[id.replace(/^place-/, '')]
