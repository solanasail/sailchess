class King {

  constructor(suit, x, y) {
    this.name = 'King'
    this.suit = suit;
    this.x = x;
    this.y = y;
  }

  checkMove (board, x, y) {
    this.moved = true;
    if (this.x == x) {
      if (this.checkVertical(board, x, y)) return true;
    } else if (this.y == y) {
        if (this.checkHorizontal(board, x, y)) return true;
    } else {
      if (this.checkDiagonal(board, x, y)) return true;
    }

    this.moved = false;
    return false;
  }

  checkDiagonal (board, x, y) {
    var signX = -1;
    var signY = -1;
    if (x > this.x) signX = 1;
    if (y > this.y) signY = 1;

    var obj = board.objectAtIndex(x, y);
    if ((this.x + signX == x) && (this.y + signY == y)) {
        if (obj == null) {
          return true;
        } else {
          if (obj.suit != this.suit) return true;
        }
    }

    return false;
  }

  checkVertical (board, x, y) {
    var signY = -1;
    if (y > this.y) signY = 1;

    var obj = board.objectAtIndex(x, y);
    if (this.y + signY == y) {
      if (obj == null) {
        return true;
      } else {
        if (obj.suit != this.suit) return true;
      }
    }

    return false;
  }

  checkHorizontal (board, x, y) {
    var signX = -1;
    if (x > this.x) signX = 1;

    var obj = board.objectAtIndex(x, y);
    if (this.x + signX == x) {
      if (obj == null) {
        return true;
      } else {
        if (obj.suit != this.suit) return true;
      }
    }

    return false;
  }

}

export {
  King,
};
