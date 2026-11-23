// Coordinates come from OpenStreetMap (Nominatim lookups, November 2026).
// Spend bands and noise levels are the editors' rough sense of a visit, not official prices.
// Opening hours and fees are deliberately left out: they change, so every card says "Check before you go".

export const MOODS = [
  { id: 'quiet', label: 'Quiet corners', line: 'Somewhere nobody needs you', emblem: 'window' },
  { id: 'bookish', label: 'Bookish places', line: 'Shelves, paper and slow afternoons', emblem: 'book' },
  { id: 'focus', label: 'Somewhere to focus', line: 'A table, a lamp, three good hours', emblem: 'lantern' },
  { id: 'air', label: 'Open air', line: 'Old trees and a long walk', emblem: 'tree' },
  { id: 'creative', label: 'Creative spaces', line: 'Galleries, tilework, ink', emblem: 'ink' },
  { id: 'conversation', label: 'Conversations', line: 'Chai that lasts two hours', emblem: 'chairs' },
  { id: 'hidden', label: 'Hidden gems', line: 'Doors most people walk past', emblem: 'key' },
]

export const SPEND = [
  { id: 'free', label: 'Free' },
  { id: 'u500', label: 'Under Rs. 500' },
  { id: 'mid', label: 'Rs. 500–1,000' },
  { id: 'flex', label: 'Flexible' },
]
export const SPEND_LABEL = { free: 'Free', u500: 'Under Rs. 500', mid: 'Rs. 500–1,000', flex: 'Rs. 1,000 +' }
const SPEND_RANK = { free: 0, u500: 1, mid: 2, flex: 3 }
export const spendFits = (placeSpend, wanted) => !wanted || SPEND_RANK[placeSpend] <= SPEND_RANK[wanted]

export const COMPANY = [
  { id: 'solo', label: 'Just me' },
  { id: 'friend', label: 'A friend' },
  { id: 'group', label: 'A group' },
  { id: 'meet', label: 'Open to meeting people' },
]

export const NOISE = ['', 'Hushed', 'A soft murmur', 'Lively']

const ENTRY_TICKET = 'Ticketed. Check the current fee at the gate.'
const ENTRY_MOSQUE = 'Free. Dress modestly, carry a scarf, and avoid prayer times.'
const ENTRY_LIBRARY = 'Membership or a visitor pass may be needed. Check before you go.'
const ENTRY_PARK = 'Public park. Check timings before you go.'
const OLD_CITY = 'Narrow, uneven lanes. Step-free access is limited.'

export const PLACES = [
  {
    id: 'bagh-e-jinnah', name: 'Bagh-e-Jinnah', urdu: 'باغِ جناح', area: 'Mall Road',
    lat: 31.5523964, lng: 74.3288503, moods: ['air', 'quiet'], emblem: 'tree',
    spend: 'free', noise: 1, solo: true, company: ['solo', 'friend', 'group'], collections: ['sukoon'],
    before: { wifi: 'Don’t count on it. It’s a garden.', seating: 'Benches and lawns under old trees.', access: 'Wide paths, mostly level.', entry: ENTRY_PARK },
    note: 'Come in the late afternoon, walk until the traffic noise disappears, and sit wherever the light lands.',
  },
  {
    id: 'quaid-library', name: 'Quaid-e-Azam Library', urdu: 'قائداعظم لائبریری', area: 'Bagh-e-Jinnah',
    lat: 31.5545645, lng: 74.3317492, moods: ['bookish', 'focus', 'quiet'], emblem: 'window',
    spend: 'u500', noise: 1, solo: true, company: ['solo'], collections: ['sukoon', 'kitab'],
    before: { wifi: 'Ask at the desk.', seating: 'Reading-room tables.', access: 'Old building. Ask about step-free entry.', entry: ENTRY_LIBRARY },
    note: 'A reading room inside a garden. Bring a pencil, leave your phone face down.',
  },
  {
    id: 'alhamra', name: 'Alhamra Arts Council', urdu: 'الحمرا', area: 'Mall Road',
    lat: 31.5585334, lng: 74.3299176, moods: ['creative', 'conversation'], emblem: 'ink',
    spend: 'flex', noise: 2, solo: true, company: ['solo', 'friend', 'group', 'meet'], collections: ['baithak'],
    before: { wifi: 'Not something to rely on.', seating: 'Halls, courtyards and steps.', access: 'Ask staff about step-free routes.', entry: 'Depends on the event. Check the programme before you go.' },
    note: 'Check what’s on, then arrive early and linger in the courtyards before the hall doors open.',
  },
  {
    id: 'lahore-museum', name: 'Lahore Museum', urdu: 'لاہور عجائب گھر', area: 'Mall Road',
    lat: 31.5682508, lng: 74.3082276, moods: ['creative', 'quiet'], emblem: 'ink',
    spend: 'u500', noise: 2, solo: true, company: ['solo', 'friend'], collections: ['sukoon'],
    before: { wifi: 'Don’t count on it.', seating: 'A few benches between galleries.', access: 'Ask at the entrance about step-free routes.', entry: ENTRY_TICKET },
    note: 'Pick one gallery and stay with it. The miniatures reward the slowest possible looking.',
  },
  {
    id: 'punjab-library', name: 'Punjab Public Library', urdu: 'پنجاب پبلک لائبریری', area: 'Library Road, Anarkali',
    lat: 31.5673995, lng: 74.3076127, moods: ['bookish', 'focus', 'quiet', 'hidden'], emblem: 'book',
    spend: 'u500', noise: 1, solo: true, company: ['solo'], collections: ['kitab', 'chhoti'],
    before: { wifi: 'Ask at the desk.', seating: 'Long reading tables.', access: 'Old building. Ask about step-free entry.', entry: ENTRY_LIBRARY },
    note: 'Old reading rooms around the Baradari. The kind of quiet that makes you read a page twice.',
  },
  {
    id: 'pak-tea-house', name: 'Pak Tea House', urdu: 'پاک ٹی ہاؤس', area: 'Mall Road, Anarkali',
    lat: 31.5675048, lng: 74.3118355, moods: ['conversation', 'bookish'], emblem: 'cup',
    spend: 'u500', noise: 2, solo: true, company: ['solo', 'friend', 'meet'], collections: ['baithak', 'kitab'],
    before: { wifi: 'Ask at the counter.', seating: 'Café tables, best by the wall.', access: 'Street-level entrance.', entry: 'No entry fee. You’re here for the chai.' },
    note: 'For decades the table of Lahore’s writers and poets. Order chai, stay longer than you meant to.',
  },
  {
    id: 'dyal-singh', name: 'Dyal Singh Trust Library', urdu: 'دیال سنگھ ٹرسٹ لائبریری', area: 'Nisbet Road',
    lat: 31.5695391, lng: 74.3214423, moods: ['bookish', 'focus', 'quiet', 'hidden'], emblem: 'book',
    spend: 'u500', noise: 1, solo: true, company: ['solo'], collections: ['kitab', 'chhoti', 'sukoon'],
    before: { wifi: 'Ask at the desk.', seating: 'Reading-room desks.', access: 'Ask about step-free entry.', entry: ENTRY_LIBRARY },
    note: 'Easy to miss from the road and hard to leave once you’ve found your desk.',
  },
  {
    id: 'readings', name: 'Readings', urdu: 'ریڈنگز', area: 'Main Boulevard, Gulberg',
    lat: 31.519828, lng: 74.346436, moods: ['bookish', 'quiet'], emblem: 'book',
    spend: 'free', noise: 1, solo: true, company: ['solo', 'friend'], collections: ['kitab'],
    before: { wifi: 'Not the point. It’s a bookshop.', seating: 'Some. Mostly you browse.', access: 'Ask staff about lifts between floors.', entry: 'Free to browse.' },
    note: 'Browsing costs nothing. Give yourself an hour and one rule: open every book whose spine you don’t recognise.',
  },
  {
    id: 'ferozsons', name: 'Ferozsons', urdu: 'فیروز سنز', area: 'DHA Phase 5',
    lat: 31.4698484, lng: 74.4035803, moods: ['bookish'], emblem: 'book',
    spend: 'free', noise: 1, solo: true, company: ['solo', 'friend'], collections: ['kitab'],
    before: { wifi: 'Not the point. It’s a bookshop.', seating: 'Limited.', access: 'Check before you go.', entry: 'Free to browse.' },
    note: 'A long-standing Lahore name in books. Good for a slow wander through the aisles before dinner.',
  },
  {
    id: 'daftarkhwan', name: 'Daftarkhwan Downtown', urdu: '', area: 'Gulberg',
    lat: 31.5272139, lng: 74.3527769, moods: ['focus', 'conversation'], emblem: 'lantern',
    spend: 'flex', noise: 2, solo: true, company: ['solo', 'meet'], collections: [],
    before: { wifi: 'It’s a coworking space, so Wi-Fi is the point. Confirm day-pass terms first.', seating: 'Desks and shared tables.', access: 'Check before you go.', entry: 'Paid passes. Check current options before you go.' },
    note: 'When the café is too loud and home is too quiet. Book a day, bring headphones, finish the thing.',
  },
  {
    id: 'racecourse-park', name: 'Race Course Park', urdu: 'ریس کورس پارک', area: 'Jail Road',
    lat: 31.5438807, lng: 74.3365616, moods: ['air'], emblem: 'tree',
    spend: 'free', noise: 2, solo: true, company: ['solo', 'friend', 'group'], collections: ['sukoon'],
    before: { wifi: 'No.', seating: 'Benches along the walking paths.', access: 'Level paths.', entry: ENTRY_PARK },
    note: 'Walk one loop fast, then a second one slowly. The second one is the one you’ll remember.',
  },
  {
    id: 'model-town-park', name: 'Model Town Park', urdu: 'ماڈل ٹاؤن پارک', area: 'Model Town',
    lat: 31.4844876, lng: 74.3262296, moods: ['air', 'quiet'], emblem: 'tree',
    spend: 'free', noise: 1, solo: true, company: ['solo', 'friend'], collections: ['sukoon'],
    before: { wifi: 'No.', seating: 'Benches on the inner paths.', access: 'Level paths.', entry: ENTRY_PARK },
    note: 'A large, round park that suits early mornings. Take the inner paths for shade.',
  },
  {
    id: 'gulshan-park', name: 'Gulshan-e-Iqbal Park', urdu: 'گلشنِ اقبال پارک', area: 'Allama Iqbal Town',
    lat: 31.5139069, lng: 74.2890468, moods: ['air'], emblem: 'tree',
    spend: 'u500', noise: 3, solo: false, company: ['friend', 'group'], collections: [],
    before: { wifi: 'No.', seating: 'Lawns and benches.', access: 'Mostly level.', entry: ENTRY_PARK },
    note: 'Busy and cheerful on weekends. Go with people, not for solitude.',
  },
  {
    id: 'jallo-park', name: 'Jallo Park', urdu: 'جلو پارک', area: 'Jallo, east Lahore',
    lat: 31.5717696, lng: 74.4745342, moods: ['air', 'hidden'], emblem: 'tree',
    spend: 'u500', noise: 2, solo: false, company: ['friend', 'group'], collections: ['chhoti'],
    before: { wifi: 'No.', seating: 'Open lawns. Bring a sheet.', access: 'Large grounds with some uneven paths.', entry: ENTRY_PARK },
    note: 'A long drive east, so make a day of it: a sheet, a flask, nowhere to be.',
  },
  {
    id: 'shalimar', name: 'Shalimar Gardens', urdu: 'شالامار باغ', area: 'Baghbanpura',
    lat: 31.5871289, lng: 74.3821585, moods: ['air', 'creative', 'quiet'], emblem: 'tree',
    spend: 'u500', noise: 2, solo: true, company: ['solo', 'friend', 'group'], collections: ['sukoon'],
    before: { wifi: 'No.', seating: 'Terraces and pavilions.', access: 'Terraced levels with steps.', entry: ENTRY_TICKET },
    note: 'A Mughal garden built in terraces. Walk it slowly from top to bottom, the way it was meant to be seen.',
  },
  {
    id: 'hazuri-bagh', name: 'Hazuri Bagh', urdu: 'حضوری باغ', area: 'Between the Fort and Badshahi Mosque',
    lat: 31.5883923, lng: 74.3118128, moods: ['air', 'quiet'], emblem: 'tree',
    spend: 'free', noise: 2, solo: true, company: ['solo', 'friend'], collections: ['galiyon', 'sukoon'],
    before: { wifi: 'No.', seating: 'Steps around the baradari.', access: 'Paved, with some steps.', entry: 'Check before you go.' },
    note: 'A small garden square with the Fort on one side and the mosque on the other. Sit, and the city arranges itself around you.',
  },
  {
    id: 'badshahi', name: 'Badshahi Mosque', urdu: 'بادشاہی مسجد', area: 'Fort Road',
    lat: 31.588126, lng: 74.3093528, moods: ['quiet', 'creative'], emblem: 'window',
    spend: 'free', noise: 1, solo: true, company: ['solo', 'friend', 'group'], collections: ['galiyon', 'sukoon'],
    before: { wifi: 'No.', seating: 'The courtyard and its arcades.', access: 'Steps at the main gate.', entry: ENTRY_MOSQUE },
    note: 'The courtyard is vast enough to make any worry feel small. Go just before sunset.',
  },
  {
    id: 'lahore-fort', name: 'Lahore Fort', urdu: 'شاہی قلعہ', area: 'Walled City',
    lat: 31.5881898, lng: 74.3149994, moods: ['creative', 'air'], emblem: 'window',
    spend: 'u500', noise: 2, solo: true, company: ['solo', 'friend', 'group'], collections: ['galiyon'],
    before: { wifi: 'No.', seating: 'Lawns and shaded arcades.', access: 'Large site with ramps and steps.', entry: ENTRY_TICKET },
    note: 'Give it a full morning. Find the Picture Wall and look for the tiny elephants.',
  },
  {
    id: 'wazir-khan', name: 'Wazir Khan Mosque', urdu: 'مسجد وزیر خان', area: 'Walled City',
    lat: 31.5832242, lng: 74.3239647, moods: ['quiet', 'creative'], emblem: 'window',
    spend: 'free', noise: 1, solo: true, company: ['solo', 'friend'], collections: ['galiyon', 'sukoon'],
    before: { wifi: 'No.', seating: 'The courtyard.', access: OLD_CITY, entry: ENTRY_MOSQUE },
    note: 'Every surface is tile and fresco. Sit in the courtyard and let your eyes adjust to the detail.',
  },
  {
    id: 'shahi-hammam', name: 'Shahi Hammam', urdu: 'شاہی حمام', area: 'Inside Delhi Gate',
    lat: 31.582092, lng: 74.3260101, moods: ['creative', 'hidden'], emblem: 'key',
    spend: 'u500', noise: 1, solo: true, company: ['solo', 'friend'], collections: ['galiyon', 'chhoti'],
    before: { wifi: 'No.', seating: 'Very little. It’s for wandering.', access: OLD_CITY, entry: ENTRY_TICKET },
    note: 'A royal bathhouse just inside the gate. Look up: the frescoed domes are the reason to come.',
  },
  {
    id: 'delhi-gate', name: 'Delhi Gate', urdu: 'دہلی دروازہ', area: 'Walled City',
    lat: 31.582066, lng: 74.3263265, moods: ['hidden', 'conversation'], emblem: 'key',
    spend: 'free', noise: 3, solo: true, company: ['solo', 'friend', 'group'], collections: ['galiyon'],
    before: { wifi: 'No.', seating: 'None. Keep walking.', access: OLD_CITY, entry: 'Free. A public street.' },
    note: 'The best door into the old city. Walk in and keep going straight along the royal route.',
  },
  {
    id: 'coocos-den', name: 'Cooco’s Den', urdu: 'کوکوز ڈین', area: 'Fort Road Food Street',
    lat: 31.5870545, lng: 74.3115511, moods: ['conversation'], emblem: 'cup',
    spend: 'flex', noise: 3, solo: false, company: ['friend', 'group'], collections: ['baithak', 'galiyon'],
    before: { wifi: 'Ask the staff.', seating: 'Rooftop tables.', access: 'Many stairs to the roof.', entry: 'Restaurant. Check before you go.' },
    note: 'A rooftop facing Badshahi Mosque. Come for the view, stay for the conversation.',
  },
  {
    id: 'jahangir-tomb', name: 'Tomb of Jahangir', urdu: 'مقبرہ جہانگیر', area: 'Shahdara',
    lat: 31.6225752, lng: 74.303144, moods: ['quiet', 'air', 'hidden'], emblem: 'key',
    spend: 'u500', noise: 1, solo: true, company: ['solo', 'friend'], collections: ['chhoti', 'sukoon'],
    before: { wifi: 'No.', seating: 'Garden paths and steps.', access: 'Large garden, some steps.', entry: ENTRY_TICKET },
    note: 'Across the Ravi and far quieter than it deserves. Walk the garden walls first.',
  },
  {
    id: 'minar', name: 'Minar-e-Pakistan', urdu: 'مینارِ پاکستان', area: 'Greater Iqbal Park',
    lat: 31.5925559, lng: 74.3094848, moods: ['air', 'conversation'], emblem: 'tree',
    spend: 'u500', noise: 3, solo: false, company: ['friend', 'group', 'meet'], collections: ['baithak'],
    before: { wifi: 'No.', seating: 'Lawns. Bring a sheet.', access: 'Wide, level grounds.', entry: ENTRY_PARK },
    note: 'Big lawns, families, kites, evening air. For being around people without having to talk to them.',
  },
]

export const COLLECTIONS = [
  { id: 'sukoon', title: 'Sukoon', urdu: 'سکون', line: 'Peaceful spaces', pigment: 'var(--sage)' },
  { id: 'kitab', title: 'Kitab aur Chai', urdu: 'کتاب اور چائے', line: 'Reading, then tea', pigment: 'var(--terracotta)' },
  { id: 'baithak', title: 'Baithak', urdu: 'بیٹھک', line: 'Places for long conversations', pigment: 'var(--pomegranate)' },
  { id: 'galiyon', title: 'Galiyon Mein', urdu: 'گلیوں میں', line: 'The little streets of the Walled City', pigment: 'var(--brick)' },
  { id: 'chhoti', title: 'Chhoti Si Duniya', urdu: 'چھوٹی سی دنیا', line: 'Hidden neighbourhood gems', pigment: 'var(--indigo)' },
]

export const WANDERS = [
  { id: 'bookish', title: 'A bookish afternoon', urdu: 'کتاب اور چائے', mood: 'Slow, curious, a little nostalgic', stops: ['punjab-library', 'lahore-museum', 'pak-tea-house'] },
  { id: 'old-city', title: 'Through Delhi Gate', urdu: 'گلیوں میں', mood: 'Wide awake, comfortable shoes', stops: ['delhi-gate', 'shahi-hammam', 'wazir-khan', 'lahore-fort', 'coocos-den'] },
  { id: 'green', title: 'A green Sunday', urdu: 'سکون', mood: 'Unhurried, phone in your pocket', stops: ['bagh-e-jinnah', 'quaid-library', 'alhamra'] },
  { id: 'evening', title: 'An evening among monuments', urdu: 'شام', mood: 'Golden hour, good company', stops: ['badshahi', 'hazuri-bagh', 'minar'] },
]

export const placeById = Object.fromEntries(PLACES.map(p => [p.id, p]))
