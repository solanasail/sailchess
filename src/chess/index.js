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
  }

  createGame = async (message) => {
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
        suit: 'b',
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
        suit: 'w',
        movement: 0,
      },
    ];

    // set auto turn interval
    this.autoTurnInterval = setInterval(() => {
      this.autoTurn(players, true);
    }, 90000);

    this.autoTurnCount = 0;

    for (const [index, player] of players.entries()) {
      const boardMsg = await player.member.send({
        // embeds: [new MessageEmbed()
        //   .setTitle(`test`)
        //   .setColor(this.settings.infoColor)
        //   .setDescription(`Let's play!`)
        // ],
        files: [await this.board.printBoard(player.suit)],
      })

      const filter = (elem) => elem.author.id === player.member.id &&
        [`${this.settings.prefix}move`].includes(elem.content.split(" ")[0]);

      player.collector = boardMsg.channel.createMessageCollector(filter);
      player.collector.on("collect", async (msg) => {
        if (msg.author.bot) return;

        const argument = msg.content.slice(this.settings.prefix.length).trim().split(/ +/g);
        const cmd = argument.shift();

        if (!player.isTurn) {
          return await player.member.send({
            embeds: [new MessageEmbed()
              .setTitle(`It isn't your turn`)
              .setColor(this.settings.dangerColor)
              .setDescription(`Please wait for the other`)]
          }).then(msg => {
            setTimeout(() => msg.delete(), 5000)
          }).catch(error => { console.log(`Cannot send messages`) });
        }

        let opponentIndex = (index + 1) % 2;

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

        let moveResult = await this.move(cords.substring(0, 2), cords.substring(2, 4), player.suit);
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

        await player.member.send({
          files: [await this.board.printBoard(player.suit)],
        });

        await players[opponentIndex].member.send({
          files: [await this.board.printBoard(players[opponentIndex].suit)],
        });

        let isSafeStatus = this.board.isKingSafe(this.board.board, (player.suit == 'w') ? 'b' : 'w');
        if (!isSafeStatus) {
          let color = (player.suit == 'w') ? 'Black' : 'White'
          await player.member.send({
            embeds: [new MessageEmbed()
              .setColor(this.settings.dangerColor)
              .setDescription(`${color} King is danger`)]
          }).then(msg => {
            setTimeout(() => msg.delete(), 5000)
          }).catch(error => { console.log(`Cannot send messages`) });

          await players[opponentIndex].member.send({
            embeds: [new MessageEmbed()
              .setColor(this.settings.dangerColor)
              .setDescription(`${color} King is danger`)]
          }).then(msg => {
            setTimeout(() => msg.delete(), 5000)
          }).catch(error => { console.log(`Cannot send messages`) });
        }

        if (this.board.isGameOver((player.suit == 'w') ? 'b' : 'w')) {
          clearInterval(this.autoTurnInterval);

          await player.member.send({
            embeds: [new MessageEmbed()
              .setTitle('Game Over')
              .setColor(this.settings.infoColor)
              .setDescription(`You win`)]
          }).then(msg => {
            setTimeout(() => msg.delete(), 10000)
          }).catch(error => { console.log(`Cannot send messages`) });

          await players[opponentIndex].member.send({
            embeds: [new MessageEmbed()
              .setTitle('Game Over')
              .setColor(this.settings.dangerColor)
              .setDescription(`You lose`)]
          }).then(msg => {
            setTimeout(() => msg.delete(), 10000)
          }).catch(error => { console.log(`Cannot send messages`) });

          player.collector.stop();
          players[opponentIndex].collector.stop();

          return;
        }

        player.movement++;
        if (player.movement >= 50) {
          clearInterval(this.autoTurnInterval);

          for (const elem of players) {
            elem.collector.stop();

            elem.member.send({
              embeds: [new MessageEmbed()
                .setTitle('Game Over')
                .setColor(this.settings.infoColor)
                .setDescription(`Draw`)]
            }).then(msg => {
              setTimeout(() => msg.delete(), 10000)
            }).catch(error => { console.log(`Cannot send messages`) });
          }

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

        await players[opponentIndex].member.send({
          embeds: [new MessageEmbed()
            .setColor(this.settings.infoColor)
            .setDescription(`Your turn!`)]
        }).then(msg => {
          setTimeout(() => msg.delete(), 5000)
        }).catch(error => { console.log(`Cannot send messages`) })
      });
    }
  }

  move = async (pos1, pos2, suit) => {
    let col1 = pos1.charCodeAt(0) - 'a'.charCodeAt(0);
    let row1 = 8 - parseInt(pos1[1]);

    let col2 = pos2.charCodeAt(0) - 'a'.charCodeAt(0);
    let row2 = 8 - parseInt(pos2[1]);

    let result = await this.board.movePiece(row1, col1, row2, col2, suit);
    return result;
  }

  // auto change the turn
  autoTurn = (players, isSafeStatus) => {
    this.autoTurnCount++;
    if (this.autoTurnCount >= 3) {
      clearInterval(this.autoTurnInterval);

      for (const elem of players) {
        elem.collector.stop();

        elem.member.send({
          embeds: [new MessageEmbed()
            .setTitle('Game Over')
            .setColor(this.settings.infoColor)
            .setDescription(`Draw`)]
        }).then(msg => {
          setTimeout(() => msg.delete(), 10000)
        }).catch(error => { console.log(`Cannot send messages`) });
      }

      return;
    }

    if (!isSafeStatus) {
      clearInterval(this.autoTurnInterval);

      for (const elem of players) {
        elem.collector.stop();

        if (elem.isTurn) {
          elem.member.send({
            embeds: [new MessageEmbed()
              .setTitle('Game Over')
              .setColor(this.settings.dangerColor)
              .setDescription(`You lose`)]
          }).then(msg => {
            setTimeout(() => msg.delete(), 10000)
          }).catch(error => { console.log(`Cannot send messages`) });
        } else {
          elem.member.send({
            embeds: [new MessageEmbed()
              .setTitle('Game Over')
              .setColor(this.settings.infoColor)
              .setDescription(`You win`)]
          }).then(msg => {
            setTimeout(() => msg.delete(), 10000)
          }).catch(error => { console.log(`Cannot send messages`) });
        }
      }

      return;
    }

    players[0].isTurn = !players[0].isTurn;
    players[1].isTurn = !players[1].isTurn;

    if (players[0].isTurn) {
      players[0].member.send({
        embeds: [new MessageEmbed()
          .setColor(this.settings.infoColor)
          .setDescription(`Your turn!`)]
      }).then(msg => {
        setTimeout(() => msg.delete(), 5000)
      }).catch(error => { console.log(`Cannot send messages`) })
    }

    if (players[1].isTurn) {
      players[1].member.send({
        embeds: [new MessageEmbed()
          .setColor(this.settings.infoColor)
          .setDescription(`Your turn!`)]
      }).then(msg => {
        setTimeout(() => msg.delete(), 5000)
      }).catch(error => { console.log(`Cannot send messages`) })
    }
  }
}

export {
  DiscordChess,
};