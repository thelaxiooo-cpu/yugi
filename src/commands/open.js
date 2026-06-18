const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const db = require('../database/db');
const { CARDS_BY_RARITY, RARITIES } = require('../utils/cards');
const { drawRarity } = require('../utils/dropRates');
const { BOOSTER_SIZE } = require('../../config');

function drawBooster(level) {
  const cards = [];
  for (let i = 0; i < BOOSTER_SIZE; i++) {
    const rarity = drawRarity(level);
    const pool   = CARDS_BY_RARITY[rarity];
    cards.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return cards;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('open')
    .setDescription('Ouvre un de tes boosters R&T'),

  async execute(interaction) {
    const { id: userId, username } = interaction.user;
    const player   = db.getPlayer(userId, username);
    const boosters = db.getBoosters(userId);

    if (boosters.length === 0) {
      return interaction.reply({
        content: "❌ Tu n'as aucun booster ! Achète-en avec `/shop`.",
        ephemeral: true,
      });
    }

    const booster = boosters[0];
    db.openBooster(userId, booster.booster_type);

    const drawn = drawBooster(player.level);
    for (const card of drawn) db.addCard(userId, card.id);

    const lines = drawn.map(card => {
      const r = RARITIES[card.rarity];
      return `${r.emoji} **${card.id}** — ${r.name}`;
    });

    const remaining = booster.quantity - 1;

    const embed = new EmbedBuilder()
      .setColor(0x9900ff)
      .setTitle(`🎴 Booster ${booster.booster_type} ouvert !`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Boosters restants : ${remaining}` });

    // Envoie les images des 5 cartes
    const files = drawn.map((card, i) =>
      new AttachmentBuilder(
        path.join(__dirname, '../../Cartes', card.file),
        { name: `card_${i + 1}.png` },
      ),
    );

    return interaction.reply({ embeds: [embed], files });
  },
};
