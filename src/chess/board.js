import Canvas from 'canvas'
import { async } from 'regenerator-runtime';
import { MessageAttachment } from 'discord.js'

import { Pawn } from '../chess/pawn.js'
import { Bishop} from '../chess/bishop.js'
import { King } from '../chess/king.js'
import { Queen } from '../chess/queen.js'
import { Rook } from '../chess/rook.js'
import { Knight } from '../chess/knight.js'

class Board {
  constructor() {
		this.width = 592;
		this.height = 592;

		this.canvas = Canvas.createCanvas(this.width, this.height);
    this.context = this.canvas.getContext('2d');

		this.board = this.generateBoard();

		for (var i=0; i < 8; i++) {
      this.board[1][i] = new Pawn("b", i, 1);
      this.board[6][i] = new Pawn("w", i, 6);
    }

		this.board[0][0] = new Rook ("b", 0, 0);
    this.board[0][1] = new Knight ("b", 1, 0);
    this.board[0][2] = new Bishop ("b", 2, 0);
    this.board[0][3] = new Queen ("b", 3, 0);
    this.board[0][4] = new King ("b", 4, 0);
    this.board[0][7] = new Rook ("b", 7, 0);
    this.board[0][6] = new Knight ("b", 6, 0);
    this.board[0][5] = new Bishop ("b", 5, 0);

    this.board[7][0] = new Rook ("w", 0, 7);
    this.board[7][1] = new Knight ("w", 1, 7);
    this.board[7][2] = new Bishop ("w", 2, 7);
    this.board[7][3] = new Queen ("w", 3, 7);
    this.board[7][4] = new King ("w", 4, 7);
    this.board[7][7] = new Rook ("w", 7, 7);
    this.board[7][6] = new Knight ("w", 6, 7);
    this.board[7][5] = new Bishop ("w", 5, 7);
	}

	// generate board
  generateBoard = () => {   
		let rows = 8;
		let cols = 8;

		const result = [];

    for (let i = 0; i < rows; i++) {
      const tempRow = [];
      for (let j = 0; j < cols; j++) {
        tempRow.push(0);
      }
  
      result.push(tempRow);
    }

		return result;
  }

	printBoard = async (suit) => {
		let rows = 8;
		let cols = 8;

    const background = await Canvas.loadImage(`assets/${suit}Board.png`);
		this.context.drawImage(background, 0, 0, this.width, this.height);

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (this.board[i][j] != 0) {
					if (suit == 'w') {
						this.context.drawImage(
							await Canvas.loadImage(`assets/${this.board[i][j].suit}${this.board[i][j].name}.png`), 
							40 + 64 * j, 40 + 64 * i, 
							64, 64
						);
					} else {
						this.context.drawImage(
							await Canvas.loadImage(`assets/${this.board[i][j].suit}${this.board[i][j].name}.png`), 
							40 + 64 * (cols - j - 1), 40 + 64 * (rows - i - 1), 
							64, 64
						);
					}
					
				}
			}
		}
    
		return new MessageAttachment(this.canvas.toBuffer(), 'board-image.png');
	}

	movePiece = async (row1, col1, row2, col2) => {
		if (this.board[row1][col1] == 0) { // nothing in start point
			return false;
		}

		this.board[row2][col2] = this.board[row1][col1];
		this.board[row1][col1] = 0;
		
		return true;
	}
}

export {
	Board,
};