const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription("Affiche l'aide des commandes"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📚 Aide — Commandes DiggerBot')
      .addFields(
        {
          name: '💰 Économie',
          value: '`/dc` — Récupère 100–1000 DiggerCoins (1×/jour)\n`/me` — Ton profil (coins, cartes, level, boosters)',
        },
        {
          name: '🎴 Cartes & Boosters',
          value: '`/shop` — Achète des boosters\n`/open` — Ouvre un de tes boosters\n`/deck` — Ta collection triée par rareté\n`/drops` — Taux de drop par niveau',
        },
        {
          name: '⬆️ Progression',
          value: '`/lvl` — Monte de niveau (sacrifie tes cartes de ta rareté actuelle + DC)',
        },
        {
          name: '⚽ Pronostics',
          value: '`/prono <score>` — Soumet ton pronostic (ex: `/prono 2-1`)\nModifiable jusqu\'à 5 min avant le match',
        },
        {
          name: '🏆 Récompenses pronostics',
          value: '✅ Score exact → **3 boosters**\n🏅 Bon vainqueur → **1 booster**',
        },
      )
      .setFooter({ text: 'DiggerBot — Bonne chance !' });

    return interaction.reply({ embeds: [embed] });
  },
};
