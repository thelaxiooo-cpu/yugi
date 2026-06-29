require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const command = new SlashCommandBuilder()
  .setName('gab')
  .setDescription('Affiche le rang ranked actuel de Gabriel (Mist3rpringles#WIN)');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Enregistrement de /gab...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [command.toJSON()] },
    );
    console.log('✅ Commande /gab enregistrée avec succès !');
  } catch (err) {
    console.error('Erreur:', err);
  }
})();
