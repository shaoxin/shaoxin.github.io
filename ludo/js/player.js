var Player = function (name, color, board) {
    this.name = name;
    this.color = color;
    this.board = board;
    this.initPath();
    this.initPawns();
    this.isFocused = false;
    this.isFinished = false;
    this.numArrived = 0;
    this.isMoving = false;

    this.user = null;
};

Player.prototype.setUser = function(user) {
	if (this.user)
		this.user.removePlayer(this);

	var e = $('#li-' + this.color);
	e.html('<div class="icon"></div>' + user.name);

    this.user = user;
	user.addPlayer(this);

	console.log("player-" + this.color +
			" is occupied by user '" + user.name + "'");
};

Player.prototype.getUser = function() {
	return this.user || null;
};

Player.prototype.initPath = function () {
	this.path = this.board.getPath(this.color);
};

Player.prototype.initPawns = function () {
    var i = 0,
        field,
        pawn;

    this.pawns = [];

    for (i = 0; i < 4; i++) {
        pawn = new Pawn(this, 0, 0, i);
        field = this.board.getBaseFreeField(this.color);
        if (field) {
            field.addPawn(pawn);
            pawn.move([field]);
        }
        this.pawns[i] = pawn;
        this.board.add(pawn.$elem);
    }
    this.currentPawn = 0;
};

Player.prototype.resetPawns = function () {
    var i = 0,
        field,
        pawn;

	while (this.isMoving)
		console.log('wait for player-' + this.color + ' to stop');

    for (i = 0; i < 4; i++) {
        pawn = this.pawns[i];
		if (pawn.position === -1)
			continue;
        field = this.board.getBaseFreeField(this.color);
        if (field) {
            pawn.move([field]);
        } else {
			console.log("no base field for " + pawn.getKey());
		}
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

Player.prototype.selectPawnAndMove = function(diceValue) {
	// TODO: simply select a pawn for diceValue
	// if current pawn is OK, that's it
	// otherwise do some simple search

	if (this.pawns[this.currentPawn].position >= 0) {
		this.move(diceValue, this.pawns[this.currentPawn]);
		return;
	}

	i = 0;
	while (this.pawns[i]) {
		if (this.pawns[i].isArrived == false &&
				this.pawns[i].position >= 0) {
			this.move(diceValue, pawn);
			return;
		}
		i++;
	}
	if (diceValue == 6)
		this.move(diceValue, this.pawns[this.currentPawn]);
	else
		console.log("no pawn selected to move, currentPawn=" +
				this.currentPawn + " pos=" +
				this.pawns[this.currentPawn].position);
};

Player.prototype.focus = function () {
    this.isFocused = true;
    this.getCurrentPawn().focus();
};

Player.prototype.blur = function () {
    this.isFocused = false;
    this.getCurrentPawn().blur();
};

Player.prototype.move = function (distance, pawn) {
    var fields = [],
        nextPawns,
        nextPos,
        dest, destField,
        steps,
        i,
        switchPlayer = false,
        killOtherPawn = false;

    if (!this.isFocused || !pawn) {
        return false;
    }

    if (this.isMoving) {
        log("avoid move reentrance for player " + this.color);
        return false;
    }

    this.isMoving = true;
    // pawn is still inside base
    if (pawn.position < 0) {
        if (distance !== 6) {
            this.isMoving = false;
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
        if(distance == 6)
        {
        	switchPlayer = false;
        }else{
        switchPlayer = true;
      }
    }
    log("player " + this.color + " is moving to path[" + nextPos + "]");
    log("path[nextPos] = " +
        this.path[nextPos][0] + "," + this.path[nextPos][1]);

    // moving on the board
    if ((nextPos < 44) || ((nextPos > 44) && (nextPos <= 49))) {
        dest = this.path[nextPos];
		destField = this.board.getField(dest);
        nextPawns = destField.getPawns();
        // pawn stands on next field
        if (nextPawns.length !== 0) {
            // this is players pawn - can't move
            if (nextPawns[0].player === this) {
                //if (nextPawn != this.getCurrentPawn()) {
                   // log("choose another pawn, player " + this.color + ": "+ this.pawnIndex +
                   //     " conflicts with teammate " + nextPawn.pawnIndex);
                   // this.isMoving = false;
                   // return false;
                //}
            } else {
                // this is other player's pawn - kill him
                killOtherPawn = true;
            }
        }
    } else if (nextPos == 44) {
        var field = this.board.getBaseFreeField(this.color);
        if (field) {
            fields.push(field);
        } else {
            console.log('no field for pawn back to base');
			return false;
        }
    } else {
        this.isMoving = false;
        log("out of range nextPos = " + nextPos);
        return false;
    }

    pawn.move(fields,
        function() {
            var player = pawn.player;

            if (killOtherPawn)
                destField.kill(player);

            if (nextPos > 44) {
                nextPos = 44 - (nextPos - 44);
            } else if (nextPos == 44) {
                pawn.arrive();
                player.numArrived++;
                if (player.numArrived == 4) {
                    game.numDone++;
                }
            }

            pawn.position = nextPos;
            log('player ' + player.color + ':' + pawn.pawnIndex + ' finished moving');

            if ((pawn.position == 44) && (player.numArrived < 4)) {
                player.currentPawn = player.getNextAvailPawnIndex();
                log('player ' + player.color + ':' + pawn.pawnIndex +
                    ' arrived, pick up pawn ' + player.getCurrentPawn().pawnIndex);
            }

            if (switchPlayer) {
                game.nextPlayer();
            } else {
                log('player ' + player.color + ':' + pawn.pawnIndex +
                    ' is onboard, roll dice again');
                game.playAward();
            }
            player.isMoving = false;

			// TODO: if it's time for computer to roll
			//       do it automatically
			player = game.getCurrentPlayer();
			user = player.getUser();

			if (user.type != User.TYPE.COMPUTER)
				return;
			if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
				game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
			} else
				console.log("game status error: " + game.stat);
        });

    return true;
};
