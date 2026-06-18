const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { BOOSTER_PRICES } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Achète des boosters R&T'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('🏪 Shop — Boosters R&T')
      .setDescription('Chaque booster contient **5 cartes**. Choisis ta quantité :')
      .addFields(
        { name: '1 Booster',   value: `${BOOSTER_PRICES[1]} DC`,  inline: true },
        { name: '5 Boosters',  value: `${BOOSTER_PRICES[5]} DC`,  inline: true },
        { name: '10 Boosters', value: `${BOOSTER_PRICES[10]} DC`, inline: true },
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('buy_booster_1')
        .setLabel(`1 Booster — ${BOOSTER_PRICES[1]} DC`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('buy_booster_5')
        .setLabel(`5 Boosters — ${BOOSTER_PRICES[5]} DC`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('buy_booster_10')
        .setLabel(`10 Boosters — ${BOOSTER_PRICES[10]} DC`)
        .setStyle(ButtonStyle.Danger),
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  },
};
