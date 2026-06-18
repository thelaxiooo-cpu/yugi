// Taux de drop par niveau : [vert, jaune, orange, violet, blanc] en %
const DROP_RATES = {
  1: [100,  0,  0,  0, 0],
  2: [ 90, 10,  0,  0, 0],
  3: [ 70, 25,  5,  0, 0],
  4: [ 55, 28, 12,  5, 0],
  5: [ 40, 28, 18, 11, 3],
  6: [ 28, 25, 22, 20, 5],
};

function drawRarity(level) {
  const rates = DROP_RATES[level] || DROP_RATES[1];
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < rates.length; i++) {
    cumulative += rates[i];
    if (roll < cumulative) return i + 1;
  }
  return 1;
}

module.exports = { DROP_RATES, drawRarity };
