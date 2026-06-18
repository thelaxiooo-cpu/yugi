const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DROP_RATES } = require('../utils/dropRates');
const { RARITIES } = require('../utils/cards');
const { MAX_LEVEL } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('drops')
    .setDescription('Affiche les taux de drop par niveau'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📊 Taux de drop par niveau');

    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      const rates = DROP_RATES[lvl];
      const line  = rates
        .map((rate, i) => (rate > 0 ? `${RARITIES[i + 1].emoji} ${rate}%` : null))
        .filter(Boolean)
        .join('  ');
      embed.addFields({ name: `Niveau ${lvl}`, value: line });
    }

    return interaction.reply({ embeds: [embed] });
  },
};
