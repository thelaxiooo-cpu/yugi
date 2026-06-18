const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { getCardById, RARITIES } = require('../utils/cards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deck')
    .setDescription('Affiche ta collection de cartes triée par rareté'),

  async execute(interaction) {
    const { id: userId, username } = interaction.user;
    db.getPlayer(userId, username);

    const inventory = db.getInventory(userId);
    if (inventory.length === 0) {
      return interaction.reply({
        content: '📦 Ta collection est vide ! Ouvre des boosters avec `/open`.',
        ephemeral: true,
      });
    }

    // Trier par rareté puis par id
    inventory.sort((a, b) => {
      const ca = getCardById(a.card_id);
      const cb = getCardById(b.card_id);
      return ca.rarity !== cb.rarity
        ? ca.rarity - cb.rarity
        : a.card_id.localeCompare(b.card_id);
    });

    // Grouper par rareté
    const grouped = {};
    for (const entry of inventory) {
      const card = getCardById(entry.card_id);
      if (!grouped[card.rarity]) grouped[card.rarity] = [];
      grouped[card.rarity].push(`${card.id} ×${entry.quantity}`);
    }

    const total = inventory.reduce((s, e) => s + e.quantity, 0);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🃏 Collection de ${interaction.user.username}`)
      .setFooter({ text: `Total : ${total} carte(s)` });

    for (const rarity of [1, 2, 3, 4, 5]) {
      if (!grouped[rarity]) continue;
      const r = RARITIES[rarity];
      embed.addFields({
        name:   `${r.emoji} ${r.name}`,
        value:  grouped[rarity].join('\n'),
        inline: true,
      });
    }

    return interaction.reply({ embeds: [embed] });
  },
};
