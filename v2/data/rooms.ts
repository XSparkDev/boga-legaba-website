import type { PropertyKey } from './site'

export type Configuration = 'Twin' | 'Double' | 'Family' | 'Triple' | 'TBC'
export type Bathroom = 'Bath only' | 'Shower only' | 'Bath & Shower' | 'TBC'

export interface Room {
  name: string
  property: PropertyKey
  configuration: Configuration
  bathroom: Bathroom
  address: string
}

export const rooms: Room[] = [
  // Chababa (8 Interlaken) — 10 Rooms
  { name: 'Beads', property: 'chababa', configuration: 'Double', bathroom: 'Bath only', address: '8 Interlaken Avenue' },
  { name: 'Blue Clouds', property: 'chababa', configuration: 'Twin', bathroom: 'Bath & Shower', address: '8 Interlaken Avenue' },
  { name: 'Flutes', property: 'chababa', configuration: 'Twin', bathroom: 'Shower only', address: '8 Interlaken Avenue' },
  { name: 'Hunters', property: 'chababa', configuration: 'Double', bathroom: 'Shower only', address: '8 Interlaken Avenue' },
  { name: 'Huts', property: 'chababa', configuration: 'Double', bathroom: 'Shower only', address: '8 Interlaken Avenue' },
  { name: 'Letimela', property: 'chababa', configuration: 'Family', bathroom: 'Bath & Shower', address: '8 Interlaken Avenue' },
  { name: 'Modjadji', property: 'chababa', configuration: 'Double', bathroom: 'Shower only', address: '8 Interlaken Avenue' },
  { name: 'Queens', property: 'chababa', configuration: 'Double', bathroom: 'Shower only', address: '8 Interlaken Avenue' },
  { name: 'Reeds', property: 'chababa', configuration: 'Double', bathroom: 'Bath & Shower', address: '8 Interlaken Avenue' },
  { name: 'Spears', property: 'chababa', configuration: 'Twin', bathroom: 'Shower only', address: '8 Interlaken Avenue' },

  // Interlaken A (6 Interlaken) — 6 Rooms
  { name: 'A Mulher Africana', property: 'interlaken-a', configuration: 'Family', bathroom: 'Shower only', address: '6 Interlaken Avenue' },
  { name: 'Blue Sea', property: 'interlaken-a', configuration: 'Twin', bathroom: 'Shower only', address: '6 Interlaken Avenue' },
  { name: 'Red Room', property: 'interlaken-a', configuration: 'Double', bathroom: 'Bath only', address: '6 Interlaken Avenue' },
  { name: 'Calabash', property: 'interlaken-a', configuration: 'Double', bathroom: 'Bath & Shower', address: '6 Interlaken Avenue' },
  { name: 'Segametsi', property: 'interlaken-a', configuration: 'Family', bathroom: 'Shower only', address: '6 Interlaken Avenue' },
  { name: 'Squater Comfort', property: 'interlaken-a', configuration: 'Triple', bathroom: 'Shower only', address: '6 Interlaken Avenue' },

  // Lantana (10 Lantana) — 7 Rooms (some TBC)
  { name: 'Modiga', property: 'lantana', configuration: 'TBC', bathroom: 'TBC', address: '10 Lantana Street' },
  { name: 'Mojamorago', property: 'lantana', configuration: 'TBC', bathroom: 'TBC', address: '10 Lantana Street' },
  { name: 'Mophato', property: 'lantana', configuration: 'TBC', bathroom: 'TBC', address: '10 Lantana Street' },
  { name: 'Motswakgomo', property: 'lantana', configuration: 'TBC', bathroom: 'TBC', address: '10 Lantana Street' },
  { name: 'Lantana Room 5', property: 'lantana', configuration: 'TBC', bathroom: 'TBC', address: '10 Lantana Street' },
  { name: 'Lantana Room 6', property: 'lantana', configuration: 'TBC', bathroom: 'TBC', address: '10 Lantana Street' },
  { name: 'Lantana Room 7', property: 'lantana', configuration: 'TBC', bathroom: 'TBC', address: '10 Lantana Street' },

  // Transnet Portfolio — 4 Rooms (TBC)
  { name: 'Lokomotief', property: 'transnet', configuration: 'TBC', bathroom: 'TBC', address: 'Transnet Portfolio' },
  { name: 'Mjantshi', property: 'transnet', configuration: 'TBC', bathroom: 'TBC', address: 'Transnet Portfolio' },
  { name: 'Shosholoza', property: 'transnet', configuration: 'TBC', bathroom: 'TBC', address: 'Transnet Portfolio' },
  { name: 'Stimela', property: 'transnet', configuration: 'TBC', bathroom: 'TBC', address: 'Transnet Portfolio' },
]

export function roomsByProperty(property: PropertyKey) {
  return rooms.filter((r) => r.property === property)
}
