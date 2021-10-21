import { MessageEmbed } from 'discord.js'
import Room from '../chess/room.js'
import solanaConnect from '../solana/index.js'
import Wallet from '../wallet/index.js'

import { Board } from '../chess/board.js'

class DiscordChess {
  constructor(settings) {
		this.settings = settings;
    this.board = null;
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
			},
		];

    let autoTurnInterval;
    
    for (const [index, player] of players.entries()) {
      const boardMsg = await player.member.send({
        embeds: [new MessageEmbed()
          .setTitle(`test`)
          .setColor(this.settings.infoColor)
          .setDescription(`Let's play!`)
        ],
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
          return await player.member.send({embeds: [new MessageEmbed()
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
          return await player.member.send({embeds: [new MessageEmbed()
            .setColor(this.settings.dangerColor)
            .setDescription(`Invalid format\n${this.settings.prefix}move b4c5`)]
          }).then(msg => {
            setTimeout(() => msg.delete(), 5000)
          }).catch(error => { console.log(`Cannot send messages`) });
        }
        
        if (!await this.move(cords.substring(0, 2), cords.substring(2, 4))) {
          return await player.member.send({embeds: [new MessageEmbed()
            .setColor(this.settings.dangerColor)
            .setDescription(`Invalid Move, Please choose a valid move!`)]
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
        
        player.isTurn = false;
        players[opponentIndex].isTurn = true;
      });
    }
  }

  move = async (pos1, pos2) => {
    let col1 = pos1.charCodeAt(0) - 'a'.charCodeAt(0);
    let row1 = 8 - parseInt(pos1[1]);

    let col2 = pos2.charCodeAt(0) - 'a'.charCodeAt(0);
    let row2 = 8 - parseInt(pos2[1]);

    if (!await this.board.movePiece(row1, col1, row2, col2)) {
      return false;
    }

    return true;
  }
}

export {
  DiscordChess,
};