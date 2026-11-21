// Базовый каталог DoseTrack. Названия и альтернативные названия взяты из утверждённой таблицы.
// Встроенные ID gabapentin / pregabalin / sertraline сохранены для совместимости с прежними записями.
export const builtinSubstanceDefinitions = [
  {
    "id": "sub_001",
    "name": "Кокаин",
    "aliases": [
      "кокс",
      "coke",
      "snow",
      "blow",
      "yayo",
      "nose candy",
      "кока"
    ],
    "catalogOrder": 1,
    "form": "Порошок / кристаллы",
    "route": "Интраназально",
    "recordUnit": "г",
    "defaultUnit": "г"
  },
  {
    "id": "sub_002",
    "name": "Амфетамин",
    "aliases": [
      "амф",
      "speed",
      "спиды",
      "фен",
      "амфет",
      "amphetamine"
    ],
    "catalogOrder": 2,
    "form": "Порошок / кристаллы",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_003",
    "name": "Метамфетамин",
    "aliases": [
      "мет",
      "meth",
      "crystal",
      "ice",
      "лёд",
      "кристалл",
      "метамф"
    ],
    "catalogOrder": 3,
    "form": "Порошок / кристаллы",
    "route": "Вдыхание паров / газов",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_004",
    "name": "Альфа-PVP",
    "aliases": [
      "α-PVP",
      "альфа",
      "флака",
      "flakka",
      "соль",
      "соли",
      "alpha-pvp"
    ],
    "catalogOrder": 4,
    "form": "Порошок / кристаллы",
    "route": "Вдыхание паров / газов",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_005",
    "name": "Мефедрон (4-MMC)",
    "aliases": [
      "4-MMC",
      "меф",
      "мяу",
      "мяу-мяу",
      "meow meow",
      "meph",
      "meow",
      "bubbles"
    ],
    "catalogOrder": 5,
    "form": "Порошок / кристаллы",
    "route": "Интраназально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_006",
    "name": "3-MMC",
    "aliases": [
      "3-MMC",
      "3-метилметкатинон",
      "метапhedrone",
      "metaphedrone"
    ],
    "catalogOrder": 6,
    "form": "Порошок / кристаллы",
    "route": "Интраназально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_007",
    "name": "MDMA",
    "aliases": [
      "МДМА",
      "MD",
      "molly",
      "моли",
      "эмка",
      "экстази",
      "ecstasy",
      "XTC"
    ],
    "catalogOrder": 7,
    "form": "Порошок / кристаллы",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_008",
    "name": "MDA",
    "aliases": [
      "МДА",
      "sass",
      "sassafras",
      "tenamfetamine"
    ],
    "catalogOrder": 8,
    "form": "Порошок / кристаллы",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_009",
    "name": "Экстази",
    "aliases": [
      "ecstasy",
      "экстази",
      "XTC",
      "E",
      "экс",
      "колёса",
      "таблетки",
      "pills",
      "beans"
    ],
    "catalogOrder": 9,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "таблетки",
    "defaultUnit": "таблетки"
  },
  {
    "id": "sub_010",
    "name": "Героин",
    "aliases": [
      "диацетилморфин",
      "horse",
      "smack",
      "brown",
      "герыч",
      "гер",
      "H"
    ],
    "catalogOrder": 10,
    "form": "Порошок / кристаллы",
    "route": "Инъекционно",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_011",
    "name": "Метадон",
    "aliases": [
      "methadone",
      "метадон",
      "метадонка"
    ],
    "catalogOrder": 11,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_012",
    "name": "Морфин",
    "aliases": [
      "морфий",
      "morphine",
      "морф",
      "морфин"
    ],
    "catalogOrder": 12,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_013",
    "name": "Фентанил",
    "aliases": [
      "fentanyl",
      "fent",
      "фент",
      "фентанил",
      "фента",
      "duragesic"
    ],
    "catalogOrder": 13,
    "form": "Другая форма",
    "route": "Трансдермально",
    "recordUnit": "мкг",
    "defaultUnit": "мкг"
  },
  {
    "id": "sub_014",
    "name": "Трамадол",
    "aliases": [
      "трам",
      "tram",
      "трамал",
      "залдиар"
    ],
    "catalogOrder": 14,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_015",
    "name": "Кодеин",
    "aliases": [
      "codeine",
      "кодеин",
      "кодтерпин",
      "терпинкод"
    ],
    "catalogOrder": 15,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_016",
    "name": "Оксикодон",
    "aliases": [
      "oxycodone",
      "oxy",
      "окси",
      "оксиконтин",
      "oxycontin"
    ],
    "catalogOrder": 16,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_017",
    "name": "Бупренорфин",
    "aliases": [
      "buprenorphine",
      "bupe",
      "буп",
      "субутекс",
      "субоксон"
    ],
    "catalogOrder": 17,
    "form": "Таблетка",
    "route": "Через слизистые",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_018",
    "name": "Тапентадол",
    "aliases": [
      "tapentadol",
      "палексия",
      "nucynta"
    ],
    "catalogOrder": 18,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_019",
    "name": "Кетамин",
    "aliases": [
      "кет",
      "K",
      "special K",
      "кей",
      "кетамин",
      "витамин K"
    ],
    "catalogOrder": 19,
    "form": "Жидкость / раствор",
    "route": "Инъекционно",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_020",
    "name": "Фенциклидин (PCP)",
    "aliases": [
      "PCP",
      "фенциклидин",
      "ангельская пыль",
      "angel dust",
      "peace pill"
    ],
    "catalogOrder": 20,
    "form": "Порошок / кристаллы",
    "route": "Вдыхание паров / газов",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_021",
    "name": "ЛСД",
    "aliases": [
      "LSD",
      "кислота",
      "acid",
      "марки",
      "blotter",
      "трип",
      "эль-эс-де"
    ],
    "catalogOrder": 21,
    "form": "Марка",
    "route": "Перорально",
    "recordUnit": "мкг",
    "defaultUnit": "мкг"
  },
  {
    "id": "sub_022",
    "name": "ДМТ",
    "aliases": [
      "DMT",
      "диметилтриптамин",
      "Dimitri",
      "spirit molecule"
    ],
    "catalogOrder": 22,
    "form": "Порошок / кристаллы",
    "route": "Вдыхание паров / газов",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_023",
    "name": "Мескалин",
    "aliases": [
      "mescaline",
      "мескалин",
      "пейот",
      "peyote",
      "сан-педро",
      "San Pedro"
    ],
    "catalogOrder": 23,
    "form": "Порошок / кристаллы",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_024",
    "name": "2C-B",
    "aliases": [
      "2C-B",
      "Nexus",
      "Venus",
      "бомбитa",
      "сибирь"
    ],
    "catalogOrder": 24,
    "form": "Порошок / кристаллы",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_025",
    "name": "2C-I",
    "aliases": [
      "2C-I",
      "2C-I"
    ],
    "catalogOrder": 25,
    "form": "Порошок / кристаллы",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_026",
    "name": "2C-E",
    "aliases": [
      "2C-E",
      "2C-E"
    ],
    "catalogOrder": 26,
    "form": "Порошок / кристаллы",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_027",
    "name": "2C-C",
    "aliases": [
      "2C-C",
      "2C-C"
    ],
    "catalogOrder": 27,
    "form": "Порошок / кристаллы",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_028",
    "name": "25I-NBOMe",
    "aliases": [
      "25I-NBOMe",
      "25I",
      "25-I",
      "N-bomb",
      "NBOMe"
    ],
    "catalogOrder": 28,
    "form": "Марка",
    "route": "Через слизистые",
    "recordUnit": "мкг",
    "defaultUnit": "мкг"
  },
  {
    "id": "sub_029",
    "name": "25C-NBOMe",
    "aliases": [
      "25C-NBOMe",
      "25C",
      "25-C",
      "N-bomb",
      "NBOMe"
    ],
    "catalogOrder": 29,
    "form": "Марка",
    "route": "Через слизистые",
    "recordUnit": "мкг",
    "defaultUnit": "мкг"
  },
  {
    "id": "sub_030",
    "name": "25B-NBOMe",
    "aliases": [
      "25B-NBOMe",
      "25B",
      "25-B",
      "N-bomb",
      "NBOMe"
    ],
    "catalogOrder": 30,
    "form": "Марка",
    "route": "Через слизистые",
    "recordUnit": "мкг",
    "defaultUnit": "мкг"
  },
  {
    "id": "sub_031",
    "name": "DOB",
    "aliases": [
      "DOB",
      "bromo-DMA",
      "bromo-STP"
    ],
    "catalogOrder": 31,
    "form": "Марка",
    "route": "Перорально",
    "recordUnit": "мкг",
    "defaultUnit": "мкг"
  },
  {
    "id": "sub_032",
    "name": "DOC",
    "aliases": [
      "DOC",
      "4-chloro-2,5-dimethoxyamphetamine"
    ],
    "catalogOrder": 32,
    "form": "Марка",
    "route": "Перорально",
    "recordUnit": "мкг",
    "defaultUnit": "мкг"
  },
  {
    "id": "sub_033",
    "name": "DOI",
    "aliases": [
      "DOI",
      "4-iodo-2,5-dimethoxyamphetamine"
    ],
    "catalogOrder": 33,
    "form": "Марка",
    "route": "Перорально",
    "recordUnit": "мкг",
    "defaultUnit": "мкг"
  },
  {
    "id": "sub_034",
    "name": "DOM (STP)",
    "aliases": [
      "DOM",
      "STP",
      "serenity tranquility peace"
    ],
    "catalogOrder": 34,
    "form": "Марка",
    "route": "Перорально",
    "recordUnit": "мкг",
    "defaultUnit": "мкг"
  },
  {
    "id": "sub_035",
    "name": "ГОМК (GHB)",
    "aliases": [
      "GHB",
      "G",
      "жидкий экстази",
      "оксибутират натрия",
      "натрия оксибат"
    ],
    "catalogOrder": 35,
    "form": "Жидкость / раствор",
    "route": "Перорально",
    "recordUnit": "мл",
    "defaultUnit": "мл"
  },
  {
    "id": "sub_037",
    "name": "1,4-бутандиол (BDO)",
    "aliases": [
      "1,4-BDO",
      "BDO",
      "1,4-бутандиол",
      "бутандиол"
    ],
    "catalogOrder": 36,
    "form": "Жидкость / раствор",
    "route": "Перорально",
    "recordUnit": "мл",
    "defaultUnit": "мл"
  },
  {
    "id": "sub_038",
    "name": "Каннабис (марихуана, гашиш, THC-концентраты)",
    "aliases": [
      "каннабис",
      "марихуана",
      "мариху",
      "трава",
      "шишки",
      "бошки",
      "weed",
      "pot",
      "ganja",
      "ганджа",
      "гашиш",
      "hash",
      "hashish",
      "THC",
      "тгк",
      "концентраты",
      "wax",
      "shatter",
      "масло"
    ],
    "catalogOrder": 37,
    "form": "Растительное сырьё",
    "route": "Вдыхание паров / газов",
    "recordUnit": "г",
    "defaultUnit": "г"
  },
  {
    "id": "sub_039",
    "name": "Псилоцибиновые грибы",
    "aliases": [
      "псилоцибин",
      "псило",
      "псилоцибиновые грибы",
      "magic mushrooms",
      "shrooms",
      "грибы",
      "кубенсис",
      "cubensis"
    ],
    "catalogOrder": 38,
    "form": "Другая форма",
    "route": "Перорально",
    "recordUnit": "г",
    "defaultUnit": "г"
  },
  {
    "id": "sub_040",
    "name": "Мухомор красный",
    "aliases": [
      "красный мухомор",
      "мухомор",
      "Amanita muscaria",
      "fly agaric"
    ],
    "catalogOrder": 39,
    "form": "Другая форма",
    "route": "Перорально",
    "recordUnit": "г",
    "defaultUnit": "г"
  },
  {
    "id": "sub_041",
    "name": "Мухомор пантерный",
    "aliases": [
      "пантерный мухомор",
      "пантерка",
      "Amanita pantherina",
      "panther cap"
    ],
    "catalogOrder": 40,
    "form": "Другая форма",
    "route": "Перорально",
    "recordUnit": "г",
    "defaultUnit": "г"
  },
  {
    "id": "pregabalin",
    "name": "Прегабалин",
    "aliases": [
      "прегабалин",
      "прега",
      "прегаба",
      "лирика",
      "lyrica",
      "pregabalin"
    ],
    "catalogOrder": 41,
    "form": "Капсула",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "gabapentin",
    "name": "Габапентин",
    "aliases": [
      "габапентин",
      "габа",
      "габ",
      "нейронтин",
      "neurontin",
      "gabapentin"
    ],
    "catalogOrder": 42,
    "form": "Капсула",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_044",
    "name": "Алпразолам",
    "aliases": [
      "алпразолам",
      "ксанакс",
      "xanax",
      "xan",
      "alp",
      "алп"
    ],
    "catalogOrder": 43,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_045",
    "name": "Клоназепам",
    "aliases": [
      "клоназепам",
      "клона",
      "ривотрил",
      "rivotril",
      "klonopin"
    ],
    "catalogOrder": 44,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_046",
    "name": "Диазепам",
    "aliases": [
      "диазепам",
      "диаз",
      "валиум",
      "valium",
      "реланиум",
      "седуксен",
      "relanium"
    ],
    "catalogOrder": 45,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_047",
    "name": "Гидазепам",
    "aliases": [
      "гидазепам",
      "гид",
      "gidazepam"
    ],
    "catalogOrder": 46,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_048",
    "name": "Тофизопам",
    "aliases": [
      "тофизопам",
      "грандаксин",
      "grandaxin"
    ],
    "catalogOrder": 47,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_049",
    "name": "Лоразепам",
    "aliases": [
      "лоразепам",
      "лораз",
      "lorazepam",
      "ativan",
      "атivan"
    ],
    "catalogOrder": 48,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_050",
    "name": "Феназепам",
    "aliases": [
      "феназепам",
      "фен",
      "феник",
      "phenazepam"
    ],
    "catalogOrder": 49,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_051",
    "name": "Гидроксизин",
    "aliases": [
      "гидроксизин",
      "атаракс",
      "atarax",
      "hydroxyzine"
    ],
    "catalogOrder": 50,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_052",
    "name": "Залеплон",
    "aliases": [
      "залеплон",
      "соната",
      "sonata",
      "zaleplon"
    ],
    "catalogOrder": 51,
    "form": "Капсула",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_053",
    "name": "Золпидем",
    "aliases": [
      "золпидем",
      "амбиен",
      "ambien",
      "stilnoct",
      "стильно́кт"
    ],
    "catalogOrder": 52,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_054",
    "name": "Зопиклон",
    "aliases": [
      "зопиклон",
      "имован",
      "imovane",
      "сомнол",
      "somnol"
    ],
    "catalogOrder": 53,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_055",
    "name": "Алиметазин (алимемазин)",
    "aliases": [
      "алимемазин",
      "алиметазин",
      "тералиджен",
      "teraligen"
    ],
    "catalogOrder": 54,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_056",
    "name": "Дифенгидрамин (димедрол)",
    "aliases": [
      "димедрол",
      "дифенгидрамин",
      "diphenhydramine",
      "benadryl"
    ],
    "catalogOrder": 55,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_057",
    "name": "Доксиламин",
    "aliases": [
      "доксиламин",
      "донормил",
      "donormyl",
      "unisom"
    ],
    "catalogOrder": 56,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_058",
    "name": "Декстрометорфан",
    "aliases": [
      "декстрометорфан",
      "DXM",
      "DM",
      "robo",
      "робо",
      "tussin"
    ],
    "catalogOrder": 57,
    "form": "Жидкость / раствор",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_059",
    "name": "Кветиапин",
    "aliases": [
      "кветиапин",
      "квет",
      "сероквель",
      "seroquel"
    ],
    "catalogOrder": 58,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_060",
    "name": "Оланзапин",
    "aliases": [
      "оланзапин",
      "зипрекса",
      "zyprexa"
    ],
    "catalogOrder": 59,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_061",
    "name": "Мемантин",
    "aliases": [
      "мемантин",
      "акатинол",
      "akatinol",
      "namenda"
    ],
    "catalogOrder": 60,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_062",
    "name": "Флупиртин",
    "aliases": [
      "флупиртин",
      "катадолон",
      "katadolon"
    ],
    "catalogOrder": 61,
    "form": "Капсула",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_063",
    "name": "Фенибут",
    "aliases": [
      "фенибут",
      "фен",
      "ноофен",
      "noofen",
      "phenibut"
    ],
    "catalogOrder": 62,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_064",
    "name": "Бупропион",
    "aliases": [
      "бупропион",
      "wellbutrin",
      "веллбутрин",
      "zyban",
      "зибан"
    ],
    "catalogOrder": 63,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_065",
    "name": "Метилфенидат",
    "aliases": [
      "метилфенидат",
      "риталин",
      "ritalin",
      "concerta",
      "концертa"
    ],
    "catalogOrder": 64,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_066",
    "name": "Лисдексамфетамин",
    "aliases": [
      "лисдексамфетамин",
      "vyvanse",
      "вывансе",
      "elvanse",
      "элвансе"
    ],
    "catalogOrder": 65,
    "form": "Капсула",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_067",
    "name": "Модафинил",
    "aliases": [
      "модафинил",
      "провигил",
      "provigil",
      "modalert",
      "мода"
    ],
    "catalogOrder": 66,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_068",
    "name": "Пароксетин",
    "aliases": [
      "пароксетин",
      "паксил",
      "paxil",
      "сероксат",
      "seroxat"
    ],
    "catalogOrder": 67,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sertraline",
    "name": "Сертралин",
    "aliases": [
      "сертралин",
      "золофт",
      "zoloft",
      "серената",
      "serenata"
    ],
    "catalogOrder": 68,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_070",
    "name": "Флуоксетин",
    "aliases": [
      "флуоксетин",
      "прозак",
      "prozac",
      "флу",
      "fluoxetine"
    ],
    "catalogOrder": 69,
    "form": "Капсула",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_071",
    "name": "Эсциталопрам",
    "aliases": [
      "эсциталопрам",
      "ципралекс",
      "cipralex",
      "селектра",
      "эсци"
    ],
    "catalogOrder": 70,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_072",
    "name": "Венлафаксин",
    "aliases": [
      "венлафаксин",
      "венла",
      "эффексор",
      "effexor",
      "велаксин",
      "velaxin"
    ],
    "catalogOrder": 71,
    "form": "Капсула",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_073",
    "name": "Дулоксетин",
    "aliases": [
      "дулоксетин",
      "симбалта",
      "cymbalta"
    ],
    "catalogOrder": 72,
    "form": "Капсула",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_074",
    "name": "Миртазапин",
    "aliases": [
      "миртазапин",
      "ремерон",
      "remeron"
    ],
    "catalogOrder": 73,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_075",
    "name": "Тразодон",
    "aliases": [
      "тразодон",
      "триттико",
      "trittico",
      "trazodone"
    ],
    "catalogOrder": 74,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_076",
    "name": "Транилципромин",
    "aliases": [
      "транилципромин",
      "парнат",
      "parnate"
    ],
    "catalogOrder": 75,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_077",
    "name": "Амитриптилин",
    "aliases": [
      "амитриптилин",
      "амитрип",
      "элавил",
      "elavil"
    ],
    "catalogOrder": 76,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_078",
    "name": "Вортиоксетин",
    "aliases": [
      "вортиоксетин",
      "бринтелликс",
      "бринтеликс",
      "trintellix",
      "vortioxetine"
    ],
    "catalogOrder": 77,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_079",
    "name": "Фенобарбитал",
    "aliases": [
      "фенобарбитал",
      "люминал",
      "luminal",
      "phenobarbital"
    ],
    "catalogOrder": 78,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_080",
    "name": "Закись азота",
    "aliases": [
      "закись азота",
      "N2O",
      "веселящий газ",
      "laughing gas",
      "nitrous",
      "nos"
    ],
    "catalogOrder": 79,
    "form": "Газ",
    "route": "Вдыхание паров / газов",
    "recordUnit": "г",
    "defaultUnit": "г"
  },
  {
    "id": "sub_081",
    "name": "Сальвинорин A",
    "aliases": [
      "сальвинорин A",
      "salvinorin A",
      "сальвия",
      "salvia",
      "шалфей предсказателей",
      "Salvia divinorum"
    ],
    "catalogOrder": 80,
    "form": "Растительное сырьё",
    "route": "Вдыхание паров / газов",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_082",
    "name": "Тропикамид",
    "aliases": [
      "тропикамид",
      "мидриацил",
      "mydriacyl",
      "tropicamide"
    ],
    "catalogOrder": 81,
    "form": "Жидкость / раствор",
    "route": "Другой способ",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  },
  {
    "id": "sub_083",
    "name": "Дапоксетин",
    "aliases": [
      "дапоксетин",
      "priligy",
      "прилиджи",
      "dapoxetine"
    ],
    "catalogOrder": 82,
    "form": "Таблетка",
    "route": "Перорально",
    "recordUnit": "мг",
    "defaultUnit": "мг"
  }
] as const
