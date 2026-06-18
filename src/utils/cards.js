const RARITIES = {
  1: { name: 'Verte',    emoji: '🟢', color: 0x00cc44 },
  2: { name: 'Jaune',    emoji: '🟡', color: 0xffdd00 },
  3: { name: 'Orange',   emoji: '🟠', color: 0xff8800 },
  4: { name: 'Violette', emoji: '🟣', color: 0x9900ff },
  5: { name: 'Blanche',  emoji: '⚪', color: 0xdddddd },
};

// 46 cartes réparties par rareté
// R&T-003 et R&T-005 n'existent pas dans le dossier Cartes
// R&T-018 a le fichier nommé R&T-018png.png
const CARDS = [
  // ── Verte (rareté 1) ── 18 cartes
  { id: 'R&T-001', file: 'R&T-001.png',    rarity: 1 },
  { id: 'R&T-002', file: 'R&T-002.png',    rarity: 1 },
  { id: 'R&T-004', file: 'R&T-004.png',    rarity: 1 },
  { id: 'R&T-006', file: 'R&T-006.png',    rarity: 1 },
  { id: 'R&T-007', file: 'R&T-007.png',    rarity: 1 },
  { id: 'R&T-008', file: 'R&T-008.png',    rarity: 1 },
  { id: 'R&T-009', file: 'R&T-009.png',    rarity: 1 },
  { id: 'R&T-010', file: 'R&T-010.png',    rarity: 1 },
  { id: 'R&T-011', file: 'R&T-011.png',    rarity: 1 },
  { id: 'R&T-012', file: 'R&T-012.png',    rarity: 1 },
  { id: 'R&T-013', file: 'R&T-013.png',    rarity: 1 },
  { id: 'R&T-014', file: 'R&T-014.png',    rarity: 1 },
  { id: 'R&T-015', file: 'R&T-015.png',    rarity: 1 },
  { id: 'R&T-016', file: 'R&T-016.png',    rarity: 1 },
  { id: 'R&T-017', file: 'R&T-017.png',    rarity: 1 },
  { id: 'R&T-018', file: 'R&T-018png.png', rarity: 1 },
  { id: 'R&T-019', file: 'R&T-019.png',    rarity: 1 },
  { id: 'R&T-020', file: 'R&T-020.png',    rarity: 1 },
  // ── Jaune (rareté 2) ── 13 cartes
  { id: 'R&T-021', file: 'R&T-021.png', rarity: 2 },
  { id: 'R&T-022', file: 'R&T-022.png', rarity: 2 },
  { id: 'R&T-023', file: 'R&T-023.png', rarity: 2 },
  { id: 'R&T-024', file: 'R&T-024.png', rarity: 2 },
  { id: 'R&T-025', file: 'R&T-025.png', rarity: 2 },
  { id: 'R&T-026', file: 'R&T-026.png', rarity: 2 },
  { id: 'R&T-027', file: 'R&T-027.png', rarity: 2 },
  { id: 'R&T-028', file: 'R&T-028.png', rarity: 2 },
  { id: 'R&T-029', file: 'R&T-029.png', rarity: 2 },
  { id: 'R&T-030', file: 'R&T-030.png', rarity: 2 },
  { id: 'R&T-031', file: 'R&T-031.png', rarity: 2 },
  { id: 'R&T-032', file: 'R&T-032.png', rarity: 2 },
  { id: 'R&T-033', file: 'R&T-033.png', rarity: 2 },
  // ── Orange (rareté 3) ── 8 cartes
  { id: 'R&T-034', file: 'R&T-034.png', rarity: 3 },
  { id: 'R&T-035', file: 'R&T-035.png', rarity: 3 },
  { id: 'R&T-036', file: 'R&T-036.png', rarity: 3 },
  { id: 'R&T-037', file: 'R&T-037.png', rarity: 3 },
  { id: 'R&T-038', file: 'R&T-038.png', rarity: 3 },
  { id: 'R&T-039', file: 'R&T-039.png', rarity: 3 },
  { id: 'R&T-040', file: 'R&T-040.png', rarity: 3 },
  { id: 'R&T-041', file: 'R&T-041.png', rarity: 3 },
  // ── Violette (rareté 4) ── 5 cartes
  { id: 'R&T-042', file: 'R&T-042.png', rarity: 4 },
  { id: 'R&T-043', file: 'R&T-043.png', rarity: 4 },
  { id: 'R&T-044', file: 'R&T-044.png', rarity: 4 },
  { id: 'R&T-045', file: 'R&T-045.png', rarity: 4 },
  { id: 'R&T-046', file: 'R&T-046.png', rarity: 4 },
  // ── Blanche (rareté 5) ── 2 cartes
  { id: 'R&T-047', file: 'R&T-047.png', rarity: 5 },
  { id: 'R&T-048', file: 'R&T-048.png', rarity: 5 },
];

const CARDS_BY_RARITY = {};
for (const card of CARDS) {
  if (!CARDS_BY_RARITY[card.rarity]) CARDS_BY_RARITY[card.rarity] = [];
  CARDS_BY_RARITY[card.rarity].push(card);
}

function getCardById(id) {
  return CARDS.find(c => c.id === id);
}

module.exports = { CARDS, RARITIES, CARDS_BY_RARITY, getCardById };
