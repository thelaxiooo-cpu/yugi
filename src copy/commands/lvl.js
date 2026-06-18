const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { RARITIES } = require('../utils/cards');
const { LEVEL_UP, MAX_LEVEL } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lvl')
    .setDescription('Monte de niveau en sacrifiant tes cartes + des DiggerCoins'),

  async execute(interaction) {
    const { id: userId, username } = interaction.user;
    const player = db.getPlayer(userId, username);

    if (player.level >= MAX_LEVEL) {
      return interaction.reply({
        content: `🏆 Tu es déjà au niveau maximum (${MAX_LEVEL}) !`,
        ephemeral: true,
      });
    }

    const { rarity, coins: coinsCost } = LEVEL_UP[player.level];
    const r          = RARITIES[rarity];
    const cardCount  = db.countCardsOfRarity(userId, rarity);

    if (cardCount === 0) {
      return interaction.reply({
        content: `❌ Tu n'as aucune carte ${r.emoji} **${r.name}** à sacrifier !`,
        ephemeral: true,
      });
    }

    if (player.coins < coinsCost) {
      return interaction.reply({
        content: `❌ Il te faut **${coinsCost} DC** pour monter de niveau (tu as ${player.coins} DC).`,
        ephemeral: true,
      });
    }

    db.removeAllCardsOfRarity(userId, rarity);
    db.updateCoins(userId, -coinsCost);
    db.setLevel(userId, player.level + 1);

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('⬆️ Niveau supérieur !')
      .setDescription(`Tu es maintenant **niveau ${player.level + 1}** !`)
      .addFields(
        { name: 'Cartes sacrifiées', value: `${cardCount}× ${r.emoji} ${r.name}`, inline: true },
        { name: 'DC dépensés',       value: `${coinsCost} DC`,                    inline: true },
      )
      .setFooter({ text: 'Tes taux de drop ont augmenté ! Consulte /drops' });

    return interaction.reply({ embeds: [embed] });
  },
};
