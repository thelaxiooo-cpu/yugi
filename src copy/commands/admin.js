const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Commandes admin (tests & gestion)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('give-boosters')
        .setDescription('Donne des boosters à un joueur')
        .addUserOption(o => o.setName('joueur').setDescription('Joueur cible').setRequired(true))
        .addIntegerOption(o => o.setName('quantite').setDescription('Nombre').setRequired(true).setMinValue(1)),
    )
    .addSubcommand(sub =>
      sub.setName('give-coins')
        .setDescription('Donne des DiggerCoins à un joueur')
        .addUserOption(o => o.setName('joueur').setDescription('Joueur cible').setRequired(true))
        .addIntegerOption(o => o.setName('quantite').setDescription('Nombre de DC').setRequired(true).setMinValue(1)),
    )
    .addSubcommand(sub =>
      sub.setName('add-match')
        .setDescription('Ajoute un match de foot')
        .addStringOption(o => o.setName('equipe1').setDescription('Équipe 1').setRequired(true))
        .addStringOption(o => o.setName('equipe2').setDescription('Équipe 2').setRequired(true))
        .addStringOption(o => o.setName('datetime').setDescription('Date heure (ex: 2024-07-15 20:00)').setRequired(true)),
    )
    .addSubcommand(sub =>
      sub.setName('result')
        .setDescription('Entre le résultat d\'un match et distribue les récompenses')
        .addIntegerOption(o => o.setName('match-id').setDescription('ID du match').setRequired(true))
        .addIntegerOption(o => o.setName('score1').setDescription('Buts équipe 1').setRequired(true).setMinValue(0))
        .addIntegerOption(o => o.setName('score2').setDescription('Buts équipe 2').setRequired(true).setMinValue(0)),
    )
    .addSubcommand(sub =>
      sub.setName('matches')
        .setDescription('Liste les matchs à venir ou en cours'),
    )
    .addSubcommand(sub =>
      sub.setName('simulate-match')
        .setDescription('Simule un ping de match (test notification)')
        .addStringOption(o => o.setName('equipe1').setDescription('Équipe 1').setRequired(true))
        .addStringOption(o => o.setName('equipe2').setDescription('Équipe 2').setRequired(true)),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'give-boosters') {
      const target = interaction.options.getUser('joueur');
      const amount = interaction.options.getInteger('quantite');
      db.getPlayer(target.id, target.username);
      db.addBoosters(target.id, 'R&T', amount);
      return interaction.reply({
        content: `✅ **${amount}** booster(s) R&T donnés à **${target.username}** !`,
        ephemeral: true,
      });
    }

    if (sub === 'give-coins') {
      const target = interaction.options.getUser('joueur');
      const amount = interaction.options.getInteger('quantite');
      db.getPlayer(target.id, target.username);
      db.updateCoins(target.id, amount);
      return interaction.reply({
        content: `✅ **${amount} DC** donnés à **${target.username}** !`,
        ephemeral: true,
      });
    }

    if (sub === 'add-match') {
      const team1    = interaction.options.getString('equipe1');
      const team2    = interaction.options.getString('equipe2');
      const datetime = interaction.options.getString('datetime');
      const res      = db.createMatch(team1, team2, datetime);
      return interaction.reply({
        content: `✅ Match ajouté ! ID: **${res.lastInsertRowid}** — ${team1} vs ${team2} à ${datetime}`,
        ephemeral: true,
      });
    }

    if (sub === 'result') {
      const matchId = interaction.options.getInteger('match-id');
      const score1  = interaction.options.getInteger('score1');
      const score2  = interaction.options.getInteger('score2');

      const m = db.getMatchById(matchId);
      if (!m) {
        return interaction.reply({ content: '❌ Match introuvable.', ephemeral: true });
      }

      db.setMatchResult(matchId, score1, score2);

      const pronostics = db.getPronostics(matchId);
      let exact = 0, correct = 0;

      for (const p of pronostics) {
        const isExact = p.score1 === score1 && p.score2 === score2;
        const goodWinner =
          (p.score1 > p.score2 && score1 > score2) ||
          (p.score1 < p.score2 && score1 < score2) ||
          (p.score1 === p.score2 && score1 === score2);

        if (isExact) {
          db.addBoosters(p.user_id, 'R&T', 3);
          exact++;
        } else if (goodWinner) {
          db.addBoosters(p.user_id, 'R&T', 1);
          correct++;
        }
      }

      return interaction.reply({
        content: [
          `✅ Résultat enregistré : **${m.team1} ${score1}–${score2} ${m.team2}**`,
          `🏆 Score exact : **${exact}** joueur(s) → +3 boosters`,
          `🏅 Bon vainqueur : **${correct}** joueur(s) → +1 booster`,
        ].join('\n'),
        ephemeral: true,
      });
    }

    if (sub === 'matches') {
      const matches = db.getUpcomingMatches();
      if (matches.length === 0) {
        return interaction.reply({ content: '📅 Aucun match à venir.', ephemeral: true });
      }
      const lines = matches.map(
        m => `**ID ${m.id}** : ${m.team1} vs ${m.team2} — \`${m.scheduled_at}\` *(${m.status})*`,
      );
      return interaction.reply({ content: lines.join('\n'), ephemeral: true });
    }

    if (sub === 'simulate-match') {
      const team1 = interaction.options.getString('equipe1');
      const team2 = interaction.options.getString('equipe2');
      await interaction.reply({ content: '📣 Notification envoyée !', ephemeral: true });
      return interaction.channel.send(
        `@everyone ⚽ **MATCH DANS 1 HEURE !**\n🏴 **${team1}** vs **${team2}**\n\nUtilise \`/prono 2-1\` pour soumettre ton pronostic ! Les paris ferment 5 min avant le coup d'envoi.`,
      );
    }
  },
};
