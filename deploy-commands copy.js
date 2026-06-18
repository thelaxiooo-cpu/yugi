require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');

const commands = [];
for (const file of fs.readdirSync('./src/commands').filter(f => f.endsWith('.js'))) {
  const cmd = require(`./src/commands/${file}`);
  commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`📤 Déploiement de ${commands.length} commande(s)...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('✅ Commandes déployées sur le serveur !');
  } catch (err) {
    console.error(err);
  }
})();
