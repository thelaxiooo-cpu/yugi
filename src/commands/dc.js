const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { DAILY_MIN, DAILY_MAX } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dc')
    .setDescription('Récupère tes DiggerCoins quotidiens (100–1000)'),

  async execute(interaction) {
    const { id: userId, username } = interaction.user;

    if (!db.canClaimDaily(userId)) {
      return interaction.reply({
        content: "❌ Tu as déjà récupéré tes DiggerCoins aujourd'hui ! Reviens demain.",
        ephemeral: true,
      });
    }

    const player = db.getPlayer(userId, username);
    const amount = Math.floor(Math.random() * (DAILY_MAX - DAILY_MIN + 1)) + DAILY_MIN;

    db.updateCoins(userId, amount);
    db.setLastDaily(userId);

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('💰 DiggerCoins quotidiens !')
      .setDescription(`Tu as gagné **${amount} DC** !`)
      .addFields({ name: 'Solde total', value: `${player.coins + amount} DC`, inline: true })
      .setFooter({ text: 'Reviens demain pour de nouveaux coins !' });

    return interaction.reply({ embeds: [embed] });
  },
};
