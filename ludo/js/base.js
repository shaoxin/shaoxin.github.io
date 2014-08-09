/**
 * Class representing one of player bases - start or end
 * @param {Number} color Player's color
 */
var Base = function (type, color, board, path) {
    this.board = board;
	this.color = color;
    this.path = path;
    this.initFields();
};

/**
 * Set base fields
 */
Base.prototype.initFields = function () {
    var p = this.path, i;

    this.fields = [];

    for (i = 0; i < p.length; i++) {
        this.fields.push(this.board.getField(p[i]));
    }
};

/**
 * Return path of this base
 * @return {Array} Array of path coords
 */
Base.prototype.getPath = function () {
    return [].concat(this.path);
};

/**
 * Returns first free field of base
 * @return {Object} Empty field
 */
Base.prototype.getFreeField = function () {
    var i = 0, field;

    while (i < 4) {
        field = this.fields[i];
        if (field.getPawns().length === 0) {
            return field;
        }
        i++;
    }

    return null;
};
