class King {

  constructor(suit, x, y) {
    this.name = 'King'
    this.suit = suit;
    this.x = x;
    this.y = y;
  }

  setPos (x, y) {
    this.x = x;
    this.y = y;
  }
  
  checkMove (board, x, y) {
    if (this.x == x) {
      if (this.checkVertical(board, x, y)) return true;
    } else if (this.y == y) {
        if (this.checkHorizontal(board, x, y)) return true;
    } else {
      if (this.checkDiagonal(board, x, y)) return true;
    }

    return false;
  }

  checkDiagonal (board, x, y) {
    var signX = -1;
    var signY = -1;
    if (x > this.x) signX = 1;
    if (y > this.y) signY = 1;

    var obj = board.board[y][x];
    if ((this.x + signX == x) && (this.y + signY == y)) {
      if (obj == 0 || obj.suit != this.suit) return true;
    }

    return false;
  }

  checkVertical (board, x, y) {
    var signY = -1;
    if (y > this.y) signY = 1;

    var obj = board.board[y][x];
    if (this.y + signY == y) {
      if (obj == 0 || obj.suit != this.suit) return true;
    }

    return false;
  }

  checkHorizontal (board, x, y) {
    var signX = -1;
    if (x > this.x) signX = 1;

    var obj = board.board[y][x];
    if (this.x + signX == x) {
      if (obj == null || obj.suit != this.suit) return true;
    }

    return false;
  }

  getPaths (board) {
    let paths = [];
    let validatePos = [ // [row, col]
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1],
		]

    for (let j = 0; j < validatePos.length; j++) {
			const elem = validatePos[j];

      let newRow = elem[0] + this.y;
      let newCol = elem[1] + this.x;

      if (!board.inBounds(newRow, newCol)) continue;

      if (board.board[newRow][newCol] != 0 && board.board[newRow][newCol].suit == this.suit) continue;

      if (board.board[newRow][newCol] == 0 || board.board[newRow][newCol].suit != this.suit) {
        paths.push([newRow, newCol]);
      }
		}

    return paths
  }
}

export {
  King,
};
