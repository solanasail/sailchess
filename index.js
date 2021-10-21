import { Client, MessageEmbed } from 'discord.js'

import { DiscordChess } from "./src/chess/index.js"

import {  
  CLUSTERS, 
  COMMAND_PREFIX, 
  DISCORD_TOKEN, 
  SOL_FEE_LIMIT, 
  SAIL_Emoji, 
  gSAIL_Emoji, 
  SOL_Emoji,
  TRANSACTION_DESC
} from './config/index.js'
import Utils from './src/utils.js'

// Create a new discord client instance
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"], partials: ["CHANNEL"] });
let guild = undefined;

let dangerColor = '#d93f71';
let infoColor = '#0099ff';

const ChessGame = new DiscordChess({
  prefix: COMMAND_PREFIX,
  dangerColor: dangerColor,
  infoColor: infoColor,
});

// When the client is ready, run this code
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
  
client.on('disconnected', function() {
  console.log('Disconnected!');
  process.exit(1); //exit node.js with an error
});

client.on('messageCreate', async (message) => {
  // Ignore the message if the prefix does not fit and if the client authored it.
  if (!message.content.startsWith(COMMAND_PREFIX) || message.author.bot) return;

  // check the guild
  guild = await Utils.checkGuild(client, guild, message);

  let tmpMsg = (message.content + ' ').split(' -m ');

  let args = tmpMsg[0].slice(COMMAND_PREFIX.length).trim().split(/ +/);
  let command = args[0];
  let desc = TRANSACTION_DESC;
  args = args.slice(1);

  if (tmpMsg[1]) {
    desc = tmpMsg[1];
  }
  if (command == "help") {
    if (message.channel.type == "DM") {
      return;
    }

    await message.author.send({ embeds: [new MessageEmbed()
      .setColor(infoColor)
      .setTitle('Help')
      .setDescription(
        `${COMMAND_PREFIX}register-wallet\n` + 
        (await Utils.checkRoleInPublic(message) ? `${COMMAND_PREFIX}import-wallet <PK>\n` : ``)  +
        `${COMMAND_PREFIX}balance\n${COMMAND_PREFIX}tipsol <user> <amount> -m <description>\n${COMMAND_PREFIX}tipsail <user> <amount> -m <description>\n${COMMAND_PREFIX}tipgsail <user> <amount> -m <description>\n\n?challenge_chess <user>\n?accept <user>`)] }).catch(error => {
        console.log(`Cannot send messages to this user`);
      });
    return;
  } 
  
  if (command == "challenge_chess") {
    if (message.channel.type == "DM") {
      return;
    }

    const challenger = message.member; // Define the challenger
    const opponent = message.mentions.members.first(); // Get and define the opponent
    await message.channel.send({
      embeds: [ 
        new MessageEmbed()
        .setColor(infoColor)
        .setDescription(`Hello ${opponent}\n\n${challenger} just challenged you to a game of SAIL Battle Ship\n\n${challenger} vs ${opponent}\n\nIf you want to accept, please type '${COMMAND_PREFIX}accept <user>'`)
      ]
    }).catch(error => {
      console.log(`Cannot send messages`);
    });

    return;
  } else if (command == "accept") {
    if (message.channel.type == "DM") {
      return;
    }
    
    const challenger = message.mentions.members.first(); // Define the challenger
    const opponent = message.member; // Get and define the opponent 

    await ChessGame.createGame(message); 
    return;
  }
});

try {
  // Login to Discord with your client's token
  client.login(DISCORD_TOKEN); 
} catch (e) {
  console.error('Client has failed to connect to discord.');
  process.exit(1);
}