require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const cron = require('node-cron');

const DISCORD_TOKEN    = process.env.DISCORD_TOKEN;
const CLIENT_ID        = process.env.CLIENT_ID;
const GUILD_ID         = process.env.GUILD_ID;
const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID;

const GAME_NAME = 'Mist3rpringles';
const TAG_LINE  = 'WIN';
const REGION    = 'euw';

const TIER_EMOJI = {
  IRON: '⚫', BRONZE: '🟤', SILVER: '⚪', GOLD: '🟡',
  PLATINUM: '🟢', EMERALD: '💚', DIAMOND: '💎', MASTER: '🟣',
  GRANDMASTER: '🔴', CHALLENGER: '🔵',
};

const MESSAGES_GAIN = [
  '« Quelle monstre 🔥 »',
  '« FuturMalphiteKing en route 👑 »',
  '« Il les mange tout crus aujourd\'hui 😤 »',
  '« Giga gameplay, le king est chaud 🫡 »',
  '« Gabriel en mode ELO grind, personne peut l\'arrêter 📈 »',
  '« Respectez l\'homme 🏆 »',
];

const MESSAGES_LOSE = [
  '« Trop naze c\'est chaud aahahahha 💀 »',
  '« Lâche le jeu tonton 🗑️ »',
  '« Il tilte grave là c\'est clair 📉 »',
  '« Free LP pour les adversaires 😭 »',
  '« Appelle Malphite à l\'aide sérieusement »',
  '« La lose streak de la honte, wtf Gabriel 🤡 »',
];

const MESSAGES_NEUTRAL = [
  '« 0 net LP... c\'est dur l\'ascension »',
  '« Il tourne en rond aujourd\'hui »',
];

const MESSAGES_NO_GAMES = [
  '« Journée repos, le king se repose avant la montée 😴 »',
  '« Pas de game aujourd\'hui, il prépare le mental 🧘 »',
];

// ── op.gg + DDragon ───────────────────────────────────────────────────────────

let puuid        = null;
let lpAtMidnight = null;
let champMap     = {};

async function apiFetch(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function loadChampionMap() {
  const versions = await apiFetch('https://ddragon.leagueoflegends.com/api/versions.json');
  const json     = await apiFetch(
    `https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/champion.json`
  );
  for (const c of Object.values(json.data)) {
    champMap[parseInt(c.key, 10)] = c.name;
  }
}

async function initPuuid() {
  if (puuid) return;
  const json = await apiFetch(
    `https://lol-api-summoner.op.gg/api/v3/${REGION}/summoners` +
    `?riot_id=${encodeURIComponent(GAME_NAME + '#' + TAG_LINE)}&hl=en_US`
  );
  const s = (json.data ?? json)[0];
  if (!s?.puuid) throw new Error('Summoner introuvable sur op.gg');
  puuid = s.puuid;
}

async function getSummonerData() {
  await initPuuid();
  const json = await apiFetch(
    `https://lol-api-summoner.op.gg/api/v3/${REGION}/summoners` +
    `?riot_id=${encodeURIComponent(GAME_NAME + '#' + TAG_LINE)}&hl=en_US`
  );
  return (json.data ?? json)[0];
}

async function getGames(limit = 3) {
  await initPuuid();
  const json = await apiFetch(
    `https://lol-api-summoner.op.gg/api/v3/${REGION}/summoners/${puuid}/games` +
    `?limit=${limit}&game_type=SOLORANKED&hl=en_US`
  );
  return json.data ?? json ?? [];
}

function findMe(game) {
  return game.participants?.find(p => p.summoner?.puuid === puuid);
}

function champName(id) {
  return champMap[id] ?? `Champion #${id}`;
}

function romanDiv(n) {
  return ['I', 'II', 'III', 'IV'][n - 1] ?? n;
}

function formatRank(summoner) {
  const info = summoner?.solo_tier_info;
  if (!info?.tier) return '🔘 Non classé';
  const emoji  = TIER_EMOJI[info.tier] ?? '🏆';
  const divStr = info.division ? ` ${romanDiv(info.division)}` : '';
  return `${emoji} **${info.tier}${divStr}** — ${info.lp} LP`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Discord ───────────────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  // Enregistrement des commandes
  try {
    const rest = new REST().setToken(DISCORD_TOKEN);
    const gab  = new SlashCommandBuilder()
      .setName('gab')
      .setDescription('Rang actuel + 3 dernières parties ranked de Gabriel')
      .toJSON();

    // Supprime toutes les anciennes commandes globales (celles de l'ancien bot)
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log('🗑️ Anciennes commandes globales supprimées');

    // Enregistre /gab en commande de guilde (apparaît immédiatement)
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [gab] });
    console.log('✅ Commande /gab enregistrée sur le serveur');
  } catch (err) {
    console.error('Erreur enregistrement commande:', err.message);
  }

  // Initialisation des données LoL
  try {
    await Promise.all([initPuuid(), loadChampionMap()]);
    const summoner = await getSummonerData();
    lpAtMidnight = summoner?.solo_tier_info?.lp ?? null;
    console.log(`📊 Initialisé — LP référence : ${lpAtMidnight}`);
  } catch (err) {
    console.error('Erreur initialisation:', err.message);
  }

  // Message de lancement dans le channel
  try {
    const channel = await client.channels.fetch(ALERT_CHANNEL_ID).catch(() => null);
    if (channel) await channel.send('🟢 **le coach est up !**');
  } catch (err) {
    console.error('Erreur message lancement:', err.message);
  }

  startDailyRecap();
});

// ── Commande /gab ─────────────────────────────────────────────────────────────

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'gab') return;

  await interaction.deferReply();
  try {
    const [summoner, games] = await Promise.all([getSummonerData(), getGames(3)]);

    // Dernières parties
    const gameLines = [];
    for (const game of games.slice(0, 3)) {
      const me = findMe(game);
      if (!me) continue;
      const isWin = me.stats?.result === 'WIN';
      const k     = me.stats?.kill   ?? 0;
      const d     = me.stats?.death  ?? 0;
      const a     = me.stats?.assist ?? 0;
      const kda   = d > 0 ? ((k + a) / d).toFixed(1) : '∞';
      gameLines.push(
        `${isWin ? '✅' : '❌'} **${champName(me.champion_id)}** — ${k}/${d}/${a} *(${kda} KDA)*`
      );
    }

    const gamesBlock = gameLines.length
      ? gameLines.join('\n')
      : '*Aucune partie ranked récente.*';

    await interaction.editReply(
      `🎮 **${GAME_NAME}#${TAG_LINE}**\n` +
      `${formatRank(summoner)}\n\n` +
      `**Dernières parties ranked :**\n${gamesBlock}`
    );
  } catch (err) {
    console.error('Erreur /gab:', err.message);
    await interaction.editReply('❌ Impossible de récupérer les données (op.gg indisponible ?)');
  }
});

// ── Récap quotidien à minuit ──────────────────────────────────────────────────

function startDailyRecap() {
  cron.schedule('0 0 * * *', async () => {
    try {
      const channel = await client.channels.fetch(ALERT_CHANNEL_ID).catch(() => null);
      if (!channel) { console.error('Channel introuvable:', ALERT_CHANNEL_ID); return; }

      // Plage : les 24h qui viennent de s'écouler
      const dayEnd   = new Date();
      const dayStart = new Date(dayEnd.getTime() - 24 * 60 * 60 * 1000);

      const allGames   = await getGames(50);
      const todayGames = allGames.filter(g => {
        const t = new Date(g.created_at ?? 0);
        return t >= dayStart && t < dayEnd;
      });

      const dateLabel = dayStart.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long',
      });

      const summoner  = await getSummonerData();
      const currentLP = summoner?.solo_tier_info?.lp ?? null;

      // Aucune game
      if (!todayGames.length) {
        await channel.send(
          `📊 **Récap ranked de Gabriel — ${dateLabel}**\n` +
          `${formatRank(summoner)}\n\n` +
          `Aucune partie ranked aujourd'hui.\n\n` +
          `${pick(MESSAGES_NO_GAMES)}`
        );
        lpAtMidnight = currentLP;
        return;
      }

      // Stats du jour
      let wins = 0, losses = 0;
      let totalK = 0, totalD = 0, totalA = 0;

      for (const game of todayGames) {
        const me = findMe(game);
        if (!me) continue;
        if (me.stats?.result === 'WIN') wins++; else losses++;
        totalK += me.stats?.kill   ?? 0;
        totalD += me.stats?.death  ?? 0;
        totalA += me.stats?.assist ?? 0;
      }

      const n       = wins + losses || 1;
      const avgK    = (totalK / n).toFixed(1);
      const avgD    = (totalD / n).toFixed(1);
      const avgA    = (totalA / n).toFixed(1);
      const kda     = totalD > 0 ? ((totalK + totalA) / totalD).toFixed(2) : '∞';
      const winRate = Math.round((wins / n) * 100);

      // LP change
      let lpLine = '';
      let lpDiff = null;
      if (lpAtMidnight !== null && currentLP !== null) {
        lpDiff         = currentLP - lpAtMidnight;
        const sign     = lpDiff >= 0 ? '+' : '';
        const lpEmoji  = lpDiff >= 0 ? '📈' : '📉';
        lpLine = `\n${lpEmoji} LP : **${sign}${lpDiff} LP** (${lpAtMidnight} → ${currentLP} LP)`;
      }

      // Message drôle selon LP
      let funnyMsg;
      if (lpDiff === null)  funnyMsg = '';
      else if (lpDiff > 0)  funnyMsg = `\n${pick(MESSAGES_GAIN)}`;
      else if (lpDiff < 0)  funnyMsg = `\n${pick(MESSAGES_LOSE)}`;
      else                  funnyMsg = `\n${pick(MESSAGES_NEUTRAL)}`;

      await channel.send(
        `📊 **Récap ranked de Gabriel — ${dateLabel}**\n` +
        `${formatRank(summoner)}\n\n` +
        `🎮 **${wins + losses}** parties — ${wins}V / ${losses}D — ${winRate}% WR` +
        lpLine + '\n' +
        `⚔️ KDA moyen : **${avgK} / ${avgD} / ${avgA}** (ratio ${kda})` +
        funnyMsg
      );

      lpAtMidnight = currentLP;
    } catch (err) {
      console.error('Erreur récap quotidien:', err.message);
    }
  }, { timezone: 'Europe/Paris' });
}

client.login(DISCORD_TOKEN);
