// ponytail: one-shot authoring helper. Run: node scripts/build-dsr.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateGame } from '../src/route.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const areas = [
  ['undead-asylum', 'Northern Undead Asylum'],
  ['firelink', 'Firelink Shrine'],
  ['undead-burg', 'Undead Burg'],
  ['undead-parish', 'Undead Parish'],
  ['darkroot', 'Darkroot Garden'],
  ['darkroot-basin', 'Darkroot Basin'],
  ['lower-burg', 'Lower Undead Burg'],
  ['depths', 'The Depths'],
  ['blighttown', 'Blighttown'],
  ['valley-drakes', 'Valley of Drakes'],
  ['great-hollow', 'The Great Hollow'],
  ['ash-lake', 'Ash Lake'],
  ['sens', "Sen's Fortress"],
  ['anor-londo', 'Anor Londo'],
  ['painted-world', 'Painted World of Ariamis'],
  ['dark-anor-londo', 'Dark Anor Londo'],
  ['new-londo', 'New Londo Ruins'],
  ['the-abyss', 'The Abyss'],
  ['catacombs', 'The Catacombs'],
  ['tomb-giants', 'Tomb of the Giants'],
  ['demon-ruins', 'Demon Ruins'],
  ['lost-izalith', 'Lost Izalith'],
  ['dukes', "The Duke's Archives"],
  ['crystal-cave', 'Crystal Cave'],
  ['kiln', 'Kiln of the First Flame'],
  ['sunlight-altar', 'Sunlight Altar'],
].map(([id, name]) => ({ id, name }))

const enemies = [
  ['channeler', 'Channeler'],
  ['silver-knight-sword', 'Silver Knight (sword)'],
  ['silver-knight-spear', 'Silver Knight (spear)'],
  ['silver-knight', 'Silver Knight'],
  ['black-knight-sword', 'Black Knight (sword)'],
  ['black-knight-greatsword', 'Black Knight (greatsword)'],
  ['black-knight-axe', 'Black Knight (greataxe)'],
  ['black-knight-halberd', 'Black Knight (halberd)'],
  ['black-knight', 'Black Knight'],
  ['stone-knight', 'Stone Knight'],
  ['darkwraith', 'Darkwraith'],
  ['crystal-lizard', 'Crystal Lizard'],
].map(([id, name]) => ({ id, name }))

// persist:true survives newRun (NG+). Covenants keep; world progress does not.
const results = [
  ['way-of-white', 'Way of White joined', true],
  ['princess-guard', "Princess's Guard joined", true],
  ['darkmoon', 'Blade of the Darkmoon joined', true],
  ['warrior-sunlight', 'Warrior of Sunlight joined', true],
  ['forest-hunter', 'Forest Hunter joined', true],
  ['darkwraith', 'Darkwraith joined', true],
  ['path-dragon', 'Path of the Dragon joined', true],
  ['gravelord', 'Gravelord Servant joined', true],
  ['chaos-servant', 'Chaos Servant joined', true],
  ['lordvessel-placed', 'Lordvessel placed', false],
  ['firelink-down', 'Firelink bonfire disabled', false],
  ['both-bells', 'Both Bells of Awakening rung', false],
  ['gwyn-fallen', 'Gwyn defeated this run', false],
].map(([id, name, persist]) => ({ id, name, persist }))

const items = []
// Default persist false. Weapons/spells/materials/souls carry; most keys do not.
const item = (id, name, type, persist = false) => {
  items.push({ id, name, type, persist })
  return id
}

const key = (id, name, persist = false) => item(id, name, 'key', persist)
const weapon = (id, name) => item(id, name, 'weapon', true)
const material = (id, name) => item(id, name, 'material', true)
const spell = (id, name) => item(id, name, 'spell', true)
const soul = (id, name) => item(id, name, 'soul', true)
const consumable = (id, name) => item(id, name, 'consumable', false)

key('estus-flask', 'Estus Flask', true)
key('residence-key', 'Residence Key')
key('basement-key', 'Basement Key')
key('key-depths', 'Key to the Depths')
key('blighttown-key', 'Blighttown Key')
key('cage-key', 'Cage Key')
key('crest-artorias', 'Crest of Artorias')
key('lordvessel', 'Lordvessel')
key('rite-kindling', 'Rite of Kindling')
key('covenant-abyss', 'Covenant of Artorias')
key('mystery-key', 'Mystery Key')
key('sewer-chamber-key', 'Sewer Chamber Key')
key('new-londo-key', 'Key to New Londo Ruins')
key('archive-tower-key', 'Archive Tower Cell Key')
key('archive-prison-extra', 'Archive Prison Extra Key')
key('peculiar-doll', 'Peculiar Doll')
key('darkmoon-seance', 'Darkmoon Seance Ring')
key('eyes-of-death', 'Eye of Death')
consumable('humanity', 'Humanity')
material('titanite-shard', 'Titanite Shard')
material('large-titanite-shard', 'Large Titanite Shard')
material('titanite-chunk', 'Titanite Chunk')
material('titanite-slab', 'Titanite Slab')
material('green-titanite', 'Green Titanite Shard')
material('blue-chunk', 'Blue Titanite Chunk')
material('blue-slab', 'Blue Titanite Slab')
material('white-chunk', 'White Titanite Chunk')
material('white-slab', 'White Titanite Slab')
material('red-chunk', 'Red Titanite Chunk')
material('red-slab', 'Red Titanite Slab')
material('twinkling', 'Twinkling Titanite')
material('dragon-scale', 'Dragon Scale')
material('demon-titanite', 'Demon Titanite')
key('large-ember', 'Large Ember')
key('very-large-ember', 'Very Large Ember')
key('crystal-ember', 'Crystal Ember')
key('large-magic-ember', 'Large Magic Ember')
key('enchanted-ember', 'Enchanted Ember')
key('divine-ember', 'Divine Ember')
key('large-divine-ember', 'Large Divine Ember')
key('dark-ember', 'Dark Ember')
key('large-flame-ember', 'Large Flame Ember')
key('chaos-flame-ember', 'Chaos Flame Ember')
soul('soul-asylum', 'Soul of the Asylum Demon')
soul('soul-taurus', 'Soul of the Taurus Demon')
soul('soul-gargoyle', 'Soul of the Bell Gargoyle')
soul('soul-capra', 'Soul of the Capra Demon')
soul('soul-gaping', 'Soul of the Gaping Dragon')
soul('soul-butterfly', 'Soul of the Moonlight Butterfly')
soul('soul-sif', 'Soul of Sif')
soul('soul-quelaag', "Soul of Quelaag")
soul('soul-iron-golem', 'Core of an Iron Golem')
soul('soul-ornstein', 'Soul of Ornstein')
soul('soul-smough', 'Soul of Smough')
soul('soul-priscilla', 'Soul of Priscilla')
soul('soul-gwyndolin', 'Soul of Gwyndolin')
soul('soul-seath', 'Soul of Seath')
soul('soul-nito', 'Soul of Nito')
soul('soul-bed', 'Soul of the Bed of Chaos')
soul('soul-four-kings', 'Bequeathed Lord Soul Shard (Four Kings)')
soul('soul-gwyn', 'Soul of Gwyn')

const actions = []
const act = (row) => {
  actions.push(row)
  return row.id
}

const reqAction = (id) => ({ type: 'action', id })
const reqItem = (id, amount = 1) => ({ type: 'inventory', item: id, amount })
const reqResult = (id) => ({ type: 'result', id })

// --- Story spine ---
act({
  id: 'enkindle',
  type: 'interact',
  description: 'Light the first bonfire in the Undead Asylum courtyard.',
  area: 'undead-asylum',
})
act({
  id: 'get-estus',
  type: 'collect',
  description: 'Talk to Oscar in the Asylum and receive the Estus Flask.',
  area: 'undead-asylum',
  gives: [{ item: 'estus-flask', amount: 1 }],
  requires: [reqAction('enkindle')],
})
act({
  id: 'defeat-asylum-demon',
  type: 'fight',
  description: 'Defeat the Asylum Demon and leave through the great doors.',
  area: 'undead-asylum',
  gives: [{ item: 'soul-asylum', amount: 1 }],
  requires: [reqAction('get-estus')],
})
act({
  id: 'reach-lordran',
  type: 'go',
  description: 'Ride the giant crow to Firelink Shrine in Lordran.',
  area: 'firelink',
  requires: [reqAction('defeat-asylum-demon')],
})
act({
  id: 'join-way-of-white',
  type: 'interact',
  description: 'Talk to Petrus of Thorolund at Firelink until you join the Way of White (or start as Knight/Cleric).',
  area: 'firelink',
  requires: [reqAction('reach-lordran')],
  sets: [{ type: 'result', id: 'way-of-white' }],
})
act({
  id: 'enter-undead-burg',
  type: 'go',
  description: 'Take the aqueduct from Firelink into the Undead Burg.',
  area: 'undead-burg',
  requires: [reqAction('reach-lordran')],
})
act({
  id: 'buy-residence-key',
  type: 'collect',
  description: 'Buy the Residence Key from the Male Undead Merchant in the Burg.',
  area: 'undead-burg',
  gives: [{ item: 'residence-key', amount: 1 }],
  requires: [reqAction('enter-undead-burg')],
})
act({
  id: 'defeat-taurus',
  type: 'fight',
  description: 'Defeat the Taurus Demon on the Burg tower wall.',
  area: 'undead-burg',
  gives: [{ item: 'soul-taurus', amount: 1 }],
  requires: [reqAction('enter-undead-burg')],
})
act({
  id: 'cut-hellkite-tail',
  type: 'collect',
  description: 'Cut the Hellkite Dragon’s tail on the Burg bridge for the Drake Sword.',
  area: 'undead-burg',
  gives: [{ item: weapon('drake-sword', 'Drake Sword'), amount: 1 }],
  requires: [reqAction('defeat-taurus')],
  before: ['kill-hellkite'],
})
act({
  id: 'kill-hellkite',
  type: 'fight',
  description: 'Kill the Hellkite Dragon on the Burg bridge (optional later).',
  area: 'undead-burg',
  requires: [reqAction('defeat-taurus')],
})
act({
  id: 'reach-sunlight-altar',
  type: 'go',
  description: 'Pass under the Hellkite to the Sunlight Altar gate and open it.',
  area: 'sunlight-altar',
  requires: [reqAction('defeat-taurus')],
})
act({
  id: 'raise-faith-25',
  type: 'interact',
  description: 'Reach 25 Faith offline (or lower the requirement later with prior White Phantom clears — this route assumes 25 Faith).',
  area: 'sunlight-altar',
  requires: [reqAction('reach-sunlight-altar')],
})
act({
  id: 'join-warrior-sunlight',
  type: 'interact',
  description: 'Pray at the broken Sunlight Altar statue to join Warrior of Sunlight.',
  area: 'sunlight-altar',
  requires: [reqAction('raise-faith-25')],
  sets: [{ type: 'result', id: 'warrior-sunlight' }],
})
act({
  id: 'get-basement-key',
  type: 'collect',
  description: 'Loot the Basement Key from the corpse at the foot of the Parish church stairs.',
  area: 'undead-parish',
  gives: [{ item: 'basement-key', amount: 1 }],
  requires: [reqAction('reach-sunlight-altar')],
})
act({
  id: 'get-mystery-key',
  type: 'collect',
  description: 'Take the Mystery Key downstairs in the Parish church.',
  area: 'undead-parish',
  gives: [{ item: 'mystery-key', amount: 1 }],
  requires: [reqAction('reach-sunlight-altar')],
})
act({
  id: 'defeat-gargoyles',
  type: 'fight',
  description: 'Defeat the Bell Gargoyles on the Parish roof.',
  area: 'undead-parish',
  gives: [{ item: 'soul-gargoyle', amount: 1 }],
  requires: [reqAction('reach-sunlight-altar')],
})
act({
  id: 'ring-undead-church',
  type: 'interact',
  description: 'Climb the Parish tower and ring the Bell of Awakening.',
  area: 'undead-parish',
  requires: [reqAction('defeat-gargoyles')],
})
act({
  id: 'buy-crest-artorias',
  type: 'collect',
  description: 'Buy the Crest of Artorias from Andre under the Parish.',
  area: 'undead-parish',
  gives: [{ item: 'crest-artorias', amount: 1 }],
  requires: [reqAction('ring-undead-church')],
})
act({
  id: 'defeat-butterfly',
  type: 'fight',
  description: 'Defeat the Moonlight Butterfly in Darkroot Garden.',
  area: 'darkroot',
  gives: [{ item: 'soul-butterfly', amount: 1 }],
  requires: [reqAction('ring-undead-church')],
})
act({
  id: 'get-divine-ember',
  type: 'collect',
  description: 'Take the Divine Ember behind the Moonlight Butterfly tower.',
  area: 'darkroot',
  gives: [{ item: 'divine-ember', amount: 1 }],
  requires: [reqAction('defeat-butterfly')],
})
act({
  id: 'enter-lower-burg',
  type: 'go',
  description: 'Use the Basement Key to enter Lower Undead Burg.',
  area: 'lower-burg',
  requires: [reqItem('basement-key'), reqAction('ring-undead-church')],
})
act({
  id: 'free-griggs',
  type: 'interact',
  description: 'Open Griggs’s house with the Residence Key in Lower Burg.',
  area: 'lower-burg',
  requires: [reqAction('enter-lower-burg'), reqItem('residence-key')],
})
act({
  id: 'defeat-capra',
  type: 'fight',
  description: 'Defeat the Capra Demon in Lower Burg.',
  area: 'lower-burg',
  gives: [{ item: 'soul-capra', amount: 1 }, { item: 'key-depths', amount: 1 }],
  requires: [reqAction('enter-lower-burg')],
})
act({
  id: 'enter-depths',
  type: 'go',
  description: 'Open the Depths with the Key to the Depths.',
  area: 'depths',
  requires: [reqItem('key-depths')],
})
act({
  id: 'get-large-ember',
  type: 'collect',
  description: 'Take the Large Ember from the Depths butcher’s chest.',
  area: 'depths',
  gives: [{ item: 'large-ember', amount: 1 }],
  requires: [reqAction('enter-depths')],
})
act({
  id: 'free-laurentius',
  type: 'interact',
  description: 'Break Laurentius out of the barrel in the Depths.',
  area: 'depths',
  requires: [reqAction('enter-depths')],
})
act({
  id: 'cut-gaping-tail',
  type: 'collect',
  description: 'Cut the Gaping Dragon’s tail for the Dragon King Greataxe.',
  area: 'depths',
  gives: [{ item: weapon('dragon-king-greataxe', 'Dragon King Greataxe'), amount: 1 }],
  requires: [reqAction('enter-depths')],
  before: ['defeat-gaping'],
})
act({
  id: 'defeat-gaping',
  type: 'fight',
  description: 'Defeat the Gaping Dragon.',
  area: 'depths',
  gives: [{ item: 'soul-gaping', amount: 1 }, { item: 'blighttown-key', amount: 1 }],
  requires: [reqAction('enter-depths')],
})
act({
  id: 'enter-blighttown',
  type: 'go',
  description: 'Open Blighttown from the Depths with the Blighttown Key.',
  area: 'blighttown',
  requires: [reqItem('blighttown-key')],
})
act({
  id: 'defeat-quelaag',
  type: 'fight',
  description: 'Defeat Chaos Witch Quelaag.',
  area: 'blighttown',
  gives: [{ item: 'soul-quelaag', amount: 1 }],
  requires: [reqAction('enter-blighttown')],
})
act({
  id: 'ring-quelaag',
  type: 'interact',
  description: 'Ring the second Bell of Awakening in Quelaag’s Domain.',
  area: 'blighttown',
  requires: [reqAction('defeat-quelaag')],
  sets: [{ type: 'result', id: 'both-bells' }],
})
act({
  id: 'join-chaos-servant',
  type: 'interact',
  description: 'Use the illusory wall after Quelaag, talk to Eingyi, then join the Daughter of Chaos covenant.',
  area: 'blighttown',
  requires: [reqAction('ring-quelaag')],
  sets: [{ type: 'result', id: 'chaos-servant' }],
})
act({
  id: 'farm-humanity-30',
  type: 'farm',
  description: 'Gather 30 Humanity (rats, baby skeletons, or consumables) for Chaos Servant rank.',
  area: 'blighttown',
  source: { type: 'enemy', id: 'darkwraith' },
  gives: [{ item: 'humanity', amount: 30 }],
  requires: [reqResult('chaos-servant')],
})
act({
  id: 'offer-chaos-30',
  type: 'interact',
  description: 'Offer 30 Humanity to the Chaos Servant for Chaos Storm.',
  area: 'blighttown',
  requires: [reqResult('chaos-servant'), reqItem('humanity', 30)],
  consumes: [{ item: 'humanity', amount: 30 }],
  gives: [{ item: spell('chaos-storm', 'Chaos Storm'), amount: 1 }],
})
act({
  id: 'enter-valley-drakes',
  type: 'go',
  description: 'Reach the Valley of Drakes (from New Londo key path or Darkroot Basin).',
  area: 'valley-drakes',
  requires: [reqAction('ring-quelaag')],
})
act({
  id: 'loot-astora-sword',
  type: 'collect',
  description: 'Loot Astora’s Straight Sword beside the undead dragon.',
  area: 'valley-drakes',
  gives: [{ item: weapon('astora-straight-sword', "Astora's Straight Sword"), amount: 1 }],
  requires: [reqAction('enter-valley-drakes')],
})
act({
  id: 'loot-dragon-crest-shield',
  type: 'collect',
  description: 'Loot the Dragon Crest Shield by the undead dragon’s head.',
  area: 'valley-drakes',
  gives: [{ item: weapon('dragon-crest-shield', 'Dragon Crest Shield'), amount: 1 }],
  requires: [reqAction('enter-valley-drakes')],
})
act({
  id: 'enter-ash-lake',
  type: 'go',
  description: 'From Blighttown swamp, open the Great Hollow illusory walls and descend to Ash Lake.',
  area: 'ash-lake',
  requires: [reqAction('enter-blighttown')],
})
act({
  id: 'join-path-dragon',
  type: 'interact',
  description: 'Talk to the Stone Dragon at Ash Lake to join Path of the Dragon.',
  area: 'ash-lake',
  requires: [reqAction('enter-ash-lake')],
  sets: [{ type: 'result', id: 'path-dragon' }],
})
act({
  id: 'cut-stone-dragon-tail',
  type: 'collect',
  description: 'Cut the Stone Dragon’s tail for the Dragon Greatsword (it will not aggro).',
  area: 'ash-lake',
  gives: [{ item: weapon('dragon-greatsword', 'Dragon Greatsword'), amount: 1 }],
  requires: [reqAction('join-path-dragon')],
})
act({
  id: 'enter-sens',
  type: 'go',
  description: 'Enter Sen’s Fortress after both bells are rung.',
  area: 'sens',
  requires: [reqResult('both-bells')],
})
act({
  id: 'get-cage-key',
  type: 'collect',
  description: 'Jump the Sen’s Fortress roof gap and take the Cage Key from the tower.',
  area: 'sens',
  gives: [{ item: 'cage-key', amount: 1 }],
  requires: [reqAction('enter-sens')],
})
act({
  id: 'free-logan-sens',
  type: 'interact',
  description: 'Free Big Hat Logan from the cage in Sen’s Fortress.',
  area: 'sens',
  requires: [reqAction('enter-sens'), reqItem('cage-key')],
})
act({
  id: 'defeat-iron-golem',
  type: 'fight',
  description: 'Defeat the Iron Golem at the top of Sen’s Fortress.',
  area: 'sens',
  gives: [{ item: 'soul-iron-golem', amount: 1 }],
  requires: [reqAction('enter-sens')],
})
act({
  id: 'reach-anor-londo',
  type: 'go',
  description: 'Ride the bat-wing demons into Anor Londo.',
  area: 'anor-londo',
  requires: [reqAction('defeat-iron-golem')],
})
act({
  id: 'defeat-o-and-s-ornstein-first',
  type: 'fight',
  description: 'Defeat Ornstein first, then Smough, for Ornstein’s soul (NG path for Dragonslayer Spear).',
  area: 'anor-londo',
  gives: [{ item: 'soul-ornstein', amount: 1 }],
  requires: [reqAction('reach-anor-londo')],
})
act({
  id: 'get-lordvessel',
  type: 'collect',
  description: 'Receive the Lordvessel from Gwynevere after Ornstein & Smough.',
  area: 'anor-londo',
  gives: [{ item: 'lordvessel', amount: 1 }],
  requires: [reqAction('defeat-o-and-s-ornstein-first')],
})
act({
  id: 'join-princess-guard',
  type: 'interact',
  description: 'Talk to Gwynevere to join Princess’s Guard (do this before killing her).',
  area: 'anor-londo',
  requires: [reqAction('get-lordvessel')],
  sets: [{ type: 'result', id: 'princess-guard' }],
  before: ['kill-gwynevere'],
})
act({
  id: 'kill-gwynevere',
  type: 'fight',
  description: 'Kill Gwynevere to darken Anor Londo (needed for Gwyndolin access / Dark Anor Londo).',
  area: 'anor-londo',
  requires: [reqAction('get-lordvessel')],
  sets: [{ type: 'result', id: 'firelink-down' }],
})
act({
  id: 'join-darkmoon',
  type: 'interact',
  description: 'Equip the Darkmoon Seance Ring at the Darkmoon tomb and join Blade of the Darkmoon before fighting Gwyndolin.',
  area: 'dark-anor-londo',
  requires: [reqAction('get-lordvessel'), reqItem('darkmoon-seance')],
  sets: [{ type: 'result', id: 'darkmoon' }],
  before: ['defeat-gwyndolin'],
})
act({
  id: 'get-darkmoon-seance',
  type: 'collect',
  description: 'Loot the Darkmoon Seance Ring from the Catacombs coffin near the first Necromancer.',
  area: 'catacombs',
  gives: [{ item: 'darkmoon-seance', amount: 1 }],
  requires: [reqAction('reach-lordran')],
})
act({
  id: 'defeat-gwyndolin',
  type: 'fight',
  description: 'Defeat Dark Sun Gwyndolin in Dark Anor Londo.',
  area: 'dark-anor-londo',
  gives: [{ item: 'soul-gwyndolin', amount: 1 }],
  requires: [reqAction('get-lordvessel')],
})
act({
  id: 'get-peculiar-doll',
  type: 'collect',
  description: 'Return to the Undead Asylum via the Parish elevator crow nest and take the Peculiar Doll.',
  area: 'undead-asylum',
  gives: [{ item: 'peculiar-doll', amount: 1 }],
  requires: [reqAction('ring-undead-church')],
})
act({
  id: 'enter-painted-world',
  type: 'go',
  description: 'Use the Peculiar Doll on the Anor Londo painting to enter the Painted World.',
  area: 'painted-world',
  requires: [reqItem('peculiar-doll'), reqAction('reach-anor-londo')],
})
act({
  id: 'cut-priscilla-tail',
  type: 'collect',
  description: 'Cut Crossbreed Priscilla’s tail for the Priscilla Dagger.',
  area: 'painted-world',
  gives: [{ item: weapon('priscilla-dagger', "Priscilla's Dagger"), amount: 1 }],
  requires: [reqAction('enter-painted-world')],
  before: ['defeat-priscilla'],
})
act({
  id: 'defeat-priscilla',
  type: 'fight',
  description: 'Defeat Crossbreed Priscilla.',
  area: 'painted-world',
  gives: [{ item: 'soul-priscilla', amount: 1 }],
  requires: [reqAction('enter-painted-world')],
})
act({
  id: 'open-darkroot-door',
  type: 'interact',
  description: 'Open the Crest of Artorias door in Darkroot.',
  area: 'darkroot',
  requires: [reqItem('crest-artorias')],
})
act({
  id: 'join-forest-hunter',
  type: 'interact',
  description: 'Talk to Alvina behind the Crest door and join the Forest Hunter covenant.',
  area: 'darkroot',
  requires: [reqAction('open-darkroot-door')],
  sets: [{ type: 'result', id: 'forest-hunter' }],
})
act({
  id: 'defeat-sif',
  type: 'fight',
  description: 'Defeat Great Grey Wolf Sif in Darkroot Garden.',
  area: 'darkroot',
  gives: [{ item: 'soul-sif', amount: 1 }, { item: 'covenant-abyss', amount: 1 }],
  requires: [reqAction('open-darkroot-door')],
})
act({
  id: 'get-rite-kindling',
  type: 'collect',
  description: 'Defeat Pinwheel in the Catacombs and take the Rite of Kindling.',
  area: 'catacombs',
  gives: [{ item: 'rite-kindling', amount: 1 }],
  requires: [reqAction('reach-lordran')],
})
act({
  id: 'join-gravelord',
  type: 'interact',
  description: 'In the Catacombs coffin with an Eye of Death, join Gravelord Servant (before killing Nito).',
  area: 'catacombs',
  requires: [reqItem('eyes-of-death'), reqAction('get-rite-kindling')],
  sets: [{ type: 'result', id: 'gravelord' }],
  before: ['defeat-nito'],
})
act({
  id: 'get-eye-of-death',
  type: 'collect',
  description: 'Loot Eyes of Death in the Catacombs (near the first Titanite Demon / patches area).',
  area: 'catacombs',
  gives: [{ item: 'eyes-of-death', amount: 1 }],
  requires: [reqAction('reach-lordran')],
})
act({
  id: 'place-lordvessel-kaathe',
  type: 'interact',
  description: 'Before Frampt: defeat Four Kings, talk to Kaathe in the Abyss, place the Lordvessel with him (Darkwraith path).',
  area: 'the-abyss',
  requires: [reqItem('lordvessel'), reqAction('defeat-four-kings')],
  sets: [{ type: 'result', id: 'lordvessel-placed' }],
})
act({
  id: 'drain-new-londo',
  type: 'interact',
  description: 'Open New Londo, fetch the Key to the Seal from Ingward after the Lordvessel, and drain the ruins.',
  area: 'new-londo',
  requires: [reqItem('lordvessel')],
})
act({
  id: 'defeat-four-kings',
  type: 'fight',
  description: 'Equip the Covenant of Artorias and defeat the Four Kings in the Abyss.',
  area: 'the-abyss',
  gives: [{ item: 'soul-four-kings', amount: 1 }],
  requires: [reqItem('covenant-abyss'), reqAction('drain-new-londo')],
})
act({
  id: 'join-darkwraith',
  type: 'interact',
  description: 'Talk to Darkstalker Kaathe after Four Kings (before placing the Lordvessel with Frampt) and join Darkwraith.',
  area: 'the-abyss',
  requires: [reqAction('defeat-four-kings')],
  sets: [{ type: 'result', id: 'darkwraith' }],
  before: ['place-lordvessel-frampt'],
})
act({
  id: 'place-lordvessel-frampt',
  type: 'interact',
  description: 'Place the Lordvessel with Kingseeker Frampt at Firelink Altar (locks out Kaathe Darkwraith join).',
  area: 'firelink',
  requires: [reqItem('lordvessel')],
  sets: [{ type: 'result', id: 'lordvessel-placed' }],
})
act({
  id: 'get-dark-hand',
  type: 'collect',
  description: 'Receive the Dark Hand when joining Darkwraith (or farm Darkwraiths in New Londo).',
  area: 'the-abyss',
  gives: [{ item: weapon('dark-hand', 'Dark Hand'), amount: 1 }],
  requires: [reqResult('darkwraith')],
})
act({
  id: 'enter-dukes',
  type: 'go',
  description: 'After the Lordvessel is placed, enter the Duke’s Archives from Anor Londo.',
  area: 'dukes',
  requires: [reqResult('lordvessel-placed')],
})
act({
  id: 'free-logan-dukes',
  type: 'interact',
  description: 'Free Big Hat Logan from the Duke’s Archives prison before killing Seath.',
  area: 'dukes',
  requires: [reqAction('enter-dukes')],
  before: ['defeat-seath'],
})
act({
  id: 'cut-seath-tail',
  type: 'collect',
  description: 'Cut Seath’s tail in the Crystal Cave for the Moonlight Greatsword.',
  area: 'crystal-cave',
  gives: [{ item: weapon('moonlight-greatsword', 'Moonlight Greatsword'), amount: 1 }],
  requires: [reqAction('enter-dukes')],
  before: ['defeat-seath'],
})
act({
  id: 'defeat-seath',
  type: 'fight',
  description: 'Defeat Seath the Scaleless in the Crystal Cave.',
  area: 'crystal-cave',
  gives: [{ item: 'soul-seath', amount: 1 }],
  requires: [reqAction('enter-dukes')],
})
act({
  id: 'defeat-nito',
  type: 'fight',
  description: 'Defeat Gravelord Nito in the Tomb of the Giants.',
  area: 'tomb-giants',
  gives: [{ item: 'soul-nito', amount: 1 }],
  requires: [reqResult('lordvessel-placed'), reqAction('get-rite-kindling')],
})
act({
  id: 'defeat-bed-of-chaos',
  type: 'fight',
  description: 'Defeat the Bed of Chaos in Lost Izalith.',
  area: 'lost-izalith',
  gives: [{ item: 'soul-bed', amount: 1 }],
  requires: [reqResult('lordvessel-placed'), reqAction('defeat-quelaag')],
})
act({
  id: 'place-lord-souls',
  type: 'interact',
  description: 'Place the four Lord Souls in the Lordvessel at Firelink Altar.',
  area: 'firelink',
  requires: [
    reqAction('defeat-nito'),
    reqAction('defeat-bed-of-chaos'),
    reqAction('defeat-seath'),
    reqAction('defeat-four-kings'),
  ],
})
act({
  id: 'defeat-gwyn',
  type: 'fight',
  description: 'Defeat Gwyn, Lord of Cinder in the Kiln.',
  area: 'kiln',
  gives: [{ item: 'soul-gwyn', amount: 1 }],
  requires: [reqAction('place-lord-souls')],
  sets: [{ type: 'result', id: 'gwyn-fallen' }],
})
act({
  id: 'link-the-fire',
  type: 'interact',
  description: 'Light the Final Bonfire to Link the Fire (ends the run / enters NG+).',
  area: 'kiln',
  requires: [reqResult('gwyn-fallen')],
  newRun: true,
})
act({
  id: 'dark-lord-ending',
  type: 'interact',
  description: 'Leave through the Kiln fog without lighting the fire for the Dark Lord ending (ends the run / enters NG+).',
  area: 'kiln',
  requires: [reqResult('gwyn-fallen')],
  newRun: true,
})

// Upgrade path achievements: give ember to smith + craft max weapon leaf
function upgradePath(id, name, emberId, smithArea, description) {
  const weaponId = weapon(`${id}-weapon`, `${name} Weapon`)
  act({
    id: `give-${id}-ember`,
    type: 'interact',
    description: `Give the ${description} to the appropriate blacksmith.`,
    area: smithArea,
    requires: [reqItem(emberId), reqAction('ring-undead-church')],
  })
  act({
    id: `craft-${id}`,
    type: 'interact',
    description: `Reinforce a weapon to the max ${name} path (materials assumed gathered).`,
    area: smithArea,
    requires: [reqAction(`give-${id}-ember`)],
    gives: [{ item: weaponId, amount: 1 }],
  })
  return `craft-${id}`
}

const craftStandard = upgradePath('standard', 'Standard', 'large-ember', 'undead-parish', 'Large Ember (and Very Large Ember later)')
act({
  id: 'get-very-large-ember',
  type: 'collect',
  description: 'Take the Very Large Ember from New Londo after draining the water.',
  area: 'new-londo',
  gives: [{ item: 'very-large-ember', amount: 1 }],
  requires: [reqAction('drain-new-londo')],
})
actions.find((a) => a.id === 'give-standard-ember').requires.push(reqItem('very-large-ember'))

const craftCrystal = upgradePath('crystal', 'Crystal', 'crystal-ember', 'anor-londo', 'Crystal Ember')
act({
  id: 'get-crystal-ember',
  type: 'collect',
  description: 'Take the Crystal Ember from the Duke’s Archives.',
  area: 'dukes',
  gives: [{ item: 'crystal-ember', amount: 1 }],
  requires: [reqAction('enter-dukes')],
})
const craftLightning = (() => {
  const wid = weapon('lightning-weapon', 'Lightning Weapon')
  act({
    id: 'craft-lightning',
    type: 'interact',
    description: 'Ascend a +10 weapon to Lightning +5 at the Giant Blacksmith (no ember).',
    area: 'anor-londo',
    requires: [reqAction('reach-anor-londo')],
    gives: [{ item: wid, amount: 1 }],
  })
  return 'craft-lightning'
})()
const craftRaw = upgradePath('raw', 'Raw', 'large-ember', 'undead-parish', 'Large Ember')
const craftMagic = upgradePath('magic', 'Magic', 'large-magic-ember', 'new-londo', 'Large Magic Ember')
act({
  id: 'get-large-magic-ember',
  type: 'collect',
  description: 'Take the Large Magic Ember from the Duke’s Archives balcony after freeing Logan’s first cell route.',
  area: 'dukes',
  gives: [{ item: 'large-magic-ember', amount: 1 }],
  requires: [reqAction('enter-dukes')],
})
const craftEnchanted = upgradePath('enchanted', 'Enchanted', 'enchanted-ember', 'darkroot', 'Enchanted Ember')
act({
  id: 'get-enchanted-ember',
  type: 'collect',
  description: 'Take the Enchanted Ember from the Darkroot basin chest among Mushroom people.',
  area: 'darkroot',
  gives: [{ item: 'enchanted-ember', amount: 1 }],
  requires: [reqAction('ring-undead-church')],
})
const craftDivine = upgradePath('divine', 'Divine', 'divine-ember', 'undead-parish', 'Divine Ember')
act({
  id: 'get-large-divine-ember',
  type: 'collect',
  description: 'Take the Large Divine Ember from the Tomb of the Giants.',
  area: 'tomb-giants',
  gives: [{ item: 'large-divine-ember', amount: 1 }],
  requires: [reqAction('get-rite-kindling')],
})
actions.find((a) => a.id === 'give-divine-ember').requires.push(reqItem('large-divine-ember'))
const craftOccult = upgradePath('occult', 'Occult', 'dark-ember', 'undead-parish', 'Dark Ember')
act({
  id: 'get-dark-ember',
  type: 'collect',
  description: 'Take the Dark Ember from the Painted World annex.',
  area: 'painted-world',
  gives: [{ item: 'dark-ember', amount: 1 }],
  requires: [reqAction('enter-painted-world')],
})
const craftFire = upgradePath('fire', 'Fire', 'large-flame-ember', 'catacombs', 'Large Flame Ember')
act({
  id: 'get-large-flame-ember',
  type: 'collect',
  description: 'Take the Large Flame Ember from the Demon Ruins.',
  area: 'demon-ruins',
  gives: [{ item: 'large-flame-ember', amount: 1 }],
  requires: [reqAction('defeat-quelaag')],
})
const craftChaos = upgradePath('chaos', 'Chaos', 'chaos-flame-ember', 'demon-ruins', 'Chaos Flame Ember')
act({
  id: 'get-chaos-flame-ember',
  type: 'collect',
  description: 'Take the Chaos Flame Ember behind the Demon Firesage / Centipede Demon path.',
  area: 'demon-ruins',
  gives: [{ item: 'chaos-flame-ember', amount: 1 }],
  requires: [reqAction('defeat-quelaag')],
})

// Boss weapons (subset wired to souls) + farms for Knight's Honor
function forgeBoss(id, name, soulId, baseNote, area = 'anor-londo') {
  const wid = weapon(id, name)
  act({
    id: `forge-${id}`,
    type: 'interact',
    description: `Forge ${name} at the Giant Blacksmith (${baseNote}).`,
    area,
    requires: [reqItem(soulId), reqAction('reach-anor-londo')],
    consumes: [{ item: soulId, amount: 1 }],
    gives: [{ item: wid, amount: 1 }],
  })
  return `forge-${id}`
}

const bossWeaponActions = [
  forgeBoss('moonlight-butterfly-horn', 'Moonlight Butterfly Horn', 'soul-butterfly', '+5 spear/rapier'),
  forgeBoss('crystal-ring-shield', 'Crystal Ring Shield', 'soul-butterfly', '+5 shield'),
  forgeBoss('greatsword-artorias', 'Greatsword of Artorias', 'soul-sif', 'broken straight sword / hilt'),
  forgeBoss('greatsword-artorias-cursed', 'Greatsword of Artorias (Cursed)', 'soul-sif', '+10 sword/dagger'),
  forgeBoss('greatshield-artorias', 'Greatshield of Artorias', 'soul-sif', '+10 shield'),
  forgeBoss('chaos-blade', 'Chaos Blade', 'soul-quelaag', '+10 katana'),
  forgeBoss('quelaag-fury-sword', "Quelaag's Furysword", 'soul-quelaag', '+10 curved sword'),
  forgeBoss('golem-axe', "Golem Axe", 'soul-iron-golem', '+10 axe'),
  forgeBoss('dragon-bone-fist', 'Dragon Bone Fist', 'soul-iron-golem', 'caestus'),
  forgeBoss('dragonslayer-spear', 'Dragonslayer Spear', 'soul-ornstein', '+10 spear'),
  forgeBoss('lifehunt-scythe', 'Lifehunt Scythe', 'soul-priscilla', '+10 halberd/whip'),
  forgeBoss('darkmoon-bow', 'Darkmoon Bow', 'soul-gwyndolin', '+10 bow'),
  forgeBoss('tin-darkmoon-catalyst', 'Tin Darkmoon Catalyst', 'soul-gwyndolin', 'catalyst'),
  forgeBoss('great-lord-greatsword', 'Great Lord Greatsword', 'soul-gwyn', '+10 dagger/sword'),
]

act({
  id: 'defeat-o-and-s-smough-first',
  type: 'fight',
  description: 'In a later run, defeat Smough first then Ornstein for Smough’s soul.',
  area: 'anor-londo',
  gives: [{ item: 'soul-smough', amount: 1 }],
  requires: [reqAction('reach-anor-londo')],
})
forgeBoss('smough-hammer', "Smough's Hammer", 'soul-smough', '+10 hammer')

function farmWeapon(id, name, enemyId, areaId, description) {
  const wid = weapon(id, name)
  act({
    id: `farm-${id}`,
    type: 'farm',
    description,
    area: areaId,
    source: { type: 'enemy', id: enemyId },
    gives: [{ item: wid, amount: 1 }],
    requires: [reqAction('reach-anor-londo')],
  })
  return `farm-${id}`
}

const farmWeaponActions = [
  farmWeapon('silver-knight-straight-sword', 'Silver Knight Straight Sword', 'silver-knight-sword', 'anor-londo', 'Farm sword Silver Knights in Anor Londo.'),
  farmWeapon('silver-knight-spear', 'Silver Knight Spear', 'silver-knight-spear', 'anor-londo', 'Farm spear Silver Knights in Anor Londo.'),
  farmWeapon('silver-knight-shield', 'Silver Knight Shield', 'silver-knight', 'anor-londo', 'Farm Silver Knights for their shield.'),
  farmWeapon('black-knight-sword', 'Black Knight Sword', 'black-knight-sword', 'kiln', 'Farm sword Black Knights in the Kiln.'),
  farmWeapon('black-knight-greatsword', 'Black Knight Greatsword', 'black-knight-greatsword', 'kiln', 'Farm greatsword Black Knights in the Kiln.'),
  farmWeapon('black-knight-greataxe', 'Black Knight Greataxe', 'black-knight-axe', 'kiln', 'Farm greataxe Black Knights in the Kiln.'),
  farmWeapon('black-knight-halberd', 'Black Knight Halberd', 'black-knight-halberd', 'kiln', 'Farm halberd Black Knights in the Kiln.'),
  farmWeapon('black-knight-shield', 'Black Knight Shield', 'black-knight', 'kiln', 'Farm Black Knights for their shield.'),
  farmWeapon('stone-greatsword', 'Stone Greatsword', 'stone-knight', 'darkroot', 'Farm Stone Knights in Darkroot for the Stone Greatsword.'),
  farmWeapon('stone-greatshield', 'Stone Greatshield', 'stone-knight', 'darkroot', 'Farm Stone Knights in Darkroot for the Stone Greatshield.'),
  farmWeapon('channelers-trident', "Channeler's Trident", 'channeler', 'dukes', 'Farm Channelers (Parish / Depths / Archives) for the Trident.'),
]

act({
  id: 'loot-grant',
  type: 'collect',
  description: 'Kill invading Paladin Leeroy in the Tomb of the Giants for Grant.',
  area: 'tomb-giants',
  gives: [{ item: weapon('grant', 'Grant'), amount: 1 }],
  requires: [reqAction('get-rite-kindling')],
  before: ['defeat-nito'],
})
act({
  id: 'loot-sanctus',
  type: 'collect',
  description: 'Kill invading Paladin Leeroy in the Tomb of the Giants for Sanctus.',
  area: 'tomb-giants',
  gives: [{ item: weapon('sanctus', 'Sanctus'), amount: 1 }],
  requires: [reqAction('get-rite-kindling')],
  before: ['defeat-nito'],
})
act({
  id: 'loot-crest-shield',
  type: 'collect',
  description: 'Return to the Asylum and kill hollow Oscar for the Crest Shield.',
  area: 'undead-asylum',
  gives: [{ item: weapon('crest-shield', 'Crest Shield'), amount: 1 }],
  requires: [reqAction('get-peculiar-doll')],
})
act({
  id: 'buy-crescent-axe',
  type: 'collect',
  description: 'Buy the Crescent Axe from Patches (forgive him) or loot it if you kill him.',
  area: 'firelink',
  gives: [{ item: weapon('crescent-axe', 'Crescent Axe'), amount: 1 }],
  requires: [reqAction('get-rite-kindling')],
})
act({
  id: 'buy-demons-spear',
  type: 'collect',
  description: 'Buy the Demon’s Spear from Shiva of the East (Forest Hunter merchant in Blighttown).',
  area: 'blighttown',
  gives: [{ item: weapon('demons-spear', "Demon's Spear"), amount: 1 }],
  requires: [reqResult('forest-hunter')],
})
act({
  id: 'buy-giants-halberd',
  type: 'collect',
  description: 'Buy the Giant’s Halberd from the Giant Blacksmith in Anor Londo.',
  area: 'anor-londo',
  gives: [{ item: weapon('giants-halberd', "Giant's Halberd"), amount: 1 }],
  requires: [reqAction('reach-anor-londo')],
})
act({
  id: 'loot-velkas-rapier',
  type: 'collect',
  description: 'Loot Velka’s Rapier in the Painted World annex.',
  area: 'painted-world',
  gives: [{ item: weapon('velkas-rapier', "Velka's Rapier"), amount: 1 }],
  requires: [reqAction('enter-painted-world')],
})
act({
  id: 'get-gravelord-sword',
  type: 'collect',
  description: 'Receive the Gravelord Sword when joining Gravelord Servant.',
  area: 'catacombs',
  gives: [{ item: weapon('gravelord-sword', 'Gravelord Sword'), amount: 1 }],
  requires: [reqResult('gravelord')],
})
act({
  id: 'asylum-demon-hammer',
  type: 'collect',
  description: 'Kill the Asylum Demon in the cell courtyard (NG+ or strong start) for the Demon’s Great Hammer.',
  area: 'undead-asylum',
  gives: [{ item: weapon('demons-great-hammer', "Demon's Great Hammer"), amount: 1 }],
  requires: [reqAction('reach-lordran')],
})

const knightsHonorActions = [
  ...bossWeaponActions,
  'forge-smough-hammer',
  ...farmWeaponActions,
  'loot-grant',
  'loot-sanctus',
  'loot-crest-shield',
  'buy-crescent-axe',
  'buy-demons-spear',
  'buy-giants-halberd',
  'loot-velkas-rapier',
  'get-gravelord-sword',
  'asylum-demon-hammer',
  'cut-hellkite-tail',
  'cut-gaping-tail',
  'cut-priscilla-tail',
  'cut-stone-dragon-tail',
  'cut-seath-tail',
  'loot-astora-sword',
  'loot-dragon-crest-shield',
  'get-dark-hand',
]

// Spells — compact collect actions gated on merchants/story
function addSpell(id, name, areaId, requires, description) {
  const sid = spell(id, name)
  act({
    id: `learn-${id}`,
    type: 'collect',
    description,
    area: areaId,
    gives: [{ item: sid, amount: 1 }],
    requires,
  })
  return `learn-${id}`
}

const sorceryActions = [
  addSpell('soul-arrow', 'Soul Arrow', 'firelink', [reqAction('free-griggs')], 'Buy Soul Arrow from Griggs or Rickert.'),
  addSpell('great-soul-arrow', 'Great Soul Arrow', 'firelink', [reqAction('free-griggs')], 'Buy Great Soul Arrow from Griggs.'),
  addSpell('heavy-soul-arrow', 'Heavy Soul Arrow', 'firelink', [reqAction('free-griggs')], 'Buy Heavy Soul Arrow from Griggs.'),
  addSpell('great-heavy-soul-arrow', 'Great Heavy Soul Arrow', 'firelink', [reqAction('free-griggs')], 'Buy Great Heavy Soul Arrow from Griggs.'),
  addSpell('homing-soulmass', 'Homing Soulmass', 'firelink', [reqAction('free-logan-sens')], 'Buy Homing Soulmass from Logan at Firelink.'),
  addSpell('homing-crystal-soulmass', 'Homing Crystal Soulmass', 'dukes', [reqAction('free-logan-dukes')], 'Buy Homing Crystal Soulmass from Logan in the Archives.'),
  addSpell('soul-spear', 'Soul Spear', 'firelink', [reqAction('free-logan-sens')], 'Buy Soul Spear from Logan.'),
  addSpell('crystal-soul-spear', 'Crystal Soul Spear', 'dukes', [reqAction('free-logan-dukes')], 'Buy Crystal Soul Spear from Logan in the Archives.'),
  addSpell('magic-weapon', 'Magic Weapon', 'firelink', [reqAction('free-griggs')], 'Buy Magic Weapon from Griggs.'),
  addSpell('great-magic-weapon', 'Great Magic Weapon', 'anor-londo', [reqAction('reach-anor-londo')], 'Loot Great Magic Weapon in Anor Londo.'),
  addSpell('crystal-magic-weapon', 'Crystal Magic Weapon', 'dukes', [reqAction('free-logan-dukes')], 'Buy Crystal Magic Weapon from Logan.'),
  addSpell('magic-shield', 'Magic Shield', 'firelink', [reqAction('free-griggs')], 'Buy Magic Shield from Griggs.'),
  addSpell('strong-magic-shield', 'Strong Magic Shield', 'dukes', [reqAction('enter-dukes')], 'Loot Strong Magic Shield in the Archives.'),
  addSpell('aural-decoy', 'Aural Decoy', 'firelink', [reqAction('free-griggs')], 'Buy Aural Decoy from Griggs.'),
  addSpell('hush', 'Hush', 'sens', [reqAction('enter-sens')], 'Loot Hush in Sen’s Fortress.'),
  addSpell('fall-control', 'Fall Control', 'firelink', [reqAction('free-griggs')], 'Buy Fall Control from Griggs.'),
  addSpell('hidden-body', 'Hidden Body', 'darkroot', [reqAction('open-darkroot-door')], 'Buy Hidden Body from Dusk of Oolacile.'),
  addSpell('cast-light', 'Cast Light', 'darkroot', [reqAction('open-darkroot-door')], 'Buy Cast Light from Dusk of Oolacile.'),
  addSpell('repair', 'Repair', 'darkroot', [reqAction('open-darkroot-door')], 'Buy Repair from Dusk of Oolacile.'),
  addSpell('chameleon', 'Chameleon', 'painted-world', [reqAction('enter-painted-world')], 'Loot Chameleon in the Painted World.'),
  addSpell('remedy', 'Remedy', 'blighttown', [reqAction('enter-blighttown')], 'Loot Remedy in Blighttown.'),
  addSpell('resist-curse', 'Resist Curse', 'new-londo', [reqAction('drain-new-londo')], 'Buy Resist Curse from Ingward.'),
  addSpell('white-dragon-breath', 'White Dragon Breath', 'dukes', [reqAction('defeat-seath'), reqAction('free-logan-dukes')], 'After Seath, find hollow Logan in the Archives crystal cave room for White Dragon Breath.'),
]

const pyromancyActions = [
  addSpell('fireball', 'Fireball', 'firelink', [reqAction('free-laurentius')], 'Buy Fireball from Laurentius.'),
  addSpell('fire-orb', 'Fire Orb', 'firelink', [reqAction('free-laurentius')], 'Buy Fire Orb from Laurentius.'),
  addSpell('combustion', 'Combustion', 'firelink', [reqAction('free-laurentius')], 'Buy Combustion from Laurentius.'),
  addSpell('great-combustion', 'Great Combustion', 'blighttown', [reqAction('join-chaos-servant')], 'Buy Great Combustion from Quelana.'),
  addSpell('firestorm', 'Firestorm', 'blighttown', [reqAction('join-chaos-servant')], 'Buy Firestorm from Quelana.'),
  addSpell('fire-tempest', 'Fire Tempest', 'blighttown', [reqAction('join-chaos-servant')], 'Buy Fire Tempest from Quelana or loot after killing her sister path.'),
  addSpell('fire-whip', 'Fire Whip', 'blighttown', [reqAction('join-chaos-servant')], 'Buy Fire Whip from Quelana.'),
  addSpell('poison-mist', 'Poison Mist', 'blighttown', [reqAction('enter-blighttown')], 'Loot Poison Mist in Blighttown swamp.'),
  addSpell('toxic-mist', 'Toxic Mist', 'blighttown', [reqAction('join-chaos-servant')], 'Buy Toxic Mist from Eingyi.'),
  addSpell('acid-surge', 'Acid Surge', 'painted-world', [reqAction('enter-painted-world')], 'Loot Acid Surge in the Painted World.'),
  addSpell('iron-flesh', 'Iron Flesh', 'firelink', [reqAction('free-laurentius')], 'Buy Iron Flesh from Laurentius.'),
  addSpell('flash-sweat', 'Flash Sweat', 'firelink', [reqAction('free-laurentius')], 'Buy Flash Sweat from Laurentius.'),
  addSpell('power-within', 'Power Within', 'blighttown', [reqAction('enter-blighttown')], 'Loot Power Within near the Cragspider in Blighttown.'),
  addSpell('undead-rapport', 'Undead Rapport', 'blighttown', [reqAction('join-chaos-servant')], 'Buy Undead Rapport from Quelana.'),
  addSpell('great-chaos-fireball', 'Great Chaos Fireball', 'blighttown', [reqResult('chaos-servant')], 'Receive Great Chaos Fireball when joining Chaos Servant.'),
  addSpell('chaos-fire-whip', 'Chaos Fire Whip', 'lost-izalith', [reqAction('defeat-bed-of-chaos')], 'Loot Chaos Fire Whip in Lost Izalith.'),
  'offer-chaos-30',
]

const miracleActions = [
  addSpell('heal', 'Heal', 'firelink', [reqAction('join-way-of-white')], 'Buy Heal from Petrus or Rhea.'),
  addSpell('great-heal-excerpt', 'Great Heal Excerpt', 'firelink', [reqAction('join-way-of-white')], 'Buy Great Heal Excerpt from Petrus.'),
  addSpell('great-heal', 'Great Heal', 'undead-parish', [reqAction('defeat-capra')], 'Buy Great Heal from Rhea in the Parish (save her in Tomb of Giants first — do her quest early).'),
  addSpell('soothing-sunlight', 'Soothing Sunlight', 'undead-parish', [reqAction('defeat-capra')], 'Buy Soothing Sunlight from Rhea (conservative: finish her inventory before more bosses).'),
  addSpell('replenishment', 'Replenishment', 'tomb-giants', [reqAction('get-rite-kindling')], 'Save Rhea in the Tomb of Giants pit for Replenishment.'),
  addSpell('bountiful-sunlight', 'Bountiful Sunlight', 'undead-parish', [reqAction('defeat-capra')], 'Buy Bountiful Sunlight from Rhea.'),
  addSpell('force', 'Force', 'firelink', [reqAction('join-way-of-white')], 'Buy Force from Petrus or Rhea.'),
  addSpell('wrath-of-gods', 'Wrath of the Gods', 'undead-parish', [reqAction('defeat-capra')], 'Buy Wrath of the Gods from Rhea.'),
  addSpell('emit-force', 'Emit Force', 'firelink', [reqAction('reach-anor-londo')], 'Receive Emit Force from Siegmeyer’s questline reward path / buy alternatives as needed.'),
  addSpell('magic-barrier', 'Magic Barrier', 'undead-parish', [reqAction('defeat-capra')], 'Buy Magic Barrier from Rhea.'),
  addSpell('great-magic-barrier', 'Great Magic Barrier', 'ash-lake', [reqAction('enter-ash-lake')], 'Loot Great Magic Barrier in Ash Lake’s hollow trunk.'),
  addSpell('homeward', 'Homeward', 'firelink', [reqAction('join-way-of-white')], 'Buy Homeward from Petrus.'),
  addSpell('seek-guidance', 'Seek Guidance', 'firelink', [reqAction('join-way-of-white')], 'Buy Seek Guidance from Petrus.'),
  addSpell('karmic-justice', 'Karmic Justice', 'firelink', [reqAction('join-way-of-white')], 'Buy Karmic Justice from Oswald after ringing the Parish bell.'),
  addSpell('vow-of-silence', 'Vow of Silence', 'painted-world', [reqAction('enter-painted-world')], 'Loot Vow of Silence in the Painted World.'),
  addSpell('tranquil-walk', 'Tranquil Walk of Peace', 'catacombs', [reqAction('get-rite-kindling')], 'Loot Tranquil Walk of Peace in the Catacombs.'),
  addSpell('lightning-spear', 'Lightning Spear', 'sunlight-altar', [reqResult('warrior-sunlight')], 'Receive Lightning Spear when joining Warrior of Sunlight.'),
  addSpell('great-lightning-spear', 'Great Lightning Spear', 'sunlight-altar', [reqResult('warrior-sunlight')], 'Offer 10 Sunlight Medals at the Sunlight Altar for Great Lightning Spear.'),
  addSpell('sunlight-spear', 'Sunlight Spear', 'sunlight-altar', [reqResult('warrior-sunlight'), reqItem('soul-gwyn')], 'Offer the Soul of Gwyn at the Sunlight Altar for Sunlight Spear (forces a later run for Great Lord Greatsword if both are needed).'),
  addSpell('darkmoon-blade', 'Darkmoon Blade', 'dark-anor-londo', [reqResult('darkmoon')], 'Reach Darkmoon covenant rank for Darkmoon Blade (Souvenirs of Reprisal — farm the Painting Guardians / Dark Anor Londo offline sources as available).'),
  addSpell('gravelord-sword-dance', 'Gravelord Sword Dance', 'catacombs', [reqResult('gravelord')], 'Receive Gravelord Sword Dance when joining Gravelord Servant.'),
  addSpell('gravelord-greatsword-dance', 'Gravelord Greatsword Dance', 'catacombs', [reqResult('gravelord')], 'Offer Eyes of Death to rank up Gravelord Servant for Gravelord Greatsword Dance.'),
  addSpell('sunlight-blade', 'Sunlight Blade', 'dark-anor-londo', [reqAction('defeat-gwyndolin')], 'Loot Sunlight Blade after defeating Gwyndolin.'),
]

actions.find((a) => a.id === 'learn-sunlight-spear').consumes = [{ item: 'soul-gwyn', amount: 1 }]

const allOtherAchievements = [
  'to-link-the-fire',
  'dark-lord',
  'knights-honor',
  'wisdom-sage',
  'bond-pyromancer',
  'prayer-maiden',
  'covenant-way-of-white',
  'covenant-princess-guard',
  'covenant-darkmoon',
  'covenant-warrior-sunlight',
  'covenant-forest-hunter',
  'covenant-darkwraith',
  'covenant-path-dragon',
  'covenant-gravelord',
  'covenant-chaos-servant',
  'strongest-weapon',
  'crystal-weapon',
  'lightning-weapon',
  'raw-weapon',
  'magic-weapon',
  'enchanted-weapon',
  'divine-weapon',
  'occult-weapon',
  'fire-weapon',
  'chaos-weapon',
  'enkindle',
  'estus-flask',
  'reach-lordran',
  'ring-bell-church',
  'ring-bell-quelaag',
  'rite-of-kindling',
  'art-of-abysswalking',
  'reach-anor-londo',
  'lordvessel',
  'defeat-nito',
  'defeat-bed-of-chaos',
  'defeat-four-kings',
  'defeat-seath',
  'defeat-gwyndolin',
  'defeat-priscilla',
]

const achievements = [
  { id: 'enkindle', name: 'Enkindle', description: 'Light bonfire flame.', conditions: [{ type: 'action', id: 'enkindle' }] },
  { id: 'estus-flask', name: 'Estus Flask', description: 'Acquire Estus Flask.', conditions: [{ type: 'action', id: 'get-estus' }] },
  { id: 'reach-lordran', name: 'Reach Lordran', description: 'Arrive in Lordran.', conditions: [{ type: 'action', id: 'reach-lordran' }] },
  { id: 'ring-bell-church', name: 'Ring the Bell (Undead Church)', description: 'Ring Bell of Awakening at Undead Church.', conditions: [{ type: 'action', id: 'ring-undead-church' }] },
  { id: 'ring-bell-quelaag', name: 'Ring the Bell (Quelaag\'s Domain)', description: 'Ring Bell of Awakening in Quelaag\'s domain.', conditions: [{ type: 'action', id: 'ring-quelaag' }] },
  { id: 'reach-anor-londo', name: 'Reach Anor Londo', description: 'Arrive in Anor Londo.', conditions: [{ type: 'action', id: 'reach-anor-londo' }] },
  { id: 'lordvessel', name: 'Lordvessel', description: 'Acquire the Lordvessel.', conditions: [{ type: 'action', id: 'get-lordvessel' }] },
  { id: 'rite-of-kindling', name: 'Rite of Kindling', description: 'Acquire the Rite of Kindling.', conditions: [{ type: 'action', id: 'get-rite-kindling' }] },
  { id: 'art-of-abysswalking', name: 'Art of Abysswalking', description: 'Acquire the Art of Abysswalking.', conditions: [{ type: 'action', id: 'defeat-sif' }] },
  { id: 'defeat-nito', name: 'Defeat Gravelord Nito', description: 'Defeat the Soul Lord Gravelord Nito.', conditions: [{ type: 'action', id: 'defeat-nito' }] },
  { id: 'defeat-bed-of-chaos', name: 'Defeat Bed of Chaos', description: 'Defeat the Soul Lord Bed of Chaos.', conditions: [{ type: 'action', id: 'defeat-bed-of-chaos' }] },
  { id: 'defeat-four-kings', name: 'Defeat the Four Kings', description: 'Defeat the Four Kings, inheritors of souls.', conditions: [{ type: 'action', id: 'defeat-four-kings' }] },
  { id: 'defeat-seath', name: 'Defeat Seath the Scaleless', description: 'Defeat Seath the Scaleless, inheritors of souls.', conditions: [{ type: 'action', id: 'defeat-seath' }] },
  { id: 'defeat-gwyndolin', name: 'Defeat the Dark Sun Gwyndolin', description: 'Defeat Dark Sun Gwyndolin, the Darkmoon God.', conditions: [{ type: 'action', id: 'defeat-gwyndolin' }] },
  { id: 'defeat-priscilla', name: 'Defeat Crossbreed Priscilla', description: 'Defeat Crossbreed Priscilla, the Lifehunter.', conditions: [{ type: 'action', id: 'defeat-priscilla' }] },
  { id: 'to-link-the-fire', name: 'To Link the Fire', description: 'Reach "To Link the Fire" ending.', conditions: [{ type: 'action', id: 'link-the-fire' }] },
  { id: 'dark-lord', name: 'Dark Lord', description: 'Reach "The Dark Lord" ending.', conditions: [{ type: 'action', id: 'dark-lord-ending' }] },
  { id: 'covenant-way-of-white', name: 'Covenant: Way of White', description: 'Discover Way of White covenant.', conditions: [{ type: 'action', id: 'join-way-of-white' }] },
  { id: 'covenant-princess-guard', name: "Covenant: Princess's Guard", description: "Discover Princess's Guard covenant.", conditions: [{ type: 'action', id: 'join-princess-guard' }] },
  { id: 'covenant-darkmoon', name: 'Covenant: Blade of the Darkmoon', description: 'Discover Blade of the Darkmoon covenant.', conditions: [{ type: 'action', id: 'join-darkmoon' }] },
  { id: 'covenant-warrior-sunlight', name: 'Covenant: Warrior of Sunlight', description: 'Discover Warrior of Sunlight covenant.', conditions: [{ type: 'action', id: 'join-warrior-sunlight' }] },
  { id: 'covenant-forest-hunter', name: 'Covenant: Forest Hunter', description: 'Discover Forest Hunter covenant.', conditions: [{ type: 'action', id: 'join-forest-hunter' }] },
  { id: 'covenant-darkwraith', name: 'Covenant: Darkwraith', description: 'Discover Darkwraith covenant.', conditions: [{ type: 'action', id: 'join-darkwraith' }] },
  { id: 'covenant-path-dragon', name: 'Covenant: Path of the Dragon', description: 'Discover Path of the Dragon covenant.', conditions: [{ type: 'action', id: 'join-path-dragon' }] },
  { id: 'covenant-gravelord', name: 'Covenant: Gravelord Servant', description: 'Discover Gravelord Servant covenant.', conditions: [{ type: 'action', id: 'join-gravelord' }] },
  { id: 'covenant-chaos-servant', name: 'Covenant: Chaos Servant', description: 'Discover Chaos Servant covenant.', conditions: [{ type: 'action', id: 'join-chaos-servant' }] },
  { id: 'strongest-weapon', name: 'Strongest Weapon', description: 'Acquire best weapon through standard reinforcement.', conditions: [{ type: 'action', id: craftStandard }] },
  { id: 'crystal-weapon', name: 'Crystal Weapon', description: 'Acquire best weapon through crystal reinforcement.', conditions: [{ type: 'action', id: craftCrystal }] },
  { id: 'lightning-weapon', name: 'Lightning Weapon', description: 'Acquire best weapon through lightning reinforcement.', conditions: [{ type: 'action', id: craftLightning }] },
  { id: 'raw-weapon', name: 'Raw Weapon', description: 'Acquire best weapon through raw reinforcement.', conditions: [{ type: 'action', id: craftRaw }] },
  { id: 'magic-weapon', name: 'Magic Weapon', description: 'Acquire best weapon through magic reinforcement.', conditions: [{ type: 'action', id: craftMagic }] },
  { id: 'enchanted-weapon', name: 'Enchanted Weapon', description: 'Acquire best weapon through enchanted reinforcement.', conditions: [{ type: 'action', id: craftEnchanted }] },
  { id: 'divine-weapon', name: 'Divine Weapon', description: 'Acquire best weapon through divine reinforcement.', conditions: [{ type: 'action', id: craftDivine }] },
  { id: 'occult-weapon', name: 'Occult Weapon', description: 'Acquire best weapon through occult reinforcement.', conditions: [{ type: 'action', id: craftOccult }] },
  { id: 'fire-weapon', name: 'Fire Weapon', description: 'Acquire best weapon through fire reinforcement.', conditions: [{ type: 'action', id: craftFire }] },
  { id: 'chaos-weapon', name: 'Chaos Weapon', description: 'Acquire best weapon through chaos reinforcement.', conditions: [{ type: 'action', id: craftChaos }] },
  {
    id: 'wisdom-sage',
    name: 'Wisdom of a Sage',
    description: 'Acquire all sorceries.',
    conditions: sorceryActions.map((id) => ({ type: 'action', id })),
  },
  {
    id: 'bond-pyromancer',
    name: 'Bond of a Pyromancer',
    description: 'Acquire all pyromancies.',
    conditions: pyromancyActions.map((id) => ({ type: 'action', id })),
  },
  {
    id: 'prayer-maiden',
    name: 'Prayer of a Maiden',
    description: 'Acquire all miracles.',
    conditions: miracleActions.map((id) => ({ type: 'action', id })),
  },
  {
    id: 'knights-honor',
    name: "Knight's Honor",
    description: 'Acquire all rare weapons.',
    conditions: knightsHonorActions.map((id) => ({ type: 'action', id })),
  },
  {
    id: 'the-dark-soul',
    name: 'The Dark Soul',
    description: 'All achievements completed. Congratulations!',
    conditions: allOtherAchievements.map((id) => ({ type: 'achievement', id })),
  },
]

// Deduplicate items by id
const seenItems = new Set()
const uniqueItems = []
for (const row of items) {
  if (seenItems.has(row.id)) continue
  seenItems.add(row.id)
  uniqueItems.push(row)
}

const game = {
  id: 'dark-souls-remastered',
  name: 'DARK SOULS: REMASTERED',
  areas,
  enemies,
  results,
  items: uniqueItems,
  actions,
  achievements,
}

const error = validateGame(game)
if (error) {
  console.error('Validation failed:', error)
  process.exit(1)
}

const out = path.join(__dirname, '..', 'data', 'dark-souls-remastered.json')
fs.writeFileSync(out, `${JSON.stringify(game, null, 2)}\n`)
console.log(`Wrote ${out} (${actions.length} actions, ${achievements.length} achievements)`)
