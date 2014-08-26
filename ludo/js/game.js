var AI_LEVEL = {
	difficult: 'difficult',
	medium:    'medium',
	easy:      'easy',
};

var GAME_STATUS = {
	WAIT_FOR_CONNECTION: 'wait_for_connection',
	WAIT_FOR_READY:      'wait_for_ready',
	WAIT_FOR_DICE:       'wait_for_rolling_dice',
	WAIT_FOR_PAWN:       'wait_for_moving_pawn',
	RESET:               'reset',
	GAME_OVER:           'game_over',
};

	/* CSS are hard coded following these colors*/
var RED = 'red',
    GREEN = 'green',
    YELLOW = 'yellow',
    BLUE = 'blue';

var ACTION = {
	NONE       : "none",

	OUTOFBASE  : "outOfBase",
	NORMAL     : "move",

	JUMP       : "jump",
	FLIGHT     : "flight",
	ARRIVE     : "arrive",

	KILL       : "kill",
	FALL       : "fall",
	RESET      : "reset",
	TURNRIGHT  : "turnright",
};

function Game() {
	this.board = null;
	this.current = -1;
	this.players = [];
	this.playersColorIndex = {};
	this.playerList = null;

	this.USER_OP_TIMEOUT = 20;
	this.countDown = this.USER_OP_TIMEOUT;
	this.countDownPlayer = null;

	this.proto = new LudoProtocol();

	this.level = AI_LEVEL.medium;

	this.numDone = 0;
	this.num_user = 0;
	this.users = {};

	this.user_computer =
		new User(User.TYPE.COMPUTER, User.READY);
	this.user_unavailable =
		new User(User.TYPE.UNAVAILABLE, User.UNREADY);
	this.user_nobody =
		new User(User.TYPE.NOBODY, User.UNREADY);

	this.user_host = null;

	ua = navigator.userAgent.toLowerCase();
	console.log(ua);
	if (ua.indexOf('windows') >= 0) {
		this.isChromeCast = false;
	} else {
		this.isChromeCast = true;
	}

	// UI element
	this.uiWelcome = $('#welcome');
	this.uiContent = $('#content');

	// for test only
	this.user_test = null;
	this.pickupIndex = 0;
}

Game.prototype = {
	showUI_waitForConnection: function () {
		this.uiWelcome.show();
		this.uiContent.hide();
	},

	showUI_waitForStartOfGame: function() {
		this.uiWelcome.hide();
		this.uiContent.show();
	},

	waitForStartOfGame: function() {
		if (this.stat === GAME_STATUS.WAIT_FOR_READY)
			return;
		this.stat = GAME_STATUS.WAIT_FOR_READY;
		this.showUI_waitForStartOfGame();
	},

	getCurrentPlayer : function () {
		return this.players[this.current];
	},
	getPlayerFromIndex : function (index) {
		return this.players[index] || null;
	},
	getPlayerFromColor : function (color) {
		return this.playersColorIndex[color] || null;
	},

    playAward : function () {
        this.board.dice.focus();

		var player = this.getCurrentPlayer();
		var user = player.getUser();

		if (user.type === User.TYPE.HUMAN &&
				player.getTimeOutStat() === false)
			player.startCountDown(autoActionForRollDice);

        this.stat = GAME_STATUS.WAIT_FOR_DICE;
    },

    nextPlayer : function () {
        var next = this.current,
            i = 0;

        if (this.numDone == 4) {
            this.getCurrentPlayer().blur();
			this.board.hideArrow();
            console.log('all players are done, need to restart the game');
			this.stat = GAME_STATUS.GAME_OVER;
			this.proto.broadcastEndOfGame();
            return;
        }

        while (this.players[i]) {
            this.players[i].blur();
            i++;
        }

		var c, user;
		for (c in this.users) {
			user = this.users[c];
			if (user.isDisconnected)
				this.doDisconnect(user);
		}

        i = 0;
        while (i < 4) {
            if (next == 3) {
                next = 0;
            } else {
                next++;
            }
			user = this.players[next].getUser();
			if (user.type === User.TYPE.UNAVAILABLE ||
					user.type === User.TYPE.NOBODY) {
				console.log("skip player-" + this.players[next].color +
						' user_type:' + user.type);
				i++;
				continue;
			}
            if (this.players[next].numArrived == 4) {
				console.log("skip finished player-" + this.players[next].color);
                i++;
                continue;
            }
            break;
        }

		var player = this.getCurrentPlayer();
		if (player && player.getUser().type === User.TYPE.HUMAN)
			player.setTimeOutStat(false);

		var next_player = this.getPlayerFromIndex(next);
		if (next_player.getUser().type === User.TYPE.HUMAN) {
			game.countDownPlayer = next_player;
			next_player.setTimeOutStat(false);
		} else {
			game.countDownPlayer = null;
		}

        if (player)
            console.log("player switch from " +
				this.getCurrentPlayer().color + " " +
				"to " + next_player.color);
        else
            console.log("player " + next_player.color + " starts");
        this.current = next;

		this.board.showArrow(this.getCurrentPlayer().color);
        //game.players[game.current].focus();
        this.board.dice.focus();
        this.board.dice.setPlayer(this.getCurrentPlayer());

		this.countDown = this.USER_OP_TIMEOUT;
		console.log("init countDown=" + this.countDown);

		if (next_player.getUser().type === User.TYPE.HUMAN)
			next_player.startCountDown(autoActionForRollDice);

        this.stat = GAME_STATUS.WAIT_FOR_DICE;
    },

	addPlayer: function (name, color, user) {
    	var player = new Player(name, color, this.board);

        this.players.push(player);
		this.playersColorIndex[color] = player;

        // todo convert to component with focus indicator etc.
		var inner = '<div class="icon"></div>';
        this.playerList.append(
            '<li id="li-' + color + '" class="player player-' + color + '">' + inner + '</li>'
        );

        player.setUser(user);
    },

    addUser: function (user) {
		if (this.users[user.senderID]) {
			console.error("error: user " + user.senderID + " already added");
			return {val: false, detail: "already added"};
		}
		if (this.num_user == 4) {
			console.error("error: already 4 users");
			return {val: false, detail: "exceed maximum connections"};
		}
		this.users[user.senderID] = user;
		this.num_user++;
		if (this.num_user == 1) {
			user.ishost = true;
			this.user_host = user;
			console.log("user " + user.name + " is chosen to be the host");
		}
		return {val: true, detail: ""};
	},

	getUserFromSenderID : function (senderID) {
		return this.users[senderID] || null;
	},

	doDisconnect: function(user) {
		var c, p;
		var notify={}, player_status={};

		if (user.isUnderDisconnection === true)
			return;
		user.isUnderDisconnection = true;

		for (c in user.players) {
			p = user.players[c];
			p.setUser(this.user_nobody);
			//p.reset();

			notify.command = LudoProtocol.COMMAND.pickup + '_notify';
			player_status.color     = p.color;
			player_status.user_type = p.getUser().type;
			player_status.isready   = p.getUser().isready;
			player_status.username  = p.getUser().name;
			notify.player_status = player_status;

			this.proto.broadcast(notify);
		}

		delete this.users[user.senderID];
		this.num_user--;

		if (this.user_host === user) {
			var new_host = null;
			for (var id in this.users) {
				new_host = this.users[id];
				new_host.ishost = true;
				break;
			}
			this.user_host = new_host;
		}

		if (this.num_user === 0) {
			this.doReset();
			return;
		}
	},

	onDisconnect: function(senderId) {
		var user = this.users[senderId];
		if (user === undefined) {
			console.log('user senderId:' + senderId + ' is not connected');
			return;
		}
		console.log('senderId:' + senderId + 'name:' + user.name + ' disconnected');
		user.isDisconnected = true;
		// TODO update player name in the list
	},

	isReady: function() {
		var i = 0, p, u;
		while (p = game.players[i]) {
			u = p.getUser();
			if (u.type == User.TYPE.NOBODY) {
				console.log('player ' + p.color +
						' is not allocated a user do NOT start game');
				return false;
			}
			if (u.type == User.TYPE.HUMAN && u.isready == false) {
				console.log('player ' + p.color + ' user ' + u.name +
						' is not ready, do NOT start game');
				return false;
			}
			i++;
		}
		return true;
	},

	start: function() {
		// pickup a player
		this.nextPlayer();

		if (this.stat !== GAME_STATUS.WAIT_FOR_DICE)
			return;

		var player = this.getCurrentPlayer();
		var user = player.getUser();

		if (user.type === User.TYPE.COMPUTER)
			this.board.dice.roll(rollDoneHandler,
					rollDoneHandler_outofbusy);
	},

	doReset: function() {
		// arrow
		this.board.resetArrow();

		// dice
		this.board.dice.busy = false;
		this.board.dice.blur();

		if (this.countDownPlayer) {
			this.countDownPlayer.stopCountDown();
			this.board.hideCountDown();
		}

		// player and pawns
		var i = 0;
		while (p = this.players[i]) {
			p.reset();
			i++;
		}
		this.current = -1;
		this.numDone = 0;

		// user
		for (var e in this.users) {
			var u = this.users[e];
			if (u.type === User.TYPE.HUMAN)
				u.isready = false;
		}
	},

	reset: function() {
		if (this.stat !== GAME_STATUS.WAIT_FOR_DICE &&
				this.stat !== GAME_STATUS.WAIT_FOR_PAWN &&
				this.stat !== GAME_STATUS.GAME_OVER)
			return;
		this.stat = GAME_STATUS.RESET;

		if (this.getCurrentPlayer().isMoving)
			return;

		this.doReset();
		this.stat = GAME_STATUS.WAIT_FOR_READY;
	},
}; // end of game.prototype


(function (global) {
	function initChromecast() {
		if (game.isChromeCast === false) {
			console.log('skip chromecast initialization');
			return;
		}

        console.log('init chrome cast handler');
        cast.receiver.logger.setLevelValue(0);
        game.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
        console.log('Starting Receiver Manager');

        // handler for the 'ready' event
        game.castReceiverManager.onReady = function(event) {
          console.log('Received Ready event: ' + JSON.stringify(event.data));
          game.castReceiverManager.setApplicationState("Application status is ready...");
        };

        // handler for 'senderconnected' event
        game.castReceiverManager.onSenderConnected = function(event) {
          console.log('Received Sender Connected event: ' + event.data);
          console.log(game.castReceiverManager.getSender(event.data).userAgent);
        };

        // handler for 'senderdisconnected' event
        game.castReceiverManager.onSenderDisconnected = function(event) {
          console.log('Received Sender Disconnected event: ' + event.data +
				  ' from ' + event.senderId);
		  game.onDisconnect(event.senderId);
          if (game.castReceiverManager.getSenders().length == 0) {
            window.close();
          }
        };

        // handler for 'systemvolumechanged' event
        game.castReceiverManager.onSystemVolumeChanged = function(event) {
          console.log('Received System Volume Changed event: ' + event.data['level'] + ' ' +
              event.data['muted']);
        };

        // create a CastMessageBus to handle messages for a custom namespace
        game.messageBus =
          game.castReceiverManager.getCastMessageBus(
              'urn:x-cast:com.google.cast.sample.helloworld');

        // handler for the CastMessageBus message event
        game.messageBus.onMessage = function(event) {
          console.log('Message [' + event.senderId + ']: ' + event.data);
          // display the message from the sender
          //displayText(event.data);
          // inform all senders on the CastMessageBus of the incoming message event
          // sender message listener will be invoked
          //game.messageBus.send(event.senderId, event.data+"_test");

          var msg = event.data;
          console.log("onMessage msg.command=" + msg.command);
          console.log("onMessage msg.COMMAND=" + msg.COMMAND);
          handlemsg(event.senderId, event.data);
        }

        // initialize the CastReceiverManager with an application status message
        game.castReceiverManager.start({statusText: "Application is starting"});
        console.log('Receiver Manager started');
	};

    function onload() {
		var game = new Game();

		global.game = game;
        game.playerList = $('#players-list');

        console.log('init game');

        game.board = new BoardSTD('board');
        game.board.dice = new Dice('content');

        game.addPlayer('Player 1', RED,    game.user_nobody);
        game.addPlayer('Player 2', GREEN,  game.user_nobody);
        game.addPlayer('Player 3', YELLOW, game.user_nobody);
        game.addPlayer('Player 4', BLUE,   game.user_nobody);

        game.stat = GAME_STATUS.WAIT_FOR_CONNECTION;

		initChromecast();

		game.showUI_waitForConnection();
    }

	function autoActionForRollDice() {
		var player = game.countDownPlayer;
		if (!player)
			return;

		if (game.stat !== GAME_STATUS.WAIT_FOR_DICE ||
				game.board.dice.busy === true)
			return;

		var user = player.getUser();
		if (user.isDisconnected) {
			game.doDisconnect(user);
			return;
		}

		game.countDown--;
		game.board.showCountDown(game.countDown, player.color);

		if (game.countDown === 0) {
			player.setTimeOutStat(true);
			game.board.dice.roll(rollDoneHandler,
					rollDoneHandler_outofbusy);
		}
	}

	function autoActionForMovePawn() {
		var player = game.countDownPlayer;
		if (!player)
			return;

		if ((game.stat !== GAME_STATUS.WAIT_FOR_DICE &&
				game.stat !== GAME_STATUS.WAIT_FOR_PAWN) ||
				game.board.dice.busy === true ||
				player.isMoving === true)
			return;

		var user = player.getUser();
		if (user.isDisconnected) {
			game.doDisconnect(user);
			return;
		}

		game.countDown--;
		game.board.showCountDown(game.countDown, player.color);

		if (game.countDown === 0) {
			player.setTimeOutStat(true);
			if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
				game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
			} else if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
				player.selectPawnAndMove(game.board.dice.getValue());
			}
		}
	}

    function rollDoneHandler(newValue) {
        var player = game.getCurrentPlayer();

		if (!player)
			return;

        console.log('rollDoneHandler inbusy: currentPlayer=' + player.color +
				' dice=' + newValue);

        if ((game.board.getBaseFreeField(player.color) === null) &&
                (newValue !== 6)) {
            game.nextPlayer();
        } else {
			var user = player.getUser();
			if (user.type === User.TYPE.HUMAN &&
					player.getTimeOutStat() === false)
				player.startCountDown(autoActionForMovePawn);

			// TODO: select a pawn before focus the player
            player.focus();
            game.stat = GAME_STATUS.WAIT_FOR_PAWN;
        }
    }
	function rollDoneHandler_outofbusy(diceValue) {
        var player = game.getCurrentPlayer();

		if (!player)
			return;

		var user = player.getUser();

        console.log('rollDoneHandler_outofbusy: currentPlayer=' + player.color +
				' dice=' + diceValue);

		if (user.type !== User.TYPE.COMPUTER &&
				player.getTimeOutStat() === false)
			return;

		if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
            game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
		} else if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
			player.selectPawnAndMove(diceValue);
		}
	};

    function handlemsg_prehistoric(channel, msg) {
        var player = game.getCurrentPlayer();

        if (msg === 'join') {
            var i = game.pickupIndex;
            if (i <= 1) {
                game.players[2*i].channel = channel;
                game.players[2*i+1].channel = channel;
                console.log('player ' + 2*i + ' and ' + 2*i+1 +
                    ' are allocated to channel ' + channel);
                i++;
                game.pickupIndex = i;
            } else {
                console.log('no more players could be allocated');
            }
            return;
        }

		if (!player) {
			console.log("handlemsg_prehistoric no current player, game.stat=" +
					game.stat);
			return;
		}

		var currentChannel = player.getUser().senderID;
        if (currentChannel != channel) {
            console.log("" + channel + ", it's not your turn, but for " +
					currentChannel);
            return;
        }

		if (player.getTimeOutStat() === true) {
			console.log("player-"+player.color + " timed out, ignore user op");
			return;
		}

        if (msg === 'click') {
            if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
                game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
            } else if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
                player.move(game.board.dice.getValue(),
						player.getCurrentPawn());
            }
        } else if (msg === 'next') {
            if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
                player.nextPawn();
            }
        } else if (msg === 'prev') {
            if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
                player.prevPawn();
            }
        }
    }

    function handlemsg(channel, msg) {
        console.log("'" + msg +
			"' received in handlemsg from channel " + channel);

        if (typeof msg === "string") {
            var msgObj = null;
            try {
                var msgObj = JSON.parse(msg);
                game.proto.parseMsg(channel, msgObj);
            } catch(err) {
                console.log('not a json string, try prehistoric way');
                handlemsg_prehistoric(channel, msg);
            }
        } else if (typeof msg === "object") {
            game.proto.parseMsg(channel, msg);
        } else {
        	console.log("not supported 'typeof msg': " + typeof msg);
        }
    }

    document.onkeydown = function(event) {
        if (event.keyCode === 13 /*'enter'*/) {
			console.log('key Enter pressed!');
            handlemsg(game.testChannel, 'click');
			//handlemsg(0, '{"command":"connect","MAGIC":"ONLINE","username":"alice","prot_version":1}');
        } else if (event.keyCode === 37 /*left*/) {
			console.log('key Left/prev-pawn pressed!');
            handlemsg(game.testChannel, 'prev');
        } else if (event.keyCode === 39 /*right*/) {
			console.log('key Right/next-pawn pressed!');
            handlemsg(game.testChannel, 'next');
        } else if (event.keyCode === 65 /*'a'*/) {
			console.log('key Ai pressed!');
			if (typeof computer_kicked_off !== 'undefined') {
				console.log("computer battle already started");
				return;
			}
			console.log("computer battle starts");
			computer_kicked_off = true;

			game.playersColorIndex[RED].setUser(game.user_computer);
			game.playersColorIndex[GREEN].setUser(game.user_computer);
			game.playersColorIndex[YELLOW].setUser(game.user_computer);
			game.playersColorIndex[BLUE].setUser(game.user_computer);

            game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
        } else if (event.keyCode === 85 /*'u'*/) {
			console.log('key User pressed!');
			if (game.user_test)
				return;
			game.testChannel = "keyboard";
			game.user_test =
				new User(User.TYPE.HUMAN, User.READY, "test",
						game.testChannel);
			game.playersColorIndex[RED].setUser(game.user_test);
			game.playersColorIndex[GREEN].setUser(game.user_computer);
			game.playersColorIndex[YELLOW].setUser(game.user_unavailable);
			game.playersColorIndex[BLUE].setUser(game.user_computer);
		} else if (event.keyCode === 67 /* 'c' connect*/) {
			console.log('key Connect pressed!');
			if (game.num_user !== 0) {
				console.log('host already connected, nothing to do');
				return;
			}
			game.testChannel = "keyboard";
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"connect", "username":"test"}');
		} else if (event.keyCode === 80 /* 'p'*/) {
			console.log('key Pickup pressed!');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"red", "user_type":"human"}');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"green", "user_type":"human"}');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"yellow", "user_type":"human"}');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"pickup", "color":"blue", "user_type":"human"}');
		} else if (event.keyCode === 82 /* 'r' getready*/) {
			console.log('key getReady pressed!');
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"getready"}');
		} else if (event.keyCode === 68 /* 'd' disconnect*/) {
			console.log('key Disconnect pressed!');
			game.testChannel = "keyboard";
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"disconnect"}');
		} else if (event.keyCode === 83 /* 's' reSet*/) {
			console.log('key reSet pressed!');
			game.testChannel = "keyboard";
			handlemsg(game.testChannel,
				'{"MAGIC":"ONLINE", "prot_version":1, "command":"reset"}');
		} else {
			console.log('key ' + event.keyCode + ' pressed, ignore!');
		}
    }

    global.addEventListener('load', function () {
        onload();
    });

	//TODO export as less as possible
	global.rollDoneHandler = rollDoneHandler;
	global.rollDoneHandler_outofbusy = rollDoneHandler_outofbusy;
	global.autoActionForMovePawn = autoActionForMovePawn;
	global.autoActionForRollDice = autoActionForRollDice;
}(this));
