var User = function (type, isready, senderID, name) {
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

User.prototype.setready = function() {
	this.isready = true;
};

User.TYPE = {
        	UNAVAILABLE: 'unavailabe',
        	NOBODY: 'nobody',
        	HUMAN: 'human',
        	COMPUTER: 'computer',
        };

User.READY = true;
User.UNREADY = false;
