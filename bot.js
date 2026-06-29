require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const cron = require('node-cron');

const DISCORD_TOKEN    = process.env.DISCORD_TOKEN;
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

// Récupère les N dernières ranked solo/duo — en demande plus pour compenser
// les éventuelles games sans données de participant
async function getRankedGames(limit = 20) {
  await initPuuid();
  const json = await apiFetch(
    `https://lol-api-summoner.op.gg/api/v3/${REGION}/summoners/${puuid}/games` +
    `?limit=${limit}&game_type=SOLORANKED&hl=en_US`
  );
  return json.data ?? json ?? [];
}

// Retrouve Gabriel dans les participants — avec fallback sur le 1er participant
// si le matching PUUID échoue (cas rare selon la version de l'API)
function findMe(game) {
  return (
    game.participants?.find(p => p.summoner?.puuid === puuid) ??
    game.participants?.[0] ??
    null
  );
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
  console.log(`🆔 Application ID : ${client.application.id}`);

  const channel = await client.channels.fetch(ALERT_CHANNEL_ID).catch(() => null);
  if (!channel) {
    console.error(`❌ Channel ALERT_CHANNEL_ID introuvable : ${ALERT_CHANNEL_ID}`);
    return;
  }
  const guildId = channel.guildId;
  console.log(`🏠 Serveur détecté : ${guildId}`);

  try {
    const rest     = new REST().setToken(DISCORD_TOKEN);
    const commands = [
      new SlashCommandBuilder()
        .setName('gab')
        .setDescription('Rang actuel + 3 dernières parties ranked solo/duo de Gabriel')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('test')
        .setDescription('Simule le récap minuit dans 5 secondes')
        .toJSON(),
    ];
    await rest.put(Routes.applicationCommands(client.application.id), { body: [] });
    await rest.put(
      Routes.applicationGuildCommands(client.application.id, guildId),
      { body: commands },
    );
    console.log('✅ Commandes /gab et /test enregistrées');
  } catch (err) {
    console.error('Erreur enregistrement commandes:', err.message);
  }

  try {
    await Promise.all([initPuuid(), loadChampionMap()]);
    const summoner = await getSummonerData();
    lpAtMidnight   = summoner?.solo_tier_info?.lp ?? null;
    console.log(`📊 Initialisé — LP référence : ${lpAtMidnight}`);
  } catch (err) {
    console.error('Erreur initialisation LoL:', err.message);
  }

  startDailyRecap();
});

// ── Slash commands ────────────────────────────────────────────────────────────

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  console.log(`⚡ /${interaction.commandName} par ${interaction.user.tag}`);

  // /gab — rang + 3 dernières ranked solo/duo
  if (interaction.commandName === 'gab') {
    await interaction.deferReply();
    try {
      const [summoner, allGames] = await Promise.all([getSummonerData(), getRankedGames(20)]);

      // Prend les 3 premières games où on trouve bien le participant
      const gameLines = [];
      for (const game of allGames) {
        if (gameLines.length >= 3) break;
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

      await interaction.editReply(
        `🎮 **${GAME_NAME}#${TAG_LINE}**\n` +
        `${formatRank(summoner)}\n\n` +
        `**3 dernières ranked solo/duo :**\n` +
        (gameLines.length ? gameLines.join('\n') : '*Aucune partie ranked récente.*')
      );
    } catch (err) {
      console.error('Erreur /gab:', err.message);
      await interaction.editReply('❌ Impossible de récupérer les données (op.gg indisponible ?)');
    }
  }

  // /test — simule le récap minuit après 5 secondes
  if (interaction.commandName === 'test') {
    await interaction.reply('⏳ Simulation du récap minuit dans 5 secondes...');
    setTimeout(() => runDailyRecap(), 5000);
  }
});

// ── Récap quotidien ───────────────────────────────────────────────────────────

async function runDailyRecap() {
  try {
    const channel = await client.channels.fetch(ALERT_CHANNEL_ID).catch(() => null);
    if (!channel) { console.error('Channel introuvable:', ALERT_CHANNEL_ID); return; }

    const dayEnd   = new Date();
    const dayStart = new Date(dayEnd.getTime() - 24 * 60 * 60 * 1000);

    const allGames   = await getRankedGames(50);
    const todayGames = allGames.filter(g => {
      const t = new Date(g.created_at ?? 0);
      return t >= dayStart && t < dayEnd;
    });

    const dateLabel = dayStart.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });

    const summoner  = await getSummonerData();
    const currentLP = summoner?.solo_tier_info?.lp ?? null;

    if (!todayGames.length) {
      await channel.send(
        `📊 **Récap ranked de Gabriel — ${dateLabel}**\n` +
        `${formatRank(summoner)}\n\n` +
        `Aucune partie ranked aujourd'hui.\n\n` +
        pick(MESSAGES_NO_GAMES)
      );
      lpAtMidnight = currentLP;
      return;
    }

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

    let lpLine = '';
    let lpDiff = null;
    if (lpAtMidnight !== null && currentLP !== null) {
      lpDiff        = currentLP - lpAtMidnight;
      const sign    = lpDiff >= 0 ? '+' : '';
      const lpEmoji = lpDiff >= 0 ? '📈' : '📉';
      lpLine = `\n${lpEmoji} LP : **${sign}${lpDiff} LP** (${lpAtMidnight} → ${currentLP} LP)`;
    }

    const funnyMsg = lpDiff === null ? ''
      : lpDiff > 0               ? `\n${pick(MESSAGES_GAIN)}`
      : lpDiff < 0               ? `\n${pick(MESSAGES_LOSE)}`
      :                            `\n${pick(MESSAGES_NEUTRAL)}`;

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
}

function startDailyRecap() {
  cron.schedule('0 0 * * *', runDailyRecap, { timezone: 'Europe/Paris' });
}

client.login(DISCORD_TOKEN);
