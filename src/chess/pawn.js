class Pawn {
  constructor(suit, x, y) {
    this.name = 'Pawn';
    this.suit = suit;
    this.x = x; // col
    this.y = y; // row
  }

  setPos (x, y) {
    this.x = x;
    this.y = y;
  }
  
  checkMove (board, x, y) {
    if (this.x - x == 0) { // check forward
      if (this.checkVertical(board, x, y)) return true;
    } else if (Math.abs(x - this.x) == 1) { // check diagonal
      if (this.checkDiagonal(board, x, y)) return true;
    }

    return false;
  }

  checkDiagonal(board, x, y) {
    var direction = -1;
    var signX = -1;
    if (this.suit == "b") direction = 1;
    if (x > this.x) signX = 1;

    if ((this.y + direction == y) && (this.x + signX == x)) {
      if (board.board[y][x] != 0 && board.board[y][x].suit != this.suit) return true;
    }

    return false;
  }

  checkVertical (board, x, y) {
    var direction = -1;
    if (this.suit == "b") direction = 1;

    if (this.y + direction == y) {
      if (board.board[y][x] == 0) {
        return true;
      }
    }

    if (this.y + direction*2 == y) {
      if (board.isPathEmpty(board.board, this.x, this.y, x, y) && board.board[y][x] == 0) {
        return true;
      }
    }

    return false;
  }

  getPaths (board) {
    let paths = [];
    let validatePos = [ // [row, col]
      [1, 0],
      [2, 0],
      [1, 1],
      [1, -1]
    ];
    let dir = (this.suit == 'w') ? -1 : 1;

    for (let i = 0; i < validatePos.length; i++) {
      const elem = validatePos[i];
      let newRow = elem[0] * dir + this.y;
			let newCol = elem[1] + this.x;

      if (board.inBounds(newRow, newCol)) {
        if (elem[1] == 0) { // for move
          if (elem[0] > 1) {
            if (board.board[newRow][newCol] == 0 && board.board[dir + this.y][newCol] == 0) {
              paths.push([newRow, newCol]);
            }
          } else if (elem[0] == 1) {
            if (board.board[newRow][newCol] == 0) {
              paths.push([newRow, newCol]);
            }
          }
          
        } else if (elem[1] != 0) { // for attack
          if (board.board[newRow][newCol] != 0 && board.board[newRow][newCol].suit != this.suit) {
            paths.push([newRow, newCol]);
          }
        }
      }
    }

    return paths;
  }
}

export {
  Pawn,
};