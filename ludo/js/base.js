/**
 * Class representing one of player bases - start or end
 * @param {Number} color Player's color
 */
var Base = function (type, color, board) {
    this.board = board;
	this.color = color;
    this.path = (function () {
        var locations = {
            start: {},
            end: {}
        };
		locations.start[RED]    = [[0, 9], [1, 9],  [0, 10], [1, 10]];
		locations.start[GREEN]  = [[0, 0], [1, 0],  [0, 1],  [1, 1]];
		locations.start[YELLOW] = [[9, 0], [10, 0], [9, 1],  [10, 1]];
		locations.start[BLUE]   = [[9, 9], [10, 9], [9, 10], [10, 10]];

        locations.end[RED]    =
			[[5, 9], [5, 8], [5, 7], [5, 6], [5, 5], [5, 6], [5, 7], [5, 8], [5, 9], [5, 10]];
        locations.end[GREEN]  =
			[[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5]];
        locations.end[YELLOW] =
			[[5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 4], [5, 3], [5, 2], [5, 1], [5, 0]];
        locations.end[BLUE]   =
			[[9, 5], [8, 5], [7, 5], [6, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5]];

        return locations[type] && locations[type][color] || [];
    })();
    this.setFields();
};

/**
 * Set base fields
 */
Base.prototype.setFields = function () {
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
