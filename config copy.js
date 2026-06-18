module.exports = {
  ALLOWED_CHANNEL_ID: '1070755417086513313',

  BOOSTER_PRICES: { 1: 500, 5: 2000, 10: 3500 },
  BOOSTER_SIZE: 5,

  DAILY_MIN: 100,
  DAILY_MAX: 1000,

  // Pour chaque niveau : quelle rareté sacrifier + coût en DC pour monter
  LEVEL_UP: {
    1: { rarity: 1, coins: 500 },
    2: { rarity: 2, coins: 1000 },
    3: { rarity: 3, coins: 2000 },
    4: { rarity: 4, coins: 5000 },
    5: { rarity: 5, coins: 10000 },
  },
  MAX_LEVEL: 6,
};
