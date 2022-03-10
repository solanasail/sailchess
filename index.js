import solanaConnect from './src/solana/index.js'
import Wallet from './src/wallet/index.js'
import PriceService from './src/price/PriceService.js'

import { Client, MessageEmbed } from 'discord.js'
import { DiscordChess } from "./src/chess/index.js"
import Room from './src/chess/room.js'

import {
    ACTIVE_CLUSTER,
    COMMAND_PREFIX,
    DISCORD_TOKEN,
    SOL_FEE_LIMIT,
    SAIL_Emoji,
    gSAIL_Emoji,
    SOL_Emoji,
    TRANSACTION_DESC,
    CHESS_RESULT_CHANNEL_ID,
    GUILD_ID,
} from './config/index.js'
import Utils from './src/utils.js'

import DB from './src/publicKeyStorage/index.js'

// Create a new discord client instance
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"], partials: ["CHANNEL"] });
let guild = undefined;

const dangerColor = '#d93f71';
const infoColor = '#0099ff';

const BOT_COMMANDS = ['helpchess', 'balance', 'import-wallet', 'register-wallet', 'tipsol', 'tipsail', 'tipgsail', 'challenge_chess', 'accept'];

try {
  // connect to database.
  await DB.connectDB(ACTIVE_CLUSTER);
  console.log("Connected to MongoDB");
} catch (error) {
  console.log("Cannot be able to connect to DB");
  process.exit(1); // exit node.js with an error
}

// When the client is ready, run this code
client.once('ready', async () => {
  guild = await client.guilds.fetch(GUILD_ID);
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('disconnected', function () {
  console.log('Disconnected!');
  process.exit(1); //exit node.js with an error
});

client.on('messageCreate', async (message) => {

  // Ignore the message if the prefix does not fit and if the client authored it.
  if (!message.content.startsWith(COMMAND_PREFIX) || message.author.bot) return;

  let tmpMsg = (message.content + ' ').split(' -m ');

  let args = tmpMsg[0].slice(COMMAND_PREFIX.length).trim().split(/ +/);

  let command = args[0];
  args = args.slice(1);

  let desc = tmpMsg[1] ?? TRANSACTION_DESC;
  
  if (BOT_COMMANDS.findIndex((elem) => elem === command) == -1) {
    return;
  }

  if (command == "register-wallet") { // Register wallet
    if (message.channel.type != "DM") {
      await message.channel.send({
        embeds: [new MessageEmbed()
          .setColor(dangerColor)
          .setDescription(`This must be done in a private DM channel`)]
      }).catch(error => {
        console.log(`Cannot send messages`);
      });
      return;
    }

    // create new keypair.
    let account = await solanaConnect.createWallet(message.author.id);

    // get the balance of sol
    const sol = await solanaConnect.getSolBalance(account.publicKey);

    // get the balance of gSAIL
    const gSAIL = await solanaConnect.getGSAILBalance(account.privateKey);

    // get the balance of SAIL
    const SAIL = await solanaConnect.getSAILBalance(account.privateKey);

    // convert the balance to dolar
    const dollarValue = parseFloat(await PriceService.getDollarValueForSol(sol.amount)) + parseFloat(await PriceService.getDollarValueForGSail(gSAIL.amount)) + parseFloat(await PriceService.getDollarValueForSail(SAIL.amount));

    await message.author.send({
      embeds: [new MessageEmbed()
        .setTitle(`Active Cluster: ${ACTIVE_CLUSTER}`)
        .setColor(infoColor)
        .setDescription(`Address: ${account.publicKey}\n\nPrivate Key:\n${await Utils.Uint8Array2String(account.privateKey)}\n\n[${account.privateKey}]\n\nSOL: ${sol.amount}\ngSAIL: ${gSAIL.amount}\nSAIL: ${SAIL.amount}\n\nTotal: ${dollarValue}$`)]
    }).catch(error => {
      console.log(`Cannot send messages to this user`);
    });
    return;
  } else if (command == "import-wallet") { // Import wallet
    if (message.channel.type != "DM") {
      await message.channel.send({
        embeds: [new MessageEmbed()
          .setColor(dangerColor)
          .setDescription(`This must be done in a private DM channel`)]
      }).catch(error => {
        console.log(`Cannot send messages`);
      });
      return;
    }

    // check the role in private channel
    if (!await Utils.checkRoleInPrivate(guild, message)) {
      await message.author.send({
        embeds: [new MessageEmbed()
          .setColor(dangerColor)
          .setDescription(`You don't have any permission`)]
      }).catch(error => {
        console.log(`Cannot send messages to this user`);
      });
      return;
    }

    if (!args[0]) {
      await message.author.send({
        embeds: [new MessageEmbed()
          .setColor(dangerColor)
          .setDescription(`Please input the private key`)]
      }).catch(error => {
        console.log(`Cannot send messages to this user`);
      });
      return;
    }

    // create new keypair.
    let account = await solanaConnect.importWallet(message.author.id, await Utils.string2Uint8Array(args[0]));
    if (!account.status) {
      await message.author.send({
        embeds: [new MessageEmbed()
          .setColor(dangerColor)
          .setDescription(`Invalid private key`)]
      }).catch(error => {
        console.log(`Cannot send messages to this user`);
      });
      return;
    }

    // get the balance of sol
    const sol = await solanaConnect.getSolBalance(account.publicKey);

    // get the balance of gSAIL
    const gSAIL = await solanaConnect.getGSAILBalance(account.privateKey);

    // get the balance of SAIL
    const SAIL = await solanaConnect.getSAILBalance(account.privateKey);

    // convert the balance to dolar
    const dollarValue = parseFloat(await PriceService.getDollarValueForSol(sol.amount)) + parseFloat(await PriceService.getDollarValueForGSail(gSAIL.amount)) + parseFloat(await PriceService.getDollarValueForSail(SAIL.amount));

    await message.author.send({
      embeds: [new MessageEmbed()
        .setTitle(`Active Cluster: ${ACTIVE_CLUSTER}`)
        .setColor(infoColor)
        .setDescription(`Address: ${account.publicKey}\n\nPrivate Key:\n${await Utils.Uint8Array2String(account.privateKey)}\n\n[${account.privateKey}]\n\nSOL: ${sol.amount}\ngSAIL: ${gSAIL.amount}\nSAIL: ${SAIL.amount}\n\nTotal: ${dollarValue}$`)]
    }).catch(error => {
      console.log(`Cannot send messages to this user`);
    });
    return;
  } else if (command == "helpchess") { // Display help
    if (message.channel.type == "DM") {
      return;
    }

    await message.author.send({
        embeds: [new MessageEmbed()
            .setColor(infoColor)
            .setTitle('Help')
            .setDescription(
                `${COMMAND_PREFIX}register-wallet\n` +
                (await Utils.checkRoleInPublic(message) ? `${COMMAND_PREFIX}import-wallet <PK>\n` : ``) +
                `${COMMAND_PREFIX}balance\n${COMMAND_PREFIX}tipsol <user> <amount> -m <description>\n${COMMAND_PREFIX}tipsail <user> <amount> -m <description>\n${COMMAND_PREFIX}tipgsail <user> <amount> -m <description>\n\n${COMMAND_PREFIX}challenge_chess <user>\n${COMMAND_PREFIX}accept <user>\n${COMMAND_PREFIX}move g1f3\n\nTurn will be changed automatically in 90 seconds\nIf you don't move your piece to protect your King in 180 seconds even though your king is danger, you will be loser\n\nTotal at least 61 SAIL\n\nQueen 5 SAIL\nKnight 4 SAIL * 2\nRook 3 SAIL * 2\nBishop 2 SAIL * 2\nPawn 1 SAIL * 8\n\nYou win : King 30 SAIL`)]
    }).catch(error => {
        console.log(`Cannot send messages to this user`);
    });
    return;
  }

    if (!(await Wallet.getPrivateKey(message.author.id))) { // if you doesn't logged in
        try {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setTitle(`${message.author.tag}`)
                    .setColor(dangerColor)
                    .setDescription(`You must register or import your wallet before making transfers\nThis must be done in a private DM channel`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
        } catch (error) {
            console.log(`${message.author.username}'s behavior was detected.`);
        }
        return;
    }

    let publicKey = await Wallet.getPublicKey(message.author.id);

    if (command == "balance") { // See your current available and pending balance.
        // get the balance of sol
        const sol = await solanaConnect.getSolBalance(publicKey);

        // get the balance of gSAIL
        const gSAIL = await solanaConnect.getGSAILBalance(await Wallet.getPrivateKey(message.author.id));

        // get the balance of SAIL
        const SAIL = await solanaConnect.getSAILBalance(await Wallet.getPrivateKey(message.author.id));

        // convert the balance to dolar
        const dollarValue = parseFloat(await PriceService.getDollarValueForSol(sol.amount)) + parseFloat(await PriceService.getDollarValueForGSail(gSAIL.amount)) + parseFloat(await PriceService.getDollarValueForSail(SAIL.amount));

        await message.author.send({
            embeds: [new MessageEmbed()
                .setAuthor(message.author.tag)
                .setColor(infoColor)
                .setDescription(`Active Cluster: ${ACTIVE_CLUSTER}\nAddress: ${publicKey}\n\nSOL: ${sol.amount}\ngSAIL: ${gSAIL.amount}\nSAIL: ${SAIL.amount}\n\nTotal: ${dollarValue}$`)]
        }).catch(error => {
            console.log(`Cannot send messages to this user`);
        });
        return;
    } else if (command == "tipsol") { // $tip <user_mention> <amount>: Tip <amount> TLO to <user_mention>
        if (message.channel.type == "DM") {
            return;
        }

        let validation = await Utils.validateForTipping(args, desc);
        if (!validation.status) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(validation.msg)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        let recipientIds = validation.ids;
        let amount = validation.amount.toFixed(6);

        // get the balance of sol
        const sol = await solanaConnect.getSolBalance(publicKey);
        if (sol.amount - amount * recipientIds.length < SOL_FEE_LIMIT * recipientIds.length) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription('Not enough SOL')]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        if (amount < 0.000001 || 5 < amount) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription('MIN: 0.000001\nMAX: 5')]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        for (let i = 0; i < recipientIds.length; i++) {
            const elem = recipientIds[i];

            // if the recipient doesn't have the wallet
            if (!await Wallet.getPublicKey(elem)) {
                await message.channel.send({
                    embeds: [new MessageEmbed()
                        .setColor(dangerColor)
                        .setDescription(`<@!${elem}> doesn't have the wallet`)]
                }).catch(error => {
                    console.log(`Cannot send messages`);
                });
                continue;
            }

            // get the balance of gSAIL
            const gSAIL = await solanaConnect.getGSAILBalance(await Wallet.getPrivateKey(message.author.id));
            // get the balance of SAIL
            const SAIL = await solanaConnect.getSAILBalance(await Wallet.getPrivateKey(message.author.id));

            if (gSAIL.amount < 1 || SAIL.amount < 1) {
                await message.channel.send({
                    embeds: [new MessageEmbed()
                        .setColor(dangerColor)
                        .setDescription(`You should have at least 1 gSAIL and 1 SAIL`)]
                }).catch(error => {
                    console.log(`Cannot send messages`);
                });
                return;
            }

      const {success, error, signature,} = await solanaConnect.transferSOL(await Wallet.getPrivateKey(message.author.id), await Wallet.getPublicKey(elem), amount, desc);

      let msgToSender, msgToRecipient
      if( success ) {
        msgToSender    = `You sent ${amount} SOL to <@!${elem}>\nTransaction: ${ solanaConnect.txLink(signature) }` + ( desc ? `\n\nDescription:\n${desc}` : '')
        msgToRecipient = `You received ${amount} SOL from <@!${message.author.id}>\nTransaction: ${ solanaConnect.txLink(signature) }` + ( desc ? `\n\nDescription:\n${desc}` : '')
      } else {
        msgToSender    = `Could not send SOL to <@!${elem}>\n\nError:\n${error}`
        msgToRecipient = `Failed to receive SOL from <@!${message.author.id}>\n\nError:\n${error}`
      }
      // DM to sender
      await message.author.send({
        embeds: [new MessageEmbed()
          .setColor(infoColor)
          .setTitle('Tip SOL')
          .setDescription(msgToSender)]
      }).catch(error => {
        console.log(`Cannot send messages to this user`);
      });

            try {
                // DM to recipient
                let fetchedUser = await client.users.fetch(elem, false);
                await fetchedUser.send({
                    embeds: [new MessageEmbed()
                        .setColor(infoColor)
                        .setTitle('Tip SOL')
                        .setDescription(msgToRecipient)]
                });
            } catch (error) {
                console.log(`Cannot send messages to this user`);
            }
        }

    try {
      let tmpCache = await message.guild.emojis.cache;
      const sol_emoji = tmpCache.find(emoji => emoji.name == SOL_Emoji);
      await message.react(sol_emoji);
    } catch (error) {
      console.log(`Sol emoji error: ${error}`);
    }
    return;
  } else if (command == "tipsail") {
    if (message.channel.type == "DM") {
      return;
    }

        let validation = await Utils.validateForTipping(args, desc);
        if (!validation.status) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(validation.msg)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        let recipientIds = validation.ids;
        let amount = validation.amount.toFixed(6);

        // get the balance of sol
        const sol = await solanaConnect.getSolBalance(publicKey);
        if (sol.amount < SOL_FEE_LIMIT) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`Not enough SOL fee to tip the SAIL`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        const SAIL = await solanaConnect.getSAILBalance(await Wallet.getPrivateKey(message.author.id));
        if (amount * recipientIds.length > SAIL.amount) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`Not enough SAIL`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        if (amount < 0.000001 || 1000 < amount) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription('MIN: 0.000001\nMAX: 1000')]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        for (let i = 0; i < recipientIds.length; i++) {
            const elem = recipientIds[i];

            // if the recipient doesn't have the wallet
            if (!await Wallet.getPublicKey(elem)) {
                await message.channel.send({
                    embeds: [new MessageEmbed()
                        .setColor(dangerColor)
                        .setDescription(`<@!${elem}> doesn't have the wallet`)]
                }).catch(error => {
                    console.log(`Cannot send messages`);
                });
                continue;
            }

            // get the balance of gSAIL
            const gSAIL = await solanaConnect.getGSAILBalance(await Wallet.getPrivateKey(message.author.id));
            // get the balance of SAIL
            const SAIL = await solanaConnect.getSAILBalance(await Wallet.getPrivateKey(message.author.id));

            if (gSAIL.amount < 1 || SAIL.amount < 1) {
                await message.channel.send({
                    embeds: [new MessageEmbed()
                        .setColor(dangerColor)
                        .setDescription(`You should have at least 1 gSAIL and 1 SAIL`)]
                }).catch(error => {
                    console.log(`Cannot send messages`);
                });
                return;
            }

      const {success, error, signature,} = await solanaConnect.transferSAIL(await Wallet.getPrivateKey(message.author.id), await Wallet.getPublicKey(elem), amount, desc);

      let msgToSender, msgToRecipient
      if( success ) {
        msgToSender    = `You sent ${amount} SAIL to <@!${elem}>\nTransaction: ${ solanaConnect.txLink(signature) }` + ( desc ? `\n\nDescription:\n${desc}` : '')
        msgToRecipient = `You received ${amount} SAIL from <@!${message.author.id}>\nTransaction: ${ solanaConnect.txLink(signature) }` + ( desc ? `\n\nDescription:\n${desc}` : '')
      } else {
        msgToSender    = `Could not send SAIL to <@!${elem}>\n\nError:\n${error}`
        msgToRecipient = `Failed to receive SAIL from <@!${message.author.id}>\n\nError:\n${error}`
      }
      // DM to sender
      await message.author.send({
        embeds: [new MessageEmbed()
          .setColor(infoColor)
          .setTitle('Tip SAIL')
          .setDescription(msgToSender)]
      }).catch(error => {
        console.log(`Cannot send messages to this user`);
      });

            try {
                // DM to recipient
                let fetchedUser = await client.users.fetch(elem, false);
                await fetchedUser.send({
                    embeds: [new MessageEmbed()
                        .setColor(infoColor)
                        .setTitle('Tip SAIL')
                        .setDescription(msgToRecipient)]
                });
            } catch (error) {
                console.log(`Cannot send messages to this user`);
            }
        }

    try {
      let tmpCache = await message.guild.emojis.cache;
      const sail_emoji = tmpCache.find(emoji => emoji.name == SAIL_Emoji);
      await message.react(sail_emoji);
    } catch (error) {
      console.log(`Sail emoji error: ${error}`);
    }
    return;
  } else if (command == "tipgsail") {
    if (message.channel.type == "DM") {
      return;
    }

        let validation = await Utils.validateForTipping(args, desc);
        if (!validation.status) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(validation.msg)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        let recipientIds = validation.ids;
        let amount = validation.amount.toFixed(9);

        // get the balance of sol
        const sol = await solanaConnect.getSolBalance(publicKey);
        if (sol.amount < SOL_FEE_LIMIT) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`Not enough SOL fee to tip the GSAIL`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        // get the balance of gSAIL
        const gSAIL = await solanaConnect.getGSAILBalance(await Wallet.getPrivateKey(message.author.id));
        if (amount * recipientIds.length > gSAIL.amount) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`Not enough GSAIL`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        if (amount < 0.000000001 || 100 < amount) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription('MIN: 0.000000001\nMAX: 100')]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        for (let i = 0; i < recipientIds.length; i++) {
            const elem = recipientIds[i];

            // if the recipient doesn't have the wallet
            if (!await Wallet.getPublicKey(elem)) {
                await message.channel.send({
                    embeds: [new MessageEmbed()
                        .setColor(dangerColor)
                        .setDescription(`<@!${elem}> doesn't have the wallet`)]
                }).catch(error => {
                    console.log(`Cannot send messages`);
                });
                continue;
            }

            // get the balance of gSAIL
            const gSAIL = await solanaConnect.getGSAILBalance(await Wallet.getPrivateKey(message.author.id));
            // get the balance of SAIL
            const SAIL = await solanaConnect.getSAILBalance(await Wallet.getPrivateKey(message.author.id));

            if (gSAIL.amount < 1 || SAIL.amount < 1) {
                await message.channel.send({
                    embeds: [new MessageEmbed()
                        .setColor(dangerColor)
                        .setDescription(`You should have at least 1 gSAIL and 1 SAIL`)]
                }).catch(error => {
                    console.log(`Cannot send messages`);
                });
                return;
            }

      const {success, error, signature,} = await solanaConnect.transferGSAIL(await Wallet.getPrivateKey(message.author.id), await Wallet.getPublicKey(elem), amount, desc);

      let msgToSender, msgToRecipient
      if( success ) {
        msgToSender    = `You sent ${amount} gSAIL to <@!${elem}>\nTransaction: ${ solanaConnect.txLink(signature) }` + ( desc ? `\n\nDescription:\n${desc}` : '')
        msgToRecipient = `You received ${amount} gSAIL from <@!${message.author.id}>\nTransaction: ${ solanaConnect.txLink(signature) }` + ( desc ? `\n\nDescription:\n${desc}` : '')
      } else {
        msgToSender    = `Could not send gSAIL to <@!${elem}>\n\nError:\n${error}`
        msgToRecipient = `Failed to receive gSAIL from <@!${message.author.id}>\n\nError:\n${error}`
      }
      // DM to sender
      await message.author.send({
        embeds: [new MessageEmbed()
          .setColor(infoColor)
          .setTitle('Tip gSAIL')
          .setDescription(msgToSender)]
      }).catch(error => {
        console.log(`Cannot send messages to this user`);
      });

      try {
        // DM to recipient
        let fetchedUser = await client.users.fetch(elem, false);
        await fetchedUser.send({
          embeds: [new MessageEmbed()
            .setColor(infoColor)
            .setTitle('Tip gSAIL')
            .setDescription(msgToRecipient)]
        });
      } catch (error) {
        console.log(`Cannot send messages to this user`);
      }
    }

        try {
            let tmpCache = await message.guild.emojis.cache;
            const gsail_emoji = tmpCache.find(emoji => emoji.name == gSAIL_Emoji);
            await message.react(gsail_emoji);
        } catch (error) {
            console.log(`gSail emoji error: ${error}`);
        }
        return;
    } else if (command == "challenge_chess") {
        if (message.channel.type == "DM") {
            return;
        }

        // get the balance of sol
        const sol = await solanaConnect.getSolBalance(await Wallet.getPublicKey(message.author.id));
        // get the balance of gSAIL
        const gSAIL = await solanaConnect.getGSAILBalance(await Wallet.getPrivateKey(message.author.id));
        // get the balance of SAIL
        const SAIL = await solanaConnect.getSAILBalance(await Wallet.getPrivateKey(message.author.id));

        // check the price
        if (sol.amount < 0.1 || gSAIL.amount < 1 || SAIL.amount < 61) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`You should have at least 0.1 sol, 1 gSAIL and 61 SAIL`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        const challenger = message.member; // Define the challenger
        const opponent = message.mentions.members.first(); // Get and define the opponent

        // If there is no opponent, require them to define one
        if (!opponent) {
            return await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`Please mention another SAILOR to play the chess!`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
        }

        // Check for prevention against challenging yourself
        if (challenger.id === opponent.id) {
            return await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`Please challenge someone other than yourself!`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
        }

        if (await Room.checkIsPlaying(challenger.id)) { // check the user is playing
            return await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`You are still playing the game`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
        }

        // set the room
        await Room.setRoom(challenger.id, opponent.id);

        await message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor(infoColor)
                    .setDescription(`Hello ${opponent}\n\n${challenger} just challenged you to a chess game\n\n${challenger} vs ${opponent}\n\nIf you want to accept, please type '${COMMAND_PREFIX}accept <user>'`)
            ]
        }).catch(error => {
            console.log(`Cannot send messages`);
        });

        return;
    } else if (command == "accept") {
        if (message.channel.type == "DM") {
            return;
        }

        // get the balance of sol
        const sol = await solanaConnect.getSolBalance(await Wallet.getPublicKey(message.author.id));
        // get the balance of gSAIL
        const gSAIL = await solanaConnect.getGSAILBalance(await Wallet.getPrivateKey(message.author.id));
        // get the balance of SAIL
        const SAIL = await solanaConnect.getSAILBalance(await Wallet.getPrivateKey(message.author.id));

        // check the price
        if (sol.amount < 0.1 || gSAIL.amount < 1 || SAIL.amount < 61) {
            await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`You should have at least 0.1 sol, 1 gSAIL and 61 SAIL`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
            return;
        }

        const challenger = message.mentions.members.first(); // Define the challenger
        const opponent = message.member; // Get and define the opponent 

        // If there is no challenger, require them to define one
        if (!challenger) {
            return await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`Please mention another SAILOR to play chess!`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
        }

        // Check for prevention against challenging yourself
        if (challenger.id === opponent.id) {
            return await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`Please challenge someone other than yourself!`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
        }

        if (await Room.checkIsPlaying(opponent.id)) { // check the user is playing
            return await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`You are still playing the game`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
        }

        if (!await Room.checkCanAccept(challenger.id, opponent.id)) {
            return await message.channel.send({
                embeds: [new MessageEmbed()
                    .setColor(dangerColor)
                    .setDescription(`You can't play with ${challenger.user}`)]
            }).catch(error => {
                console.log(`Cannot send messages`);
            });
        }

        await Room.joinRoom(challenger.id, opponent.id);

        const chessGame = new DiscordChess({
            prefix: COMMAND_PREFIX,
            dangerColor: dangerColor,
            infoColor: infoColor,
            gameResultChannel: await guild.channels.fetch(CHESS_RESULT_CHANNEL_ID),
        });
        await chessGame.createGame(message);
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
