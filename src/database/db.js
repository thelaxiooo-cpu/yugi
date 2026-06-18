const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../../data.json');

// ── Helpers I/O ──────────────────────────────────────────────────────────────

function load() {
  if (!fs.existsSync(FILE)) return fresh();
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return fresh(); }
}

function fresh() {
  return { players: {}, inventory: {}, boosters: {}, matches: [], pronostics: {}, _nextMatchId: 1 };
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Expose raw db object (for direct access in lvl.js)
const db = { _raw: null };
db._raw = load();
function raw() { return db._raw; }

// ── Players ──────────────────────────────────────────────────────────────────

function getPlayer(userId, username) {
  const data = raw();
  if (!data.players[userId]) {
    data.players[userId] = { username, coins: 0, level: 1, last_daily: null };
    save(data);
  }
  return { user_id: userId, ...data.players[userId] };
}

function updateCoins(userId, amount) {
  const data = raw();
  data.players[userId].coins = (data.players[userId].coins || 0) + amount;
  save(data);
}

function setLastDaily(userId) {
  const data = raw();
  data.players[userId].last_daily = new Date().toISOString().split('T')[0];
  save(data);
}

function canClaimDaily(userId) {
  const data  = raw();
  const today = new Date().toISOString().split('T')[0];
  return !data.players[userId] || data.players[userId].last_daily !== today;
}

function setLevel(userId, level) {
  const data = raw();
  data.players[userId].level = level;
  save(data);
}

// ── Inventory ────────────────────────────────────────────────────────────────

function addCard(userId, cardId) {
  const data = raw();
  if (!data.inventory[userId]) data.inventory[userId] = {};
  data.inventory[userId][cardId] = (data.inventory[userId][cardId] || 0) + 1;
  save(data);
}

function removeAllCardsOfRarity(userId, rarity) {
  const { CARDS } = require('../utils/cards');
  const data = raw();
  if (!data.inventory[userId]) return;
  for (const card of CARDS.filter(c => c.rarity === rarity)) {
    delete data.inventory[userId][card.id];
  }
  save(data);
}

function countCardsOfRarity(userId, rarity) {
  const { CARDS } = require('../utils/cards');
  const data = raw();
  const inv  = data.inventory[userId] || {};
  return CARDS
    .filter(c => c.rarity === rarity)
    .reduce((sum, card) => sum + (inv[card.id] || 0), 0);
}

function getInventory(userId) {
  const data = raw();
  const inv  = data.inventory[userId] || {};
  return Object.entries(inv)
    .filter(([, qty]) => qty > 0)
    .map(([card_id, quantity]) => ({ user_id: userId, card_id, quantity }));
}

// ── Boosters ─────────────────────────────────────────────────────────────────

function addBoosters(userId, boosterType, amount) {
  const data = raw();
  if (!data.boosters[userId]) data.boosters[userId] = {};
  data.boosters[userId][boosterType] = (data.boosters[userId][boosterType] || 0) + amount;
  save(data);
}

function getBoosters(userId) {
  const data = raw();
  const b    = data.boosters[userId] || {};
  return Object.entries(b)
    .filter(([, qty]) => qty > 0)
    .map(([booster_type, quantity]) => ({ user_id: userId, booster_type, quantity }));
}

function openBooster(userId, boosterType) {
  const data = raw();
  const qty  = (data.boosters[userId] || {})[boosterType] || 0;
  if (qty <= 0) return false;
  data.boosters[userId][boosterType]--;
  save(data);
  return true;
}

// ── Matches ───────────────────────────────────────────────────────────────────

function createMatch(team1, team2, scheduledAt) {
  const data = raw();
  const id   = data._nextMatchId++;
  data.matches.push({ id, team1, team2, scheduled_at: scheduledAt, score1: null, score2: null, status: 'upcoming', notified_1h: false, notified_5min: false });
  save(data);
  return { lastInsertRowid: id };
}

function getUpcomingMatches() {
  return raw().matches.filter(m => m.status === 'upcoming' || m.status === 'locked');
}

function getNextMatch() {
  return raw().matches
    .filter(m => m.status === 'upcoming')
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0] || null;
}

function getMatchById(id) {
  return raw().matches.find(m => m.id === id) || null;
}

function setMatchResult(matchId, score1, score2) {
  const data = raw();
  const m    = data.matches.find(x => x.id === matchId);
  if (!m) return;
  m.score1 = score1; m.score2 = score2; m.status = 'finished';
  save(data);
}

function markNotified1h(matchId) {
  const data = raw();
  const m    = data.matches.find(x => x.id === matchId);
  if (m) { m.notified_1h = true; save(data); }
}

function markNotified5min(matchId) {
  const data = raw();
  const m    = data.matches.find(x => x.id === matchId);
  if (m) { m.notified_5min = true; m.status = 'locked'; save(data); }
}

// ── Pronostics ────────────────────────────────────────────────────────────────

function setPronostic(userId, matchId, score1, score2) {
  const data  = raw();
  const key   = String(matchId);
  if (!data.pronostics[key]) data.pronostics[key] = {};
  data.pronostics[key][userId] = { score1, score2 };
  save(data);
}

function getPronostics(matchId) {
  const entries = raw().pronostics[String(matchId)] || {};
  return Object.entries(entries).map(([user_id, p]) => ({ user_id, ...p }));
}

function getPlayerPronostic(userId, matchId) {
  const entries = raw().pronostics[String(matchId)] || {};
  return entries[userId] ? { user_id: userId, match_id: matchId, ...entries[userId] } : null;
}

module.exports = {
  db,
  getPlayer, updateCoins, setLastDaily, canClaimDaily, setLevel,
  addCard, removeAllCardsOfRarity, countCardsOfRarity, getInventory,
  addBoosters, getBoosters, openBooster,
  createMatch, getUpcomingMatches, getNextMatch, getMatchById, setMatchResult, markNotified1h, markNotified5min,
  setPronostic, getPronostics, getPlayerPronostic,
};
