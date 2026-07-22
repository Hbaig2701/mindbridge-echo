// The 11 fictional test profiles for the ACL Caregiver AI Prize Challenge
// "Smart 40" validation log, mapped from MindBridge_Echo_Testing_Profiles.xlsx
// (Kevin, 2026-07-22) into the app's LifeStory shape. Fixed UUIDs make runs
// reproducible. NO real people, NO real patient data.

import type { SeedProfile } from '../src/lib/seedProfiles';

export const SMART40_PROFILES: SeedProfile[] = [
  {
    id: '54000000-0000-4000-8000-000000000001',
    name: 'James Rivers',
    age: 80,
    life_story: {
      background: {
        birthplace: 'Ocala, Florida',
        upbringing:
          'Born in 1946 in Ocala, Florida, surrounded by sprawling horse farms, towering live oaks draped in Spanish moss, and the quiet rhythms of small-town life. Raised by hardworking parents — his father a mechanic, his mother a school cafeteria cook — James learned early that character was built through honesty, hard work, and helping neighbors. He spent his free time fishing in nearby lakes, riding his bicycle down dirt roads, playing baseball with neighborhood friends, and exploring the forests around Ocala. Summers ended with family cookouts, church socials, and evenings on the front porch listening to stories from older relatives. He graduated high school in 1964 with a strong work ethic and a reputation for being dependable — a handshake was as good as a contract.',
        languages: ['English'],
      },
      family: [
        {
          name: 'Anthony',
          relationship: 'son',
          notes:
            'His first child. High school football player who went away to the Navy for 20 years. Now lives in Tampa with his family.',
        },
        {
          name: 'Katrina',
          relationship: 'daughter',
          notes:
            'His second child — he calls her his princess. Grew up running track and became a dentist. Has 2 kids and lives in New York.',
        },
      ],
      work: {
        occupation: 'Self-employed — owned a horse & farm equipment transportation company',
        career_notes:
          'Owned a small transportation company specializing in moving horses and farm equipment. Worked with his cousin Jerry for 20 years and eventually hired 2 younger employees when he got older.',
      },
      interests: ['fishing', 'baseball', 'horse farms', 'watching ESPN', 'reading the newspaper'],
      music: [],
      comfort_topics: [
        'his children Anthony and Katrina',
        "Katrina's dental career and her two kids (his grandchildren)",
        'the New York Mets and the 1986 championship team',
        'horse farms around Ocala',
        'fishing',
        'keeping presentable for his weekly video call',
      ],
      key_people: [
        'Anthony (son)',
        'Katrina (daughter)',
        'Keith (brother)',
        'Liz (sister)',
        'Jerry (cousin, 20-year business partner)',
        'Carl (best friend)',
      ],
      important_places: ['Ocala, Florida', 'Tampa, Florida'],
      routines: [
        'wakes before 7am',
        'reads the newspaper over breakfast',
        'relaxes and watches ESPN before an afternoon nap',
        'usually skips lunch',
        'dinner by 6pm, evening news and a few shows until 10pm bedtime',
      ],
      communication_notes:
        'Good sense of humor and normally a good disposition. Does not like to talk about his ex-wife.',
    },
    known_triggers: [
      'discussions about his ex-wife (causes agitation)',
      'being rushed during morning routines',
      'being interrupted during his newspaper time',
    ],
    known_calming_strategies: [
      'talk about his children Anthony and Katrina, especially Katrina’s dental career and grandchildren',
      'mention the New York Mets and their 1986 championship team',
      'horse farms around Ocala and fishing',
      'keeping presentable for his weekly video call',
    ],
  },
  {
    id: '54000000-0000-4000-8000-000000000002',
    name: 'Maria Delgado',
    age: 84,
    life_story: {
      background: {
        birthplace: 'San Juan, Puerto Rico',
        upbringing:
          'Born in 1942 in San Juan, Puerto Rico, in a lively neighborhood filled with music, bright painted houses, and the smell of fresh bread from the corner panadería. As a girl she helped her mother prepare arroz con gandules on Sundays and learned to dance salsa from her older cousins at family parties. Her father worked at the docks, and Maria loved his stories about ships arriving from faraway places. She spent school holidays visiting relatives in Ponce — mango trees, warm evenings, neighbors sitting outside to talk after dinner. She moved to Orlando as a young adult but kept a deep affection for Puerto Rican traditions: Christmas parranda music, Three Kings Day, and family recipes from her grandmother. She lights up when asked about old songs, church festivals, childhood beaches, or her first flight from San Juan to Florida.',
        languages: ['English', 'Spanish'],
      },
      family: [
        {
          name: 'Elena',
          relationship: 'daughter',
          notes:
            'Her oldest child, lives nearby in Orlando. Retired school counselor who visits several times a week, often bringing homemade soup or pastelillos.',
        },
        {
          name: 'Rafael',
          relationship: 'son',
          notes:
            'Her younger child. Served in the Coast Guard, now lives in Jacksonville with his wife and two teenage sons. Still calls her every Sunday evening, which makes her proud.',
        },
      ],
      work: {
        occupation: 'Retired seamstress and alterations shop owner',
        career_notes:
          'Worked for many years as a seamstress, first in a department store alterations room and later in her own small shop. Made wedding dresses, hemmed school uniforms, and repaired church choir robes. Customers stayed to talk because Maria remembered everyone’s children and family news.',
      },
      interests: ['sewing', 'cooking', 'family photo albums', 'cooking shows', 'folding towels'],
      music: ['salsa', 'boleros', 'Spanish hymns', 'Christmas parranda music'],
      comfort_topics: [
        'café con leche',
        'sewing wedding dresses',
        'Puerto Rican holiday foods',
        'Three Kings Day',
        'family memories with Elena and Rafael',
        'church festivals and dancing',
      ],
      key_people: [
        'Elena (daughter)',
        'Rafael (son)',
        'Carmen (late sister)',
        'Mrs. Morales (church friend)',
        'Tomas (her first dance partner and later husband — passed away several years ago)',
      ],
      important_places: [
        'San Juan, Puerto Rico',
        'Ponce, Puerto Rico',
        'Orlando, Florida',
        'her old church sewing room',
      ],
      routines: [
        'wakes around 6:30am and has café con leche with toast',
        'soft Spanish music in the morning',
        'folding towels, looking through family photo albums, watching cooking shows',
        'light lunch and an afternoon rest',
        'dinner around 5:30pm, then prayer or a familiar TV program',
      ],
      communication_notes:
        'Responds warmly to gentle conversation, music, and Spanish phrases. Likes compliments about her cooking and sewing. May become sad if pressed about her husband’s passing — redirect toward happy family memories.',
    },
    known_triggers: [
      'conversation focusing too long on her late husband Tomas (sadness)',
      'loud arguing',
      'hurried instructions',
      'unfamiliar food smells',
    ],
    known_calming_strategies: [
      'play soft salsa, boleros, or familiar Spanish hymns',
      'offer café con leche',
      'ask about sewing wedding dresses',
      'Puerto Rican holiday foods and Three Kings Day',
      'family memories with Elena and Rafael',
    ],
  },
  {
    id: '54000000-0000-4000-8000-000000000003',
    name: 'Bill Thompson',
    age: 82,
    life_story: {
      background: {
        birthplace: 'Duluth, Minnesota',
        upbringing:
          'Born in 1944 in Duluth, Minnesota, near the cold blue waters of Lake Superior. Childhood memories full of snowy winters, ships moving through the harbor, and train whistles carrying iron ore across the region. His father worked on the railroad; his mother ran a neat, practical household where nothing was wasted. Bill learned to skate on frozen ponds, shovel snow before school, and identify freighters by their silhouettes. Summers meant fishing with uncles, berry picking, and baseball games on the radio. A quiet, observant boy who enjoyed fixing bicycles and taking apart old radios just to see how they worked. Still enjoys talking about big lake storms, the Edmund Fitzgerald song, high school hockey, and the pride Duluth people took in honest work.',
        languages: ['English'],
      },
      family: [
        {
          name: 'Mark',
          relationship: 'son',
          notes:
            'His oldest son, an electrician in Minneapolis. He and Bill used to restore old radios together in the garage.',
        },
        {
          name: 'Susan',
          relationship: 'daughter',
          notes:
            'His younger child, teaches elementary school. Sends Bill postcards from family trips because he enjoys looking at maps.',
        },
      ],
      work: {
        occupation: 'Retired railroad signal technician',
        career_notes:
          'Spent over 35 years maintaining railroad signal systems. Took pride in safety, punctuality, and solving mechanical problems in harsh weather. Coworkers trusted him because he stayed calm and methodical when equipment failed.',
      },
      interests: [
        'trains',
        'maps',
        'fishing',
        'hockey',
        'old radios and tools',
        'sorting coins',
        'classic westerns',
        'checking the weather',
      ],
      music: ['the Edmund Fitzgerald song'],
      comfort_topics: [
        'trains and railroad signal work',
        'Lake Superior weather and big lake storms',
        'fishing trips',
        'old radios',
        'hockey',
        'maps',
      ],
      key_people: [
        'Mark (son)',
        'Susan (daughter)',
        'Carol (wife)',
        'Eddie (brother)',
        'Pete (railroad crew friend)',
        'Howard (old fishing buddy)',
      ],
      important_places: [
        'Duluth harbor',
        'Lake Superior shoreline',
        'Minneapolis',
        'the family cabin near Grand Marais',
      ],
      routines: [
        'wakes early, black coffee with oatmeal',
        'checks the weather',
        'watches classic westerns, sorts coins, looks at maps',
        'lunch at noon and a short walk if weather permits',
        'dinner around 5pm, quiet time in the evening',
      ],
      communication_notes:
        'Appreciates calm, clear questions and time to answer. Does not like being rushed or corrected sharply. Good topics: trains, weather, fishing, hockey, maps, old tools.',
    },
    known_triggers: [
      'being corrected sharply',
      'being rushed to answer',
      'loud overlapping voices',
      'sudden schedule changes',
      'misplaced personal tools or maps',
    ],
    known_calming_strategies: [
      'use a calm voice and give him time to respond',
      'ask about trains, Lake Superior weather, fishing trips, old radios, hockey, maps, or railroad signal work',
      'let him sort coins or look at a familiar map',
    ],
  },
  {
    id: '54000000-0000-4000-8000-000000000004',
    name: 'Eleanor Whitfield',
    age: 79,
    life_story: {
      background: {
        birthplace: 'Bath, England',
        upbringing:
          'Born in 1947 in Bath, England, among honey-colored stone buildings, Roman history, and rainy walks to school. Her mother was a nurse and her father played piano in hotel lounges on weekends, filling the house with music from the 1940s and 1950s. She remembers helping in the garden, going to tea with her grandmother, and school trips to museums and cathedrals. As a young woman she loved reading mystery novels, riding buses through the countryside, and saving for trips to London theaters. Moved to the United States after marrying an American engineer, keeping her fondness for British sayings, proper tea, and gardens with roses and lavender. Enjoys stories about train rides, old hotels, wartime ration books her parents described, and the small rituals of afternoon tea.',
        languages: ['English', 'conversational French'],
      },
      family: [
        {
          name: 'Peter',
          relationship: 'son',
          notes:
            'Her only son, lives in Boston. Works in architecture and shares her love of old buildings and historic neighborhoods.',
        },
        {
          name: 'Amelia',
          relationship: 'granddaughter',
          notes:
            "Peter's daughter. Eleanor calls her Millie and loves hearing about her piano lessons and school plays.",
        },
      ],
      work: {
        occupation: 'Retired librarian',
        career_notes:
          'Worked as a librarian in public libraries and later in a college library. Organized reading clubs, helped students with research, and loved recommending mysteries, biographies, and travel books.',
      },
      interests: [
        'reading mystery novels (large print)',
        'gardens with roses and lavender',
        'arranging flowers',
        'British mysteries on television',
        'afternoon tea rituals',
      ],
      music: ['classical piano', 'music from the 1940s and 1950s'],
      comfort_topics: [
        'tea with toast and marmalade',
        'Bath and England',
        'gardens',
        'libraries and mystery novels',
        'London theater trips',
        "her granddaughter Millie's piano and school plays",
      ],
      key_people: [
        'Peter (son)',
        'Millie (granddaughter)',
        'Robert (late husband)',
        'Margaret (childhood friend in England)',
        'Jean (former library colleague)',
      ],
      important_places: [
        'Bath, England',
        'London theaters',
        'Boston Public Garden',
        'her college library reading room',
      ],
      routines: [
        'tea in the morning with toast and marmalade',
        'listening to classical piano',
        'reading large-print books and arranging flowers',
        'quiet afternoons',
        'early dinner with a cup of tea before bed',
      ],
      communication_notes:
        'Prefers polite, unrushed conversation and being addressed respectfully. Enjoys questions about books, gardens, music, and England. Dislikes loud television; too much noise makes her anxious.',
    },
    known_triggers: [
      'loud television',
      'crowded rooms',
      'abrupt interruptions',
      'conversations about loss or being far from England (may become quiet or tearful)',
    ],
    known_calming_strategies: [
      'offer tea, classical piano music, a flower arrangement, or a large-print book',
      'ask about Bath, gardens, libraries, mystery novels, or London theater trips',
      "ask about her granddaughter Millie's piano and school plays",
    ],
  },
  {
    id: '54000000-0000-4000-8000-000000000005',
    name: 'Samuel Brooks',
    age: 85,
    life_story: {
      background: {
        birthplace: 'Savannah, Georgia',
        upbringing:
          'Born in 1941 in Savannah, Georgia, where moss-covered oaks, church bells, and front-porch conversations shaped his early years. His grandmother Lottie raised chickens and grew collard greens, and Samuel learned to cook by watching her season food by instinct rather than recipe. He sang in the church choir as a boy and developed a deep baritone voice that made people stop and listen. In high school he played trumpet in the marching band and spent Saturdays helping his uncle Raymond at a small barber shop. He remembers street parades, gospel quartets, fish fries, and summer evenings when neighbors carried chairs outside to catch a breeze. Later moved north for work but always considered Savannah home. Enjoys talking about church music, barbershop stories, cooking, old Cadillacs, and the way the city smelled after rain.',
        languages: ['English'],
      },
      family: [
        {
          name: 'Darnell',
          relationship: 'son',
          notes:
            'His oldest child, works for the postal service. Learned to cut hair from Samuel and still keeps his clippers in the garage.',
        },
        {
          name: 'Monique',
          relationship: 'daughter',
          notes:
            'Lives in Atlanta, works as a nurse. Often reminds Samuel of his mother because she is practical and kind.',
        },
      ],
      work: {
        occupation: 'Retired barber and church choir director',
        career_notes:
          'Owned a small barber shop for nearly 30 years and directed the men’s choir at his church. His shop was known as a place for haircuts, jokes, neighborhood news, and wise advice.',
      },
      interests: ['cooking (collard greens, family recipes)', 'gospel music', 'game shows', 'sports', 'old Cadillacs'],
      music: ['gospel music', 'gospel quartets', 'church choir music'],
      comfort_topics: [
        'the barber shop',
        'the church choir',
        'Savannah',
        'cooking collard greens',
        'old Cadillacs',
        'stories about Darnell and Monique',
        'fish fries and family food traditions',
      ],
      key_people: [
        'Darnell (son)',
        'Monique (daughter)',
        'Bernice (late wife)',
        'Lottie (grandmother)',
        'Deacon Harris (choir friend)',
        'Raymond (uncle, barber shop)',
      ],
      important_places: [
        'Savannah historic district',
        'his old barber shop',
        'First Baptist Church',
        'Atlanta',
        'Tybee Island',
      ],
      routines: [
        'wakes around 7am, grits, eggs, and coffee',
        'gospel music in the morning',
        'sitting near a window, watching game shows, talking sports',
        'small lunch, nap after 2pm',
        'dinner before the evening news',
      ],
      communication_notes:
        'Enjoys humor, music, and respectful conversation — responds well when spoken to like an old friend. Avoid arguing about dates or details; ask about songs, food, family, or the barber shop instead.',
    },
    known_triggers: [
      'people arguing with his memories',
      'disrespectful speech',
      'dismissing his church and music experiences',
      'very noisy spaces',
    ],
    known_calming_strategies: [
      'use friendly humor and speak to him respectfully',
      'play gospel music',
      'ask about the barber shop, church choir, Savannah, cooking collard greens, or old Cadillacs',
      'stories about Darnell and Monique',
    ],
  },
  {
    id: '54000000-0000-4000-8000-000000000006',
    name: 'Lucia Bianchi',
    age: 81,
    life_story: {
      background: {
        birthplace: 'Chicago, Illinois',
        upbringing:
          'Born in 1945 in Chicago to Italian immigrant parents who ran a small grocery on the Near West Side. Earliest memories include the scent of basil, fresh bread, and parmesan cheese, plus the constant bell over the shop door. Lucia helped stack cans, wrap sausages, and translate for older relatives still learning English. Sundays were for Mass, pasta sauce simmering for hours, and cousins packed around a crowded table. She loved school, especially art class, and drew window displays for the grocery. Proud of Chicago’s neighborhoods, lakefront, museums, and strong immigrant families. Enjoys remembering street festivals, Italian songs, old family recipes, the first apartment she shared with her husband, and the winter blizzard when the whole block helped each other shovel out.',
        languages: ['English', 'Italian'],
      },
      family: [
        {
          name: 'Nina',
          relationship: 'daughter',
          notes:
            'Her oldest daughter, owns a small bakery. Lucia is proud that Nina still uses her grandmother’s biscotti recipe.',
        },
        {
          name: 'Marco',
          relationship: 'son',
          notes:
            'Lives in Milwaukee, repairs boats, and loves taking Lucia for slow drives near Lake Michigan when she visits.',
        },
      ],
      work: {
        occupation: 'Retired grocery co-owner and art hobbyist',
        career_notes:
          'Worked in her family grocery and later helped run it with her husband. Kept the accounts, arranged displays, greeted customers, and made hand-painted signs for holidays and sales.',
      },
      interests: ['art and drawing', 'coloring with pencils', 'cooking programs', 'family recipes', 'folding napkins'],
      music: ['Italian songs'],
      comfort_topics: [
        'the grocery store',
        'biscotti and her grandmother’s recipe',
        'Chicago street festivals',
        'art',
        'Lake Michigan drives',
        'family recipe cards and food memories',
      ],
      key_people: [
        'Nina (daughter)',
        'Marco (son)',
        'Carlo (late husband)',
        'Rosa (cousin)',
        'Mrs. Kaplan (neighbor)',
        'Miss Doyle (art teacher)',
      ],
      important_places: [
        'Chicago Near West Side',
        'Lake Michigan',
        'Little Italy',
        'Milwaukee harbor',
        "St. Anthony's Church",
      ],
      routines: [
        'coffee and a sweet roll to start the day',
        'folding napkins, listening to Italian music',
        'coloring with pencils, watching cooking programs',
        'lunch around noon, short nap',
        'dinner with pasta or soup if possible',
      ],
      communication_notes:
        'Responds well to warmth, food memories, music, and visual prompts. Enjoys hearing Italian greetings. May become frustrated when she cannot find the right word — patient encouragement helps.',
    },
    known_triggers: [
      'frustration when she cannot find the right word',
      'rushed conversations',
      'unfamiliar people touching her belongings',
      'criticism of her cooking',
    ],
    known_calming_strategies: [
      'offer reassurance and patient prompts',
      'use Italian greetings and play Italian music',
      'show family recipe cards or food photos',
      'ask about the grocery store, biscotti, Chicago street festivals, art, or Lake Michigan drives',
    ],
  },
  {
    id: '54000000-0000-4000-8000-000000000007',
    name: "Patrick O'Connor",
    age: 83,
    life_story: {
      background: {
        birthplace: 'Galway, Ireland',
        upbringing:
          'Born in 1943 outside Galway, Ireland, in a rural village where stone walls bordered green fields and neighbors knew each other’s stories for generations. His family kept sheep, and Patrick learned early how to mend fences, read the weather, and respect a good horse. Evenings were filled with fiddle music, storytelling, and cups of tea by the fire. As a teenager he worked in a hardware shop and dreamed of seeing America. He moved to New York in his twenties carrying a small suitcase, a rosary, and his mother’s advice to be useful wherever he went. Built a life in Queens but never lost his affection for Galway Bay, Irish songs, and dry humor. Enjoys talking about village fairs, Irish football, old pubs, ferry rides, and the courage it took to start over in a new country.',
        languages: ['English', 'Irish Gaelic phrases'],
      },
      family: [
        {
          name: 'Seamus',
          relationship: 'son',
          notes: 'His oldest son, a firefighter in Queens. Patrick is very proud of his bravery and community service.',
        },
        {
          name: 'Bridget',
          relationship: 'daughter',
          notes:
            'Works as a physical therapist. Loves Irish dancing and learned several reels from Patrick’s sisters.',
        },
      ],
      work: {
        occupation: 'Retired building superintendent',
        career_notes:
          'Worked for many years as a building superintendent in Queens. Fixed boilers, painted apartments, shoveled sidewalks, and knew every tenant by name. People trusted him because he could repair almost anything.',
      },
      interests: ['repairs and fixing things', 'Irish music', 'soccer', 'old movies', 'feeling useful with small tasks'],
      music: ['Irish songs', 'fiddle music'],
      comfort_topics: [
        'Galway and Galway Bay',
        'repairs and the hardware shop',
        'Irish songs',
        'soccer',
        'Queens neighborhood stories',
        'Seamus the firefighter',
        "Bridget's Irish dancing",
      ],
      key_people: [
        'Seamus (son)',
        'Bridget (daughter)',
        'Kathleen (wife)',
        'Liam (brother in Ireland)',
        'Mick (friend from the hardware shop)',
        'Mrs. Gold (his favorite tenant)',
      ],
      important_places: ['Galway, Ireland', 'Queens, New York', 'Rockaway Beach', "St. Mary's Parish Hall"],
      routines: [
        'wakes early, strong tea with toast',
        'listening to Irish music',
        'watching soccer or old movies',
        'checking that doors and windows are secure',
        'lunch at midday, a walk if possible, quiet evening after dinner',
      ],
      communication_notes:
        'Likes friendly joking and direct, respectful questions. Good topics: Ireland, repairs, music, family, neighborhood stories. Dislikes being fussed over and appreciates feeling useful.',
    },
    known_triggers: [
      'being fussed over or treated as helpless',
      'being prevented from helping with simple tasks',
      'discussions about leaving Ireland or losing independence (may become withdrawn)',
    ],
    known_calming_strategies: [
      'let him feel useful with safe small tasks such as folding towels or checking a window',
      'ask about Galway, repairs, Irish songs, soccer, or hardware shop memories',
      'Queens stories, Seamus the firefighter, or Bridget’s Irish dancing',
    ],
  },
  {
    id: '54000000-0000-4000-8000-000000000008',
    name: 'Gloria Campbell',
    age: 78,
    life_story: {
      background: {
        birthplace: 'Kingston, Jamaica',
        upbringing:
          'Born in 1948 in Kingston, Jamaica — a childhood full of market sounds, church hymns, warm rain, and the smell of jerk seasoning drifting from roadside stands. Her mother Ivy sold fruit at Coronation Market and her father drove a bus through busy city streets. Gloria learned to be lively, resourceful, and proud of her island roots. She loved school recitations, netball games, and Sunday dinners with rice and peas, plantains, and chicken. As a young woman she moved to Miami to work and send money home. She never forgot the rhythms of Jamaica: reggae, ska, church singing, and neighbors who looked after each other. Enjoys telling stories about market days, mango season, Bob Marley songs, family reunions, and the courage it took to build a life in a new country.',
        languages: ['English', 'Jamaican Patois'],
      },
      family: [
        {
          name: 'Denise',
          relationship: 'daughter',
          notes:
            'Lives in Miramar, Florida, and works in banking. Brings Gloria Jamaican patties from her favorite bakery.',
        },
        {
          name: 'Andre',
          relationship: 'son',
          notes: 'Coaches youth soccer. Gloria says he was always running from the time he could walk.',
        },
      ],
      work: {
        occupation: 'Retired home health aide',
        career_notes:
          'Cared for elderly clients for many years, helping with meals, bathing, conversation, and household routines. Families appreciated her cheerful manner, firm kindness, and ability to make people feel dignified.',
      },
      interests: ['gospel and reggae music', 'soccer highlights', 'light sweeping and folding laundry', 'Jamaican cooking'],
      music: ['reggae', 'ska', 'gospel', 'Bob Marley songs', 'church singing'],
      comfort_topics: [
        'Kingston markets and Coronation Market',
        'mango season',
        'Jamaican patties',
        'church friends',
        'rice and peas',
        'Denise and Andre',
        'youth soccer',
      ],
      key_people: [
        'Denise (daughter)',
        'Andre (son)',
        'Marcia (sister in Jamaica)',
        'Sister Pearl (church friend)',
        'Ivy (late mother)',
        'Mrs. Rosen (former client)',
      ],
      important_places: [
        'Kingston, Jamaica',
        'Coronation Market',
        'Miami, Florida',
        'Miramar',
        'her church fellowship hall',
      ],
      routines: [
        'gospel or reggae music after breakfast',
        'warm tea and fruit',
        'light sweeping or folding laundry',
        'watching soccer highlights',
        'lunch with familiar flavors, afternoon rest, calling family in the evening',
      ],
      communication_notes:
        'Responds best to warm, upbeat conversation and music. Enjoys Jamaican sayings and food memories. May gently correct people who mispronounce family names — repeat names carefully.',
    },
    known_triggers: [
      'family names mispronounced repeatedly',
      'conversation that feels cold or impersonal',
      'harsh tones',
      'homesickness for Jamaica',
    ],
    known_calming_strategies: [
      'warm, upbeat conversation and familiar music (reggae or gospel)',
      'ask about Kingston markets, mango season, Jamaican patties, or church friends',
      'rice and peas, Denise, Andre, or youth soccer',
    ],
  },
  {
    id: '54000000-0000-4000-8000-000000000009',
    name: 'Harold Nakamura',
    age: 80,
    life_story: {
      background: {
        birthplace: 'Honolulu, Hawaii',
        upbringing:
          'Born in 1946 in Honolulu, Hawaii, in a multigenerational Japanese American family. Childhood included beach picnics, shave ice, ukulele music, and helping his grandfather Hiroshi tend a small vegetable garden. His parents taught him respect for elders, patience, and the value of quiet effort. He remembers walking to school in warm rain, fishing from piers, and celebrating both local Hawaiian traditions and Japanese holidays like Boys’ Day. Became fascinated with airplanes as a child because military and commercial planes often crossed the island skies. Enjoys talking about Honolulu neighborhoods, Pearl Harbor history, island foods, fishing, family gardens, and the way neighbors shared food after a big cookout.',
        languages: ['English', 'some Japanese'],
      },
      family: [
        {
          name: 'Kenji',
          relationship: 'son',
          notes:
            'Works in Seattle as a software engineer. Sends Harold photos of gardens and airplanes because those always catch his interest.',
        },
        {
          name: 'Lisa',
          relationship: 'daughter',
          notes: 'Lives on Oahu. She is a teacher and visits with her children on weekends when possible.',
        },
      ],
      work: {
        occupation: 'Retired aircraft maintenance supervisor',
        career_notes:
          'Worked in aircraft maintenance for more than 35 years. Inspected engines, trained younger mechanics, and was known for being precise, calm, and safety-focused.',
      },
      interests: ['airplanes and aviation documentaries', 'gardening', 'fishing', 'ukulele music', 'sitting outside with plants'],
      music: ['soft ukulele music'],
      comfort_topics: [
        'Honolulu',
        'aircraft maintenance',
        'Pearl Harbor history',
        'ukulele music',
        'family gardens and his grandfather Hiroshi',
        'Kenji and Lisa',
        'island foods',
        'fishing',
      ],
      key_people: [
        'Kenji (son)',
        'Lisa (daughter)',
        'May (wife)',
        'Hiroshi (grandfather)',
        'Alika (fishing friend)',
        'Ben (former coworker)',
      ],
      important_places: ['Honolulu', 'Waikiki Beach', 'Pearl Harbor', 'Seattle', 'the family garden on Oahu'],
      routines: [
        'wakes around 6am, rice, eggs, or toast with tea',
        'sitting outside looking at plants',
        'listening to soft ukulele music',
        'watching aviation documentaries',
        'predictable schedule: lunch at noon, dinner early',
      ],
      communication_notes:
        'Appreciates gentle conversation; does not like being pressured to speak quickly. Visual prompts (airplane photos, garden pictures, maps) work well. Responds warmly to respectful greetings and a calm tone.',
    },
    known_triggers: [
      'being pressured to speak quickly',
      'chaotic environments',
      'sudden schedule changes',
      'clutter or loud mechanical noises',
    ],
    known_calming_strategies: [
      'keep the tone calm and respectful',
      'show airplane, garden, fishing, or Hawaii photos',
      'ask about Honolulu, aircraft maintenance, Pearl Harbor, ukulele music, or family gardens',
      'Kenji, Lisa, or island foods',
    ],
  },
  {
    id: '54000000-0000-4000-8000-000000000010',
    name: 'Colette Dubois',
    age: 86,
    life_story: {
      background: {
        birthplace: 'New Orleans, Louisiana',
        upbringing:
          'Born in 1940 in New Orleans, Louisiana, into a Creole family that loved food, music, and storytelling. Grew up hearing jazz from open windows, smelling gumbo simmering in kitchens, and watching Mardi Gras parades with wide-eyed excitement. Her mother taught her French phrases and old recipes, while her father Jules played clarinet in a weekend band. Colette learned to dance early and loved the elegance of Sunday dresses, church hats, and family gatherings after Mass. Worked hard in school and became known for her quick wit and graceful handwriting. Enjoys memories of streetcars, beignets, brass bands, family cookouts, and the first time she saw the French Quarter lit up at night. She often smiles at familiar jazz standards or talk of Louisiana cooking.',
        languages: ['English', 'French phrases'],
      },
      family: [
        {
          name: 'Yvette',
          relationship: 'daughter',
          notes:
            'Lives in Baton Rouge. Inherited Colette’s love of cooking and often brings red beans and rice.',
        },
        {
          name: 'Louis',
          relationship: 'son',
          notes: 'Plays trumpet in a community band. Colette says music runs in the family.',
        },
      ],
      work: {
        occupation: 'Retired school secretary',
        career_notes:
          'Worked as an elementary school secretary for many years. Knew every student’s name, handled busy mornings with grace, and kept the office organized during storms, assemblies, and report card days.',
      },
      interests: [
        'jazz music',
        'old recipe cards',
        'wearing a scarf or pretty sweater',
        'watching dance programs',
        'Louisiana cooking',
      ],
      music: ['jazz standards', 'brass band music', 'her father Jules’ clarinet'],
      comfort_topics: [
        'New Orleans cooking',
        'Mardi Gras parades',
        'beignets',
        'streetcars',
        'school office stories',
        'Yvette',
        'Louis playing trumpet',
        'her father Jules the clarinet player',
      ],
      key_people: [
        'Yvette (daughter)',
        'Louis (son)',
        'Raymond (late husband)',
        'Celeste (cousin)',
        'Father Martin (from church)',
        'Jules (her father, the clarinet player)',
      ],
      important_places: [
        'New Orleans French Quarter',
        'St. Charles streetcar line',
        'Baton Rouge',
        'the family church',
        'City Park',
      ],
      routines: [
        'coffee with chicory and something sweet in the morning',
        'jazz music, looking at old recipe cards',
        'wearing a scarf or pretty sweater',
        'watching dance programs',
        'lunch on time, calm evenings',
      ],
      communication_notes:
        'Enjoys compliments, music, and lively but respectful conversation. Likes French greetings and food topics. Avoid frightening storm stories unless she brings them up first.',
    },
    known_triggers: [
      'severe storm stories (frightening)',
      'loud sudden noises',
      'chaotic rooms',
      'her appearance or dignity being ignored',
    ],
    known_calming_strategies: [
      'play gentle jazz or brass band music at low volume',
      'compliment her scarf or sweater',
      'ask about New Orleans cooking, Mardi Gras parades, beignets, streetcars, or school office stories',
      'Yvette, or Louis playing trumpet',
    ],
  },
  {
    id: '54000000-0000-4000-8000-000000000011',
    name: 'Anika Müller',
    age: 77,
    life_story: {
      background: {
        birthplace: 'Hamburg, Germany',
        upbringing:
          'Born in 1949 in Hamburg, Germany, a port city where ships, gulls, and gray skies were part of daily life. Her childhood home was modest but full of order, music, and strong coffee smells from the kitchen. Her father worked at the harbor and her mother Liesel was a dressmaker who taught Anika to sew buttons, mend hems, and take pride in neat work. Anika loved watching ships on the Elbe River and imagining where they were going. As a young adult she trained as a bookkeeper and later moved to Cincinnati after marrying an American musician she met at a dance hall. She kept many German traditions, including Christmas cookies, Advent candles, and careful household routines. Enjoys conversations about ports, sewing, classical music, holiday baking, train travel, and the excitement of arriving in America.',
        languages: ['English', 'German'],
      },
      family: [
        {
          name: 'Thomas',
          relationship: 'son',
          notes:
            'Lives in Cincinnati. He is an accountant and shares her careful nature with numbers and records.',
        },
        {
          name: 'Greta',
          relationship: 'daughter',
          notes:
            'Teaches music. Anika loves hearing Greta play piano, especially gentle classical pieces.',
        },
      ],
      work: {
        occupation: 'Retired bookkeeper',
        career_notes:
          'Worked as a bookkeeper for a family-owned furniture business. Maintained ledgers, payroll records, and invoices with exceptional accuracy. Coworkers admired her punctuality and quiet humor.',
      },
      interests: [
        'classical music',
        'simple sewing tasks',
        'organizing drawers',
        'travel photos',
        'holiday baking (Christmas cookies)',
        'ships and the harbor',
      ],
      music: ['classical music', 'gentle classical piano pieces'],
      comfort_topics: [
        'Hamburg harbor and ships on the Elbe',
        'Christmas cookies and Advent baking',
        'bookkeeping and numbers',
        'sewing',
        "Greta's piano",
        "Thomas's accounting work",
      ],
      key_people: [
        'Thomas (son)',
        'Greta (daughter)',
        'Daniel (late husband)',
        'Liesel (mother)',
        'Ingrid (friend in Germany)',
        'Mr. Feldman (former employer)',
      ],
      important_places: [
        'Hamburg harbor',
        'the Elbe River',
        'Cincinnati',
        'the local music hall',
        'the family kitchen at Christmas',
      ],
      routines: [
        'structured morning with coffee, toast, and the newspaper',
        'classical music',
        'simple sewing tasks and organizing drawers',
        'looking at travel photos',
        'predictable meal times, quiet bedtime routine',
      ],
      communication_notes:
        'Likes clear explanations and calm surroundings. May become unsettled by clutter or sudden changes. Good topics: music, Germany, baking, ships, sewing, and numbers.',
    },
    known_triggers: [
      'clutter or disorderly surroundings',
      'sudden changes or lateness',
      'vague instructions',
      'instructions repeated too loudly',
    ],
    known_calming_strategies: [
      'provide clear, calm explanations and a predictable routine',
      'play soft classical music',
      'offer simple organizing or sewing tasks',
      'ask about Hamburg harbor, Christmas cookies, bookkeeping, ships, Greta’s piano, or Thomas’s accounting work',
    ],
  },
];
