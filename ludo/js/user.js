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

function User(type, isready, senderID, name) {
	this.type = type;
	this.isready = isready;
	if (name === undefined) {
		this.name = "";
	} else {
		this.name = name;
	}
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
