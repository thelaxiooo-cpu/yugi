require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');

const DISCORD_TOKEN    = process.env.DISCORD_TOKEN;
const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID;

const GAME_NAME  = 'Mist3rpringles';
const TAG_LINE   = 'WIN';
const REGION     = 'euw';
const CATCHPHRASE = 'Le coach de la KC est tombé sur une vrai pépite quand on y pense';

const ROASTS = [
  '💀 Franchement c\'est douloureux à regarder...',
  '💀 Quelqu\'un lui enlève la souris svp',
  '💀 Il aurait mieux fait de rester au lit aujourd\'hui',
  '💀 C\'est difficile à regarder honnêtement',
  '💀 À ce niveau là c\'est du don de LP aux adversaires',
  '💀 Il régale tout le monde sauf son équipe',
];

const TIER_EMOJI = {
  IRON: '⚫', BRONZE: '🟤', SILVER: '⚪', GOLD: '🟡',
  PLATINUM: '🟢', EMERALD: '💚', DIAMOND: '💎', MASTER: '🟣',
  GRANDMASTER: '🔴', CHALLENGER: '🔵',
};

// ── op.gg + DDragon ───────────────────────────────────────────────────────────

let puuid    = null;
let lpAt22h  = null;
let champMap = {};

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
  const summoner = (json.data ?? json)[0];
  console.log('[DEBUG] solo_tier_info:', JSON.stringify(summoner?.solo_tier_info ?? summoner?.league_stats ?? 'CHAMP NON TROUVÉ'));
  return summoner;
}

async function getRankedGames(limit = 20) {
  await initPuuid();
  const json = await apiFetch(
    `https://lol-api-summoner.op.gg/api/v3/${REGION}/summoners/${puuid}/games` +
    `?limit=${limit}&game_type=SOLORANKED&hl=en_US`
  );
  return json.data ?? json ?? [];
}

function findMe(game) {
  return (
    game.participants?.find(p => p.summoner?.puuid === puuid) ??
    game.participants?.[0] ??
    null
  );
}

function champName(id)  { return champMap[id] ?? `Champion #${id}`; }
function romanDiv(n)    { return ['I', 'II', 'III', 'IV'][n - 1] ?? n; }

function formatRank(summoner) {
  const info = summoner?.solo_tier_info;
  if (!info?.tier) return '🔘 Non classé';
  const tier   = info.tier.toUpperCase();
  const emoji  = TIER_EMOJI[tier] ?? '🏆';
  const divStr = info.division ? ` ${romanDiv(info.division)}` : '';
  return `${emoji} ${tier}${divStr} — ${info.lp} LP`;
}

// ── Discord ───────────────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  console.log(`🆔 Application ID : ${client.application.id}`);

  const channel = await client.channels.fetch(ALERT_CHANNEL_ID).catch(() => null);
  if (!channel) { console.error(`❌ Channel introuvable : ${ALERT_CHANNEL_ID}`); return; }

  const guildId = channel.guildId;
  console.log(`🏠 Serveur : ${guildId}`);

  try {
    const rest     = new REST().setToken(DISCORD_TOKEN);
    const commands = [
      new SlashCommandBuilder()
        .setName('gab')
        .setDescription('Rang actuel + 3 dernières ranked solo/duo de Gabriel')
        .toJSON(),
    ];
    await rest.put(Routes.applicationCommands(client.application.id), { body: [] });
    await rest.put(Routes.applicationGuildCommands(client.application.id, guildId), { body: commands });
    console.log('✅ Commandes enregistrées');
  } catch (err) {
    console.error('Erreur enregistrement commandes:', err.message);
  }

  try {
    await Promise.all([initPuuid(), loadChampionMap()]);
    console.log('📊 Initialisation LoL OK — lancement du récap de démarrage...');
    await runDailyRecap();
  } catch (err) {
    console.error('Erreur initialisation LoL:', err.message);
  }

  startDailyRecap();
});

// ── Slash commands ────────────────────────────────────────────────────────────

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  console.log(`⚡ /${interaction.commandName} par ${interaction.user.tag}`);

  // /gab
  if (interaction.commandName === 'gab') {
    await interaction.deferReply();
    try {
      const [summoner, allGames] = await Promise.all([getSummonerData(), getRankedGames(20)]);

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

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`🎮 ${GAME_NAME}#${TAG_LINE}`)
        .addFields(
          { name: 'Rang actuel', value: formatRank(summoner) },
          {
            name: '3 dernières ranked solo/duo',
            value: gameLines.length ? gameLines.join('\n') : '*Aucune partie ranked récente.*',
          },
        )
        .setFooter({ text: CATCHPHRASE });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur /gab:', err.message);
      await interaction.editReply('❌ Impossible de récupérer les données (op.gg indisponible ?)');
    }
  }

});

// ── Récap quotidien ───────────────────────────────────────────────────────────

async function runDailyRecap() {
  try {
    const channel = await client.channels.fetch(ALERT_CHANNEL_ID).catch(() => null);
    if (!channel) { console.error('Channel introuvable:', ALERT_CHANNEL_ID); return; }

    const dayEnd   = new Date();
    const dayStart = new Date(dayEnd.getTime() - 24 * 60 * 60 * 1000);

    const allGames   = await getRankedGames(20);
    const todayGames = allGames.filter(g => {
      const t = new Date(g.created_at ?? 0);
      return t >= dayStart && t < dayEnd;
    });

    const dateLabel = dayStart.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });

    const summoner  = await getSummonerData();
    const currentLP = summoner?.solo_tier_info?.lp ?? null;

    const footerText = `La KC réfléchi à remplacer Canna par '${GAME_NAME}'`;

    // Aucune game aujourd'hui
    if (!todayGames.length) {
      const embed = new EmbedBuilder()
        .setColor(0x99AAB5)
        .setTitle(`📊 Récap ranked de Gabriel — ${dateLabel}`)
        .setDescription(
          `**${GAME_NAME}** — ${formatRank(summoner)}` +
          `\n\n## 😴 Aucune partie ranked aujourd'hui.`
        )
        .setFooter({ text: footerText });

      await channel.send({ embeds: [embed] });
      lpAt22h = currentLP;
      return;
    }

    // Stats
    let wins = 0, losses = 0;
    let totalK = 0, totalD = 0, totalA = 0;
    const champLines = [];

    for (const game of todayGames) {
      const me = findMe(game);
      if (!me) continue;
      const isWin = me.stats?.result === 'WIN';
      if (isWin) wins++; else losses++;
      totalK += me.stats?.kill   ?? 0;
      totalD += me.stats?.death  ?? 0;
      totalA += me.stats?.assist ?? 0;
      champLines.push(`${isWin ? '✅' : '❌'} ${champName(me.champion_id)}`);
    }

    const n       = wins + losses || 1;
    const avgK    = (totalK / n).toFixed(1);
    const avgD    = (totalD / n).toFixed(1);
    const avgA    = (totalA / n).toFixed(1);
    const kda     = totalD > 0 ? ((totalK + totalA) / totalD).toFixed(2) : '∞';
    const winRate = Math.round((wins / n) * 100);

    // LP — affiché seulement si le changement est non nul
    let lpField = '';
    if (lpAt22h !== null && currentLP !== null) {
      const lpDiff = currentLP - lpAt22h;
      if (lpDiff !== 0) {
        const sign    = lpDiff > 0 ? '+' : '';
        const lpEmoji = lpDiff > 0 ? '📈' : '📉';
        lpField = `\n${lpEmoji} LP : **${sign}${lpDiff} LP** (${lpAt22h} → ${currentLP} LP)`;
      }
    }

    const color = wins > losses ? 0x57F287 : wins < losses ? 0xED4245 : 0x99AAB5;

    const roast = losses > wins
      ? `\n\n${ROASTS[Math.floor(Math.random() * ROASTS.length)]}`
      : '';

    const desc =
      `**${GAME_NAME}** — ${formatRank(summoner)}` +
      `\n\n## 🎮 ${n} partie${n > 1 ? 's' : ''} — **${wins}**V / **${losses}**D — **${winRate}%** WR` +
      lpField +
      roast;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`📊 Récap ranked de Gabriel — ${dateLabel}`)
      .setDescription(desc)
      .addFields(
        { name: '🃏 Champions joués', value: champLines.join('\n'), inline: true },
        { name: '⚔️ KDA moyen', value: `**${avgK} / ${avgD} / ${avgA}**\nRatio : **${kda}**`, inline: true },
      )
      .setFooter({ text: footerText });

    await channel.send({ embeds: [embed] });
    lpAt22h = currentLP;
  } catch (err) {
    console.error('Erreur récap quotidien:', err.message);
  }
}

function startDailyRecap() {
  cron.schedule('0 22 * * *', runDailyRecap, { timezone: 'Europe/Paris' });
}

client.login(DISCORD_TOKEN);
