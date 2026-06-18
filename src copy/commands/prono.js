const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prono')
    .setDescription('Soumet ton pronostic pour le prochain match')
    .addStringOption(opt =>
      opt.setName('score')
        .setDescription('Score prédit, ex : 2-1')
        .setRequired(true),
    ),

  async execute(interaction) {
    const { id: userId, username } = interaction.user;
    db.getPlayer(userId, username);

    const raw   = interaction.options.getString('score');
    const match = raw.match(/^(\d+)-(\d+)$/);
    if (!match) {
      return interaction.reply({
        content: '❌ Format invalide ! Utilise par exemple `/prono 2-1`.',
        ephemeral: true,
      });
    }

    const [, s1, s2] = match;
    const score1 = parseInt(s1, 10);
    const score2 = parseInt(s2, 10);

    const nextMatch = db.getNextMatch();
    if (!nextMatch) {
      return interaction.reply({
        content: "❌ Aucun match à venir pour l'instant.",
        ephemeral: true,
      });
    }

    if (nextMatch.status === 'locked') {
      return interaction.reply({
        content: '🔒 Les pronostics sont fermés (moins de 5 min avant le match) !',
        ephemeral: true,
      });
    }

    const existing = db.getPlayerPronostic(userId, nextMatch.id);
    db.setPronostic(userId, nextMatch.id, score1, score2);

    const embed = new EmbedBuilder()
      .setColor(0x00cc44)
      .setTitle(existing ? '✏️ Pronostic mis à jour !' : '✅ Pronostic enregistré !')
      .addFields(
        { name: 'Match',          value: `${nextMatch.team1} vs ${nextMatch.team2}`, inline: true },
        { name: 'Ton pronostic',  value: `${score1}–${score2}`,                      inline: true },
      )
      .setFooter({ text: "Tu peux modifier jusqu'à 5 min avant le match." });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
