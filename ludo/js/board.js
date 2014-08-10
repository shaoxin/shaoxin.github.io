var Board = function (id) {
    this.$elem = $('#' + id);
    
    if (!this.$elem.length) {
        this.$elem = $('<div/>');
        this.$elem[0].id = id;
        $('body').append(this.$elem);
    }
    
    this.fields = [];
    this.path = [
        [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
        [0, 5], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1],
        [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4],
        [9, 4], [10, 4], [10, 5], [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7],
        [6, 8], [6, 9], [6, 10], [5, 10]
    ];
	this.startPositions = {
		red: 0,
		green: 10,
		yellow: 20,
		blue: 30,
	};
    this.reset();
	this.initBases();
	this.initDestinations();
};

Board.prototype.getPath = function(color) {
	var startPos = this.startPositions[color],
	    p = this.path,
		size = p.length;

    ret = startPos > 0 ?
		p.slice(startPos, size).concat(p.slice(0, startPos)) :
		[].concat(p);
    ret = ret.concat(this.dests[color].getPath());
	return ret;
};

Board.prototype.initBases = function() {
	this.bases = {};
	this.bases[RED]    = new Base('start', RED, this);
	this.bases[GREEN]  = new Base('start', GREEN, this);
	this.bases[YELLOW] = new Base('start', YELLOW, this);
	this.bases[BLUE]   = new Base('start', BLUE, this);
};

Board.prototype.initDestinations = function() {
	this.dests = {};
	this.dests[RED]    = new Base('end', RED, this);
	this.dests[GREEN]  = new Base('end', GREEN, this);
	this.dests[YELLOW] = new Base('end', YELLOW, this);
	this.dests[BLUE]   = new Base('end', BLUE, this);
};

Board.prototype.reset = function () {
    var map = [
            [3, 3, 0, 0, 1, 1, 4, 0, 0, 4, 4],
            [3, 3, 0, 0, 1, 4, 1, 0, 0, 4, 4],
            [0, 0, 0, 0, 1, 4, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 4, 1, 0, 0, 0, 0],
            [3, 1, 1, 1, 1, 4, 1, 1, 1, 1, 1],
            [1, 3, 3, 3, 3, 0, 5, 5, 5, 5, 1],
            [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 5],
            [0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0],
            [2, 2, 0, 0, 1, 2, 1, 0, 0, 5, 5],
            [2, 2, 0, 0, 2, 1, 1, 0, 0, 5, 5]
        ],
        x = 0,
        y = 0,
        row;

    delete this.fields;
    this.fields = [];

    while (map[y]) {
        row = map[y];
        this.fields[y] = [];
        while (row[x] !== undefined) {
            this.fields[y].push(new Field(x, y, row[x]));
            x++;
        }
        x = 0;
        y++;
    }
};

Board.prototype.add = function (elem) {
    this.$elem.append(elem);
};

Board.prototype.getField = function (coords) {
    var x = coords[0],
        y = coords[1];
        
    return this.fields[y] ? this.fields[y][x] : null;
};

Board.prototype.getBaseFreeField = function (color) {
	var base = this.bases[color];
	return base.getFreeField();
};
