var Board = function (id) {
    this.$elem = $('#' + id);
	this.arrow = $('.arrow');
	this.arrowColor = undefined;
    
    if (!this.$elem.length) {
        this.$elem = $('<div/>');
        this.$elem[0].id = id;
        $('#content').append(this.$elem);
    }

	this.pawnPixels = 50;
    
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

Board.prototype.showCountDown = function(count) {
	console.log("showCountDown: " + count);
};

Board.prototype.resetArrow = function() {
	this.arrow.hide();
	this.arrow.removeClass('arrow-' + this.arrowColor);
	this.arrowColor = undefined;
};

Board.prototype.hideArrow = function() {
	this.arrow.hide();
	this.arrow.removeClass('arrow-' + this.arrowColor);
};

Board.prototype.showArrow = function(color) {
	if (color !== this.arrowColor) {
		this.arrow.hide();
		this.arrow.removeClass('arrow-' + this.arrowColor);
		this.arrowColor = color;
		this.arrow.addClass('arrow-' + this.arrowColor);
	}
	this.arrow.show();
};

Board.prototype.updatePlayerList = function(color, name) {
	var e = $('#li-' + color);
	e.html('<div class="icon"></div>' + name);
};

Board.prototype.getPawnClass = function(color, pawnIndex) {
	return 'pawn pawn-'+color + ' pawn-'+pawnIndex;
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

Board.prototype.getArrivePosition = function () {
	return 44;
};

Board.prototype.getJUMPdelta = function(field) {
	return 0;
};

Board.prototype.getFLIGHTdelta = function(field) {
	return 0;
};

Board.prototype.initBases = function() {
	this.bases = {};
	this.bases[RED]    = new Base('start', RED, this,
			[[0, 9], [1, 9],  [0, 10], [1, 10]]);
	this.bases[GREEN]  = new Base('start', GREEN, this,
			[[0, 0], [1, 0],  [0, 1],  [1, 1]]);
	this.bases[YELLOW] = new Base('start', YELLOW, this,
			[[9, 0], [10, 0], [9, 1],  [10, 1]]);
	this.bases[BLUE]   = new Base('start', BLUE, this,
			[[9, 9], [10, 9], [9, 10], [10, 10]]);
};

Board.prototype.initDestinations = function() {
	this.dests = {};
	this.dests[RED]    = new Base('end', RED, this,
			[[5, 9], [5, 8], [5, 7], [5, 6], [5, 5], [5, 6], [5, 7], [5, 8], [5, 9], [5, 10]]);
	this.dests[GREEN]  = new Base('end', GREEN, this,
			[[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5]]);
	this.dests[YELLOW] = new Base('end', YELLOW, this,
			[[5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 4], [5, 3], [5, 2], [5, 1], [5, 0]]);
	this.dests[BLUE]   = new Base('end', BLUE, this,
			[[9, 5], [8, 5], [7, 5], [6, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5]]);
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
			var f = new Field(x, y, undefined,
					ACTION.NORMAL,
					x*this.pawnPixels+25,
					y*this.pawnPixels+25,
					0, 0, 0, 0);
            this.fields[y].push(f);
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
