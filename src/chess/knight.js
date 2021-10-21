class Knight {

  constructor(suit, x, y) {
    this.name = 'Knight'
    this.suit = suit;
    this.x = x;
    this.y = y;
  }

  checkMove(board, x, y) {
    var signX = -1;
    var signY = -1;
    if (x > this.x) signX = 1;
    if (y > this.y) signY = 1;

    if ((this.x + (signX * 2) == x) && (this.y + (signY) == y)) {
      var temp = board.objectAtIndex(x, y);
      if (temp == null) {
        return true;
      } else {
        if (temp.suit != this.suit) return true;
      }
    } else if ((this.y + (signY * 2) == y) && (this.x + (signX) == x)) {
      var temp = board.objectAtIndex (x, y);
      if (temp == null) {
        return true;
      } else {
        if (temp.suit != this.suit) return true;
      }
    }

    return false;
  }

}

export {
  Knight,
};
