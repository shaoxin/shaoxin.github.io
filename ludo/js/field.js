/**
 * Class representing a single field of a game board
 * @param {Number} x    X-position
 * @param {Number} y    Y-position
 * @param {Number} type Field type
 */
var Field = function (x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.pawn = null;
	this.pawns = {};
};

/**
 * Retrieve pawn standing on this field
 * @return {Object} Present pawn or null
 */
Field.prototype.getPawn = function () {
    return this.pawn;
};

/**
 * Set/unset pawn standing on this field
 * @param {Object} [pawn] Pawn
 */
Field.prototype.setPawn = function (pawn) {
    this.pawn = pawn || null;
};

Field.prototype.addPawn = function (pawn) {
	var key = pawn.getKey();
	if (this.pawns[key]) {
		console.log("pawn " + key + " is already added");
		return;
	}
	this.pawns[key] = pawn;
	pawn.field = this;
};

Field.prototype.removePawn = function (pawn) {
	var key = pawn.getKey();
	if (this.pawns[key]) {
		delete this.pawns[key];
		pawn.field = null;
	} else {
		console.log("pawn " + key + " is not inside "
				+ field.x + "," +field.y);
	}
};

Field.prototype.getPawns = function (pawn) {
	var pawns = [], p;
	for (p in this.pawns)
		pawns.push(this.pawns[p]);
	return pawns;
};

/**
 * kill pawns not belonging to newPlayer
 */
Field.prototype.kill = function (newPlayer) {
	var key, p, field;
	for (key in this.pawns) {
		p = this.pawns[key];
		if (p.player != newPlayer) {
			field =
				game.board.getBaseFreeField(p.player.color);
			p.kill(field);
		}
	}
};
