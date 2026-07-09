// Three fictional, fully de-identified care-recipient profiles used for the demo
// and the validation harness. Fixed UUIDs make validation reproducible.
// NO real people, NO real patient data.

import type { LifeStory } from './types';

export interface SeedProfile {
  id: string;
  name: string;
  age: number;
  life_story: LifeStory;
  known_triggers: string[];
  known_calming_strategies: string[];
}

export const DEMO_USER_EMAIL = 'pilot-demo@mindbridge-echo.local';

export const SEED_PROFILES: SeedProfile[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Eleanor Hartwell',
    age: 81,
    life_story: {
      background: {
        birthplace: 'Asheville, North Carolina',
        upbringing: 'Grew up in the Blue Ridge mountains, eldest of three sisters.',
        languages: ['English'],
      },
      family: [
        { name: 'Raymond', relationship: 'late husband', notes: 'A carpenter; they were married 54 years. Met at a church dance.' },
        { name: 'Susan', relationship: 'daughter', notes: 'Lives nearby, visits on Sundays.' },
        { name: 'Michael', relationship: 'son', notes: 'A music teacher, like his mother.' },
      ],
      work: {
        occupation: 'High-school English teacher (retired)',
        career_notes: 'Taught for 38 years; adored Robert Frost and reading aloud to her class.',
      },
      interests: ['gardening', 'reading poetry', 'crossword puzzles'],
      music: ['Ella Fitzgerald', 'Louis Armstrong', 'Duke Ellington', '1940s big band jazz'],
      comfort_topics: ['her rose garden', 'favorite students', 'summer evenings on the porch'],
      key_people: ['Raymond (husband)', 'Susan (daughter)', 'her sister Ruth'],
      important_places: ['the family porch', 'her classroom', 'the Asheville farmers market'],
      routines: ['tea at 4pm', 'tending roses in the morning', 'listening to jazz records after supper'],
      communication_notes: 'Responds warmly to poetry and to being asked about her garden. Speak unhurried.',
    },
    known_triggers: ['changes to her daily routine', 'being rushed', 'loud unexpected noises'],
    known_calming_strategies: ['play Ella Fitzgerald', 'talk about her roses', 'recite a familiar poem together'],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Margaret Doyle',
    age: 78,
    life_story: {
      background: {
        birthplace: 'Boston, Massachusetts',
        upbringing: 'Raised in an Irish-American family in South Boston; learned to cook at her mother’s side.',
        languages: ['English'],
      },
      family: [
        { name: 'Francis', relationship: 'late husband', notes: 'A firefighter. Loved her Sunday roast.' },
        { name: 'Kathleen', relationship: 'daughter', notes: 'The eldest of four; a nurse like her mother.' },
        { name: 'Sean', relationship: 'son', notes: 'The jokester of the family.' },
        { name: 'Brigid & Patrick', relationship: 'younger children', notes: 'Twins.' },
      ],
      work: {
        occupation: 'Registered nurse (retired)',
        career_notes: 'Worked 30 years in a maternity ward; delivered comfort as much as care.',
      },
      interests: ['cooking', 'baking soda bread', 'knitting for grandchildren'],
      music: ['Bing Crosby', 'Irish ballads', 'Frank Sinatra'],
      comfort_topics: ['Sunday dinners', 'her four children', 'recipes handed down from her mother'],
      key_people: ['Francis (husband)', 'Kathleen (daughter)', 'her mother'],
      important_places: ['her kitchen', 'the maternity ward', 'the parish hall'],
      routines: ['morning tea with toast', 'cooking a big Sunday meal', 'evening rosary'],
      communication_notes: 'Lights up when talking about feeding her family. Reassured by a calm, motherly tone.',
    },
    known_triggers: ['feeling that her children need her and she cannot reach them', 'unfamiliar rooms at night'],
    known_calming_strategies: ['talk about cooking a family meal', 'ask her for a recipe', 'play Bing Crosby'],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Thomas Brennan',
    age: 84,
    life_story: {
      background: {
        birthplace: 'Liverpool, England',
        upbringing: 'Grew up by the docks; went to sea as a young man before settling into dock work.',
        languages: ['English'],
      },
      family: [
        { name: 'Joan', relationship: 'late wife', notes: 'Met at a dance hall; married 49 years.' },
        { name: 'David', relationship: 'son', notes: 'A lifelong Liverpool FC supporter, like his dad.' },
        { name: 'Ellie', relationship: 'granddaughter', notes: 'Calls him "Grandad Tom".' },
      ],
      work: {
        occupation: 'Dockworker (retired)',
        career_notes: 'Worked the Liverpool docks for 40 years; proud of the ships he helped load.',
      },
      interests: ['football', 'watching the tide come in', 'a pint at the local'],
      music: ['The Beatles', 'sea shanties', 'Frank Sinatra'],
      comfort_topics: ['Liverpool FC', 'his years at sea', 'the smell of the harbor'],
      key_people: ['Joan (wife)', 'David (son)', 'his old dock mates'],
      important_places: ['the Liverpool docks', 'Anfield stadium', 'the seafront'],
      routines: ['reading the match report', 'a walk along the water', 'a cup of strong tea'],
      communication_notes: 'Animated and cheerful about football and the sea. Enjoys a bit of friendly banter.',
    },
    known_triggers: ['being told he cannot go to the match', 'feeling confined indoors'],
    known_calming_strategies: ['talk about Liverpool FC', 'reminisce about his years at sea', 'play a sea shanty'],
  },
];
