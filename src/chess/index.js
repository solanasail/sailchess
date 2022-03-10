import { MessageEmbed } from 'discord.js'
import Room from '../chess/room.js'
import solanaConnect from '../solana/index.js'
import Wallet from '../wallet/index.js'

import { Board } from '../chess/board.js'

class DiscordChess {
  constructor(settings) {
    this.settings = settings;
    this.board = null;
    this.autoTurnInterval = null;

    this.autoTurnCount = 0;

    this.gameResultChannel = settings.gameResultChannel;
  }

  createGame = async (message) => {
    this.guild = message.guildId;
    const challenger = message.mentions.members.first(); // Define the challenger 
    const opponent = message.member; // Define the opponent

    this.board = new Board();

    const players = [
      // define the challenger
      {
        collector: null,
        member: challenger,
        isTurn: true,
        earnAmount: {
          sol: 0,
          sail: 0,
          gsail: 0,
        },
        suit: 'w',
        movement: 0,
      },
      // define the opponent
      {
        collector: null,
        member: opponent,
        isTurn: false,
        earnAmount: {
          sol: 0,
          sail: 0,
          gsail: 0,
        },
        suit: 'b',
        movement: 0,
      },
    ];

    let attachmentFile = await this.board.printBoard(players[1].suit);
    await this.gameResultChannel.send({
      embeds: [new MessageEmbed()
        .setTitle('Chess Game')
        .setDescription(`Turn : ${players[0].member.user}`)
        .setColor(this.settings.infoColor)
        .addFields(
          { name: `White`, value: `${players[0].member.user}`, inline: true },
          { name: `Black`, value: `${players[1].member.user}`, inline: true },
        )
        .setImage(attachmentFile.url)
      ],
      files: [attachmentFile.attachment],
    }).catch(error => { console.log(`Cannot send messages`) });

    // set auto turn interval
    this.autoTurnInterval = setInterval(() => {
      this.autoTurn(players, true);
    }, 90000);

    this.autoTurnCount = 0;

    for (const [index, player] of players.entries()) {
      let opponentIndex = (index + 1) % 2;

      attachmentFile = await this.board.printBoard(player.suit);

      const boardMsg = await player.member.send({
        embeds: [new MessageEmbed()
          // .setTitle(`test`)
          .setColor(this.settings.infoColor)
          .setDescription(`Turn : ${(player.isTurn ? player.member.user : players[opponentIndex].member.user)}`)
          .setImage(attachmentFile.url)
        ],
        files: [attachmentFile.attachment],
      }).catch(error => { console.log(`Cannot send messages`) })

      const filter = (elem) => elem.author.id === player.member.id &&
        [`${this.settings.prefix}move`].includes(elem.content.split(" ")[0]);

      player.collector = boardMsg.channel.createMessageCollector(filter);
      player.collector.on("collect", async (msg) => {
        if (msg.author.bot) return;

        const argument = msg.content.slice(this.settings.prefix.length).trim().split(/ +/g);
        const cmd = argument.shift();

        if (!player.isTurn) {
          return;
        }

        const cords = argument[0];

        if (!cords || argument.length > 1 || !(/[a-h][1-8][a-h][1-8]/).test(cords) || cords.length != 4) {
          return await player.member.send({
            embeds: [new MessageEmbed()
              .setColor(this.settings.dangerColor)
              .setDescription(`Invalid format\n${this.settings.prefix}move b4c5`)]
          }).then(msg => {
            setTimeout(() => msg.delete(), 5000)
          }).catch(error => { console.log(`Cannot send messages`) });
        }

        let moveResult = await this.move(cords.substring(0, 2), cords.substring(2, 4), player, players[opponentIndex]);
        if (!moveResult.success) {
          return await player.member.send({
            embeds: [new MessageEmbed()
              .setTitle(moveResult.title)
              .setColor(this.settings.dangerColor)
              .setDescription(moveResult.description)]
          }).then(msg => {
            setTimeout(() => msg.delete(), 5000)
          }).catch(error => { console.log(`Cannot send messages`) });
        }

        attachmentFile = await this.board.printBoard(player.suit);
        await player.member.send({
          embeds: [new MessageEmbed()
            // .setTitle(`test`)
            .setColor(this.settings.infoColor)
            .setDescription(`Turn : ${(player.isTurn ? players[opponentIndex].member.user : player.member.user)}`)
            .setImage(attachmentFile.url)
          ],
          files: [attachmentFile.attachment],
        }).catch(error => { console.log(`Cannot send messages`) });

        attachmentFile = await this.board.printBoard(players[opponentIndex].suit);
        await players[opponentIndex].member.send({
          embeds: [new MessageEmbed()
            // .setTitle(`test`)
            .setColor(this.settings.infoColor)
            .setDescription(`Turn : ${(player.isTurn ? players[opponentIndex].member.user : player.member.user)}`)
            .setImage(attachmentFile.url)
          ],
          files: [attachmentFile.attachment],
        }).catch(error => { console.log(`Cannot send messages`) });

        attachmentFile = await this.board.printBoard(players[1].suit);
        await this.gameResultChannel.send({
          embeds: [new MessageEmbed()
            .setTitle('Chess Game')
            .setDescription(`Turn : ${(player.isTurn ? players[opponentIndex].member.user : player.member.user)}`)
            .setColor(this.settings.infoColor)
            .addFields(
              { name: `White`, value: `${players[0].member.user}`, inline: true },
              { name: `Black`, value: `${players[1].member.user}`, inline: true },
            )
            .setImage(attachmentFile.url)
          ],
          files: [attachmentFile.attachment],
        }).catch(error => { console.log(`Cannot send messages`) });

        let isSafeStatus = this.board.isKingSafe(this.board.board, (player.suit == 'w') ? 'b' : 'w');
        if (!isSafeStatus) {
          let color = (player.suit == 'w') ? 'Black' : 'White'
          await player.member.send({
            embeds: [new MessageEmbed()
              .setColor(this.settings.dangerColor)
              .setDescription(`${color} King is under attack: Check!`)]
          }).catch(error => { console.log(`Cannot send messages`) });

          await players[opponentIndex].member.send({
            embeds: [new MessageEmbed()
              .setColor(this.settings.dangerColor)
              .setDescription(`${color} King is under attack: Check!`)]
          }).catch(error => { console.log(`Cannot send messages`) });

          if (this.board.isGameOver((player.suit == 'w') ? 'b' : 'w')) {
            clearInterval(this.autoTurnInterval);

            // Get the SAIL amount of KING
            if (await solanaConnect.transferSAIL(
              await Wallet.getPrivateKey(players[opponentIndex].member.user.id),
              await Wallet.getPublicKey(player.member.user.id),
              30,
              'Destroyed the KING')) {
              player.earnAmount.sail += 30;
              players[opponentIndex].earnAmount.sail -= 30;
            }

            await player.member.send({
              embeds: [new MessageEmbed()
                .setTitle('Game Over')
                .setColor(this.settings.infoColor)
                .setDescription(`You win (+30 SAIL)\nTotal : ${player.earnAmount.sail} SAIL`)]
            }).catch(error => { console.log(`Cannot send messages`) });

            await players[opponentIndex].member.send({
              embeds: [new MessageEmbed()
                .setTitle('Game Over')
                .setColor(this.settings.dangerColor)
                .setDescription(`You lose (-30 SAIL)\nTotal : ${players[opponentIndex].earnAmount.sail} SAIL`)]
            }).catch(error => { console.log(`Cannot send messages`) });

            player.collector.stop();
            players[opponentIndex].collector.stop();

            await this.displayGameResult(players);
            await Room.removeRoom(players[0].member.id);
            return;
          }
        }

        player.movement++;
        if (player.movement >= 100) {
          clearInterval(this.autoTurnInterval);

          for (const elem of players) {
            elem.collector.stop();

            elem.member.send({
              embeds: [new MessageEmbed()
                .setTitle('Game Over')
                .setColor(this.settings.infoColor)
                .setDescription(`Draw\nTotal : ${elem.earnAmount.sail} SAIL`)]
            }).catch(error => { console.log(`Cannot send messages`) });
          }

          await this.displayGameResult(players);
          await Room.removeRoom(players[0].member.id);

          return;
        }

        clearInterval(this.autoTurnInterval);
        // auto change the turn
        this.autoTurnInterval = setInterval(() => {
          this.autoTurn(players, isSafeStatus);
        }, (isSafeStatus) ? 90000 : 180000);

        player.isTurn = false;
        players[opponentIndex].isTurn = true;

        this.autoTurnCount = 0;
      });
    }
  }

  move = async (pos1, pos2, player, opponentPlayer) => {
    let col1 = pos1.charCodeAt(0) - 'a'.charCodeAt(0);
    let row1 = 8 - parseInt(pos1[1]);

    let col2 = pos2.charCodeAt(0) - 'a'.charCodeAt(0);
    let row2 = 8 - parseInt(pos2[1]);

    let result = await this.board.movePiece(row1, col1, row2, col2, player, opponentPlayer);
    return result;
  }

  // auto change the turn
  autoTurn = async (players, isSafeStatus) => {
    this.autoTurnCount++;
    if (this.autoTurnCount >= 3) {
      clearInterval(this.autoTurnInterval);

      for (const elem of players) {
        elem.collector.stop();

        elem.member.send({
          embeds: [new MessageEmbed()
            .setTitle('Game Over')
            .setColor(this.settings.infoColor)
            .setDescription(`Draw\nTotal : ${elem.earnAmount.sail} SAIL`)]
        }).catch(error => { console.log(`Cannot send messages`) });
      }

      await this.displayGameResult(players);
      await Room.removeRoom(players[0].member.id);
      return;
    }

    if (!isSafeStatus) {
      clearInterval(this.autoTurnInterval);

      let winner, loser;

      for (const elem of players) {
        elem.collector.stop();

        if (elem.isTurn) {
          loser = elem;
        } else {
          winner = elem;
        }
      }

      // Get the SAIL amount of KING
      if (await solanaConnect.transferSAIL(
        await Wallet.getPrivateKey(loser.member.user.id),
        await Wallet.getPublicKey(winner.member.user.id),
        30,
        'Destroyed the KING')) {
        winner.earnAmount.sail += 30;
        loser.earnAmount.sail -= 30;

        winner.member.send({
          embeds: [new MessageEmbed()
            .setTitle('Game Over')
            .setColor(this.settings.infoColor)
            .setDescription(`You win (+30 SAIL)\nTotal : ${winner.earnAmount.sail} SAIL`)]
        }).catch(error => { console.log(`Cannot send messages`) });

        loser.member.send({
          embeds: [new MessageEmbed()
            .setTitle('Game Over')
            .setColor(this.settings.dangerColor)
            .setDescription(`You lose (-30 SAIL)\nTotal : ${loser.earnAmount.sail} SAIL`)]
        }).catch(error => { console.log(`Cannot send messages`) });
      }

      await this.displayGameResult(players);
      await Room.removeRoom(players[0].member.id);
      return;
    }

    players[0].isTurn = !players[0].isTurn;
    players[1].isTurn = !players[1].isTurn;

    for (const [index, elem] of players.entries()) {
      let opponentIndex = (index + 1) % 2;
      let attachmentFile = await this.board.printBoard(elem.suit);

      await elem.member.send({
        embeds: [new MessageEmbed()
          // .setTitle(`test`)
          .setColor(this.settings.infoColor)
          .setDescription(`Turn : ${(elem.isTurn ? elem.member.user : players[opponentIndex].member.user)}`)
          .setImage(attachmentFile.url)
        ],
        files: [attachmentFile.attachment],
      }).catch(error => { console.log(`Cannot send messages`) });
    }

    let attachmentFile = await this.board.printBoard(players[1].suit);
    await this.gameResultChannel.send({
      embeds: [new MessageEmbed()
        .setTitle('Chess Game')
        .setDescription(`Turn : ${(players[0].isTurn ? players[0].member.user : players[1].member.user)}`)
        .setColor(this.settings.infoColor)
        .addFields(
          { name: `White`, value: `${players[0].member.user}`, inline: true },
          { name: `Black`, value: `${players[1].member.user}`, inline: true },
        )
        .setImage(attachmentFile.url)
      ],
      files: [attachmentFile.attachment],
    }).catch(error => { console.log(`Cannot send messages`) });
  }

  displayGameResult = async (players) => {
    let attachmentFile = await this.board.printBoard(players[1].suit);

    await this.gameResultChannel.send({
      embeds: [new MessageEmbed()
        .setTitle('Chess Game Over')
        .setColor(this.settings.infoColor)
        .addFields(
          { name: `White`, value: `${players[0].member.user} (${players[0].earnAmount.sail} SAIL)`, inline: true },
          { name: `Black`, value: `${players[1].member.user} (${players[1].earnAmount.sail} SAIL)`, inline: true },
        )
        .setImage(attachmentFile.url)
      ],
      files: [attachmentFile.attachment],
    }).catch(error => { console.log(`Cannot send messages`) });
  }
}

export {
  DiscordChess,
};