// Anonymous namespace
(function(global) {

'use strict';

User.READY = true;
User.UNREADY = false;
User.TYPE = {
        	UNAVAILABLE: 'unavailabe',
        	NOBODY: 'nobody',
        	HUMAN: 'human',
        	COMPUTER: 'computer',
        };

function User(type, isready, name, senderID) {
	this.type = type;
	this.isready = isready;
	if (type == User.TYPE.UNAVAILABLE) {
        name = "N/A";
		senderID = undefined;
	} else if (type == User.TYPE.COMPUTER)
        senderID = name = "AI";
    else if (type == User.TYPE.NOBODY) {
		name = "Nobody";
		senderID = undefined;
	}

	this.name = name;
	this.senderID = senderID;
	this.ishost = false;
};

User.checkUserType = function (type) {
	if (type == User.TYPE.COMPUTER ||
			type == User.TYPE.UNAVAILABLE ||
			type == User.TYPE.HUMAN ||
			type == User.TYPE.NOBODY)
		return true;
	return false;
};

User.prototype.setready = function() {
	this.isready = true;
};

global.User = User;
})(this);
