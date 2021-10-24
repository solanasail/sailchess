class Bishop {

  constructor(suit, x, y, darkID, lightID) {
    this.name = 'Bishop';
    this.suit = suit;
    this.x = x;
    this.y = y;
  }

  setPos (x, y) {
    this.x = x;
    this.y = y;
  }
  
  checkMove (board, x, y) {
    if (this.x != x && this.y != y) {
      if (this.checkDiagonal(board, x, y)) return true;
    }

    return false;
  }

  checkDiagonal (board, x, y) {
    var signX = -1;
    var signY = -1;
    if (x > this.x) signX = 1;
    if (y > this.y) signY = 1;

    var distance = Math.abs(this.x-x);
    var obj = board.board[y][x];
    if ((this.x + (distance*signX) == x) && (this.y + (distance*signY) == y)) {
      if (board.isPathEmpty(board.board, this.x, this.y, x, y)) {
        if (obj == 0 || obj.suit != this.suit) return true;
      }
    }

    return false;
  }

  getPaths (board) {
    let paths = [];
    let validatePos = [ // [row, col]
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1],
		]

    for (let j = 0; j < validatePos.length; j++) {
			const elem = validatePos[j];

			for (let i = 1; ; i++) {
				let newRow = elem[0] * i + this.y;
				let newCol = elem[1] * i + this.x;

				if (!board.inBounds(newRow, newCol)) break;

				if (board.board[newRow][newCol] != 0 && board.board[newRow][newCol].suit == this.suit) break;

				if (board.board[newRow][newCol] == 0 || board.isPathEmpty(board.board, this.x, this.y, newRow, newCol)) {
          paths.push([newRow, newCol]);
        }
			}
		}

    return paths
  }
}

export {
  Bishop,
};