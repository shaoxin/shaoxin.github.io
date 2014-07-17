var Player = function (name, color, board) {
    this.name = name;
    this.color = color;
    this.board = board;
    this.start = new Base('start', this.color, this.board);
    this.end = new Base('end', this.color, this.board);
    this.setPath();
    this.setPawns();
    this.isFocused = false;
    this.isFinished = false;
    this.numAflight = 0;
    this.channel = 0;
};

Player.prototype.setPath = function () {
    var start = (this.color - 2) * 10,
        p = this.board.path,
        size = p.length;

    this.path = start > 0 ? p.slice(start, size).concat(p.slice(0, start)) : [].concat(p);
    this.path = this.path.concat(this.end.getPath());
};

Player.prototype.setPawns = function () {
    var i = 0,
        field,
        pawn;

    this.pawns = [];

    for (i = 0; i < 4; i++) {
        pawn = new Pawn(this, 0, 0);
        field = this.start.getFreeField();
        if (field) {
            field.setPawn(pawn);
            pawn.move([field]);
        }
        this.pawns[i] = pawn;
        this.board.add(pawn.$elem);
    }
    this.currentPawn = 0;
};

Player.prototype.getCurrentPawn = function () {
    return this.pawns[this.currentPawn] || null;
}

Player.prototype.getNextAvailPawnIndex = function () {
    var current = this.currentPawn;
    var i = 0;

    while (i < 4) {
        if (current == 3) {
            current = 0;
        } else {
            current++;
        }
        if (this.pawns[current].isArrived) {
            i++;
            continue;
        } else {
            break;
        }
    }
    return current;
}

Player.prototype.nextPawn = function () {
    var prev = this.currentPawn;

    this.pawns[prev].blur();
    this.currentPawn = this.getNextAvailPawnIndex();
    this.pawns[this.currentPawn].focus();
}
Player.prototype.prevPawn = function () {
    var prev = this.currentPawn;
    var current = this.currentPawn;
    var i = 0;

    while (i < 4) {
        if (current == 0) {
            current = 3;
        } else {
            current--;
        }
        if (this.pawns[current].isArrived) {
            i++;
            continue;
        } else {
            break;
        }
    }
    this.pawns[prev].blur();
    this.currentPawn = current;
    this.pawns[this.currentPawn].focus();
}

Player.prototype.focus = function () {
    this.isFocused = true;
    this.getCurrentPawn().focus();
};

Player.prototype.blur = function () {
    this.isFocused = false;
    this.getCurrentPawn().blur();
};

Player.prototype.isMovable = function () {
    var i = 0;

    while (this.pawns[i]) {
        if (this.pawns[i].isMovable()) {
            return true;
        }
        i++;
    }

    return false;
};

Player.prototype.move = function (distance, pawn) {
    var fields = [],
        nextPawn,
        nextPos,
        dest,
        steps,
        i,
        switchPlayer = false;

    if (!this.isFocused || !pawn) {
        return false;
    }

    // pawn is still inside base
    if (pawn.position < 0) {
        if (distance !== 6) {
            return false;
        }
        // enter the board
        nextPos = 0;
        fields.push(this.board.getField(this.path[0]));
        switchPlayer = false;
    // pawn is moving on the board
    } else {
        nextPos = pawn.position + distance;
        steps = this.path.slice(pawn.position + 1, nextPos + 1);
        if (steps.length) {
            i = 0;
            while (steps[i]) {
                fields.push(this.board.getField(steps[i]));
                i++;
            }
        }
        switchPlayer = true;
    }

    // moving on the board
    if ((nextPos < 44) || ((nextPos > 44) && (nextPos <= 49))) {
        dest = this.path[nextPos];
        nextPawn = this.board.getField(dest).getPawn();
        // pawn stands on next field
        if (nextPawn) {
            // this is players pawn - can't move
            if ((nextPawn.player === this) &&
                    (nextPawn != this.getCurrentPawn())) {
                return false;
            }
            // this is other player's pawn - kill him
            nextPawn.kill();
        }
    } else if (nextPos == 44) {
        var field = this.start.getFreeField();
        if (field) {
            fields.push(this.start.getFreeField());
            this.numAflight++;
            pawn.isArrived = true;
            if (this.numAflight == 4) {
                game.numDone++;
            }
        } else {
            alert('this is wrong');
        }
    } else {
        return false;
    }

    pawn.move(fields);
    if (nextPos > 44) {
        nextPos = 44 - (nextPos - 44);
    }
    pawn.position = nextPos;
    if (switchPlayer) {
        nextPlayer();
    } else {
        playAward();
    }
    if ((pawn.position == 44) && (this.numAflight < 4)) {
        this.currentPawn = this.getNextAvailPawnIndex();
        log('arrived, pick up another pawn');
    }
    return true;
};

Player.prototype.checkReady = function() {
    this.isFinished = this.end.checkFull();
    return this.isFinished;
};