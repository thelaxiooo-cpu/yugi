const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription('Affiche ton profil (coins, cartes, level, boosters)'),

  async execute(interaction) {
    const { id: userId, username } = interaction.user;
    const player  = db.getPlayer(userId, username);
    const inventory = db.getInventory(userId);
    const boosters  = db.getBoosters(userId);

    const totalCards    = inventory.reduce((s, e) => s + e.quantity, 0);
    const totalBoosters = boosters.reduce((s, e) => s + e.quantity, 0);

    const embed = new EmbedBuilder()
      .setColor(0x00cc88)
      .setTitle(`👤 Profil de ${interaction.user.username}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '💰 DiggerCoins', value: `${player.coins} DC`,    inline: true },
        { name: '⭐ Niveau',      value: `${player.level}`,        inline: true },
        { name: '🃏 Cartes',      value: `${totalCards}`,          inline: true },
        { name: '📦 Boosters',    value: `${totalBoosters}`,       inline: true },
      );

    return interaction.reply({ embeds: [embed] });
  },
};
