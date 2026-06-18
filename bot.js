require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const cron = require('node-cron');
const fs   = require('fs');
const db   = require('./src/database/db');
const { ALLOWED_CHANNEL_ID, BOOSTER_PRICES } = require('./config');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ── Chargement des commandes ──────────────────────────────────────────────────

client.commands = new Collection();
for (const file of fs.readdirSync('./src/commands').filter(f => f.endsWith('.js'))) {
  const cmd = require(`./src/commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

// ── Prêt ──────────────────────────────────────────────────────────────────────

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  startMatchCron();
});

// ── Interactions ──────────────────────────────────────────────────────────────

client.on('interactionCreate', async interaction => {
  if (!interaction.isRepliable()) return;

  // Restriction au channel
  if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
    return interaction.reply({
      content: '❌ Ce bot ne fonctionne que dans le channel dédié !',
      ephemeral: true,
    });
  }

  // Slash commands
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(`Erreur commande /${interaction.commandName}:`, err);
      const payload = { content: '❌ Une erreur est survenue.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
    return;
  }

  // Boutons du shop
  if (interaction.isButton()) {
    const { customId } = interaction;
    if (!customId.startsWith('buy_booster_')) return;

    const amount = parseInt(customId.split('_')[2], 10);
    const price  = BOOSTER_PRICES[amount];
    if (!price) return;

    const { id: userId, username } = interaction.user;
    const player = db.getPlayer(userId, username);

    if (player.coins < price) {
      return interaction.reply({
        content: `❌ Pas assez de DC ! Il te faut **${price} DC** (tu as ${player.coins} DC).`,
        ephemeral: true,
      });
    }

    db.updateCoins(userId, -price);
    db.addBoosters(userId, 'R&T', amount);

    return interaction.reply({
      content: `✅ Tu as acheté **${amount} booster(s) R&T** pour **${price} DC** !\nUtilise \`/open\` pour les ouvrir.`,
      ephemeral: true,
    });
  }
});

// ── Cron : notifications de match ─────────────────────────────────────────────

function startMatchCron() {
  cron.schedule('* * * * *', async () => {
    try {
      const channel = await client.channels.fetch(ALLOWED_CHANNEL_ID).catch(() => null);
      if (!channel) return;

      const now     = new Date();
      const matches = db.getUpcomingMatches();

      for (const m of matches) {
        const matchTime = new Date(m.scheduled_at);
        const diffMin   = (matchTime - now) / 60000;

        if (diffMin <= 60 && diffMin > 59 && !m.notified_1h) {
          db.markNotified1h(m.id);
          await channel.send(
            `@everyone ⚽ **MATCH DANS 1 HEURE !**\n🏴 **${m.team1}** vs **${m.team2}**\n🕐 ${m.scheduled_at}\n\nUtilise \`/prono 2-1\` pour soumettre ton pronostic ! Les paris ferment 5 min avant le coup d'envoi.`,
          );
        }

        if (diffMin <= 5 && diffMin > 4 && !m.notified_5min) {
          db.markNotified5min(m.id);
          await channel.send(
            `🔒 **Les pronostics pour ${m.team1} vs ${m.team2} sont maintenant fermés !** Bonne chance à tous ! 🍀`,
          );
        }
      }
    } catch (err) {
      console.error('Erreur cron match:', err);
    }
  });
}

// ── Démarrage ─────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN);
