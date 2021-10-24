class Knight {

  constructor(suit, x, y) {
    this.name = 'Knight'
    this.suit = suit;
    this.x = x;
    this.y = y;

    this.movement = 0;
  }

  setPos (x, y) {
    this.x = x;
    this.y = y;

    this.movement++;
  }
  
  checkMove(board, x, y) {
    var signX = -1;
    var signY = -1;
    if (x > this.x) signX = 1;
    if (y > this.y) signY = 1;

    var obj = board.board[y][x];

    if ((this.x + (signX * 2) == x) && (this.y + (signY) == y)) {
      if (obj == 0 || obj.suit != this.suit) return true;
    } else if ((this.y + (signY * 2) == y) && (this.x + (signX) == x)) {
      if (obj == 0 || obj.suit != this.suit) return true;
    }

    return false;
  }

  getPaths (board) {
    let paths = [];
    let validatePos = [ // [row, col]
			[2, 1],
			[2, -1],
			[-2, 1],
			[-2, -1],
			[1, 2],
			[1, -2],
			[-1, 2],
			[-1, -2],
		]

    for (let i = 0; i < validatePos.length; i++) {
      const elem = validatePos[i];
      let newRow = elem[0] + this.y;
			let newCol = elem[1] + this.x;

      if (board.inBounds(newRow, newCol)) {
        if (board.board[newRow][newCol] == 0 || board.board[newRow][newCol].suit != this.suit) {
          paths.push([newRow, newCol]);
        }
      }
    }

    return paths;
  }
}

export {
  Knight,
};
