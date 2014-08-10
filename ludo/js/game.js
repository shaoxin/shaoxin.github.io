(function (global) {
    var AI_LEVEL = {
		    difficult: 'difficult',
            medium:    'medium',
            easy:      'easy',
	    },
        game = {
            board: null,
            current: -1,
            players: [],
            playersColorIndex: {},
            playerList: null,
            pickupIndex: 0,
            proto: null,

            level: AI_LEVEL.medium,
            user_computer: null,
            user_nobody: null,
            user_unavailable: null,
            user_host: null,
            user_test: null,
            num_user: 0,
            users: {},

        },

        GAME_STATUS = {
          WAIT_FOR_CONNECTION: 'wait_for_connection',
          WAIT_FOR_DICE: 'wait_for_rolling_dice',
          WAIT_FOR_PAWN: 'wait_for_moving_pawn'
        },
		/* CSS are hard coded following these colors*/
        RED = 'red',
        GREEN = 'green',
        YELLOW = 'yellow',
        BLUE = 'blue';

    function playAward() {
        game.board.dice.focus();
        game.board.dice.showHint();
        game.stat = GAME_STATUS.WAIT_FOR_DICE;
    }

	function getCurrentPlayer() {
		return game.players[game.current];
	}
	function getPlayerFromIndex(index) {
		return game.players[index] || null;
	}
	function getPlayerFromColor(color) {
		return game.playersColorIndex[color] || null;
	}

    function nextPlayer() {
        var next = game.current,
            arrow = $('.arrow'),
            i = 0;

        if (game.numDone == 4) {
            getCurrentPlayer.blur();
            console.log('all players are done, need to restart the game');
            return;
        }

        while (game.players[i]) {
            game.players[i].blur();
            i++;
        }

        arrow.removeClass('arrow-' + game.current);
        i = 0;
        while (i < 4) {
            if (next == 3) {
                next = 0;
            } else {
                next++;
            }
			if (game.players[next].getUser().type == User.TYPE.UNAVAILABLE) {
				console.log("skip unavailable player-" + game.players[next].color);
				i++;
				continue;
			}
            if (game.players[next].numArrived == 4) {
				console.log("skip finished player-" + game.players[next].color);
                i++;
                continue;
            }
            break;
        }
        if (game.current >= 0)
            console.log("player switch from " + getCurrentPlayer().color +
                " to " + getPlayerFromIndex(next).color);
        else
            console.log("player " + getPlayerFromIndex(next).color + " starts");
        game.current = next > 3 ? 0 : next;
        arrow.addClass('arrow-' + game.current);
        //game.players[game.current].focus();
        game.board.dice.focus();
        game.board.dice.showHint();
        game.board.dice.setPlayer(getCurrentPlayer());
        game.stat = GAME_STATUS.WAIT_FOR_DICE;
    }

    function addPlayer(name, color, user) {
    	var player = new Player(name, color, game.board);

        game.players.push(player);
		game.playersColorIndex[color] = player;

        // todo convert to component with focus indicator etc.
		var inner = '<div class="icon"></div>';
        game.playerList.append(
            '<li id="li-' + color + '" class="player player-' + color + '">' + inner + '</li>'
        );

        player.setUser(user);

    }
    function addUser(user) {
		if (game.users[user.senderID]) {
			console.error("error: user " + user.senderID + " already added");
			return {val: false, detail: "already added"};
		}
		if (game.num_user == 4) {
			console.error("error: already 4 users");
			return {val: false, detail: "exceed maximum connections"};
		}
		game.users[user.senderID] = user;
		game.num_user++;
		if (game.num_user == 1) {
			user.ishost = true;
			game.user_host = user;
			console.log("user " + user.name + " is chosen to be the host");
		}
		return {val: true, detail: ""};
	};
	function getUserFromSenderID(senderID) {
		return game.users[senderID] || null;
	};

    function onload() {
        //todo remove
        global.game = game;
        global.nextPlayer = nextPlayer;
        global.playAward = playAward;
        global.rollDoneHandler = rollDoneHandler;
		global.rollDoneHandler_outofbusy = rollDoneHandler_outofbusy;

		global.GAME_STATUS = GAME_STATUS;
		global.RED = RED;
		global.GREEN = GREEN;
		global.YELLOW = YELLOW;
		global.BLUE = BLUE;

		game.getCurrentPlayer = getCurrentPlayer;
		game.getPlayerFromColor = getPlayerFromColor;
		game.getPlayerFromIndex = getPlayerFromIndex;
		game.addUser = addUser;
		game.getUserFromSenderID = getUserFromSenderID;

		game.numDone = 0;
        game.playerList = $('#players-list');

        console.log(navigator.userAgent.toLowerCase());
        console.log('init game');

        game.proto = new LudoProtocol();
        game.board = new Board('board');
        game.board.dice = new Dice('content');

        game.users = {};
        game.user_unavailable =
			new User(User.TYPE.UNAVAILABLE, User.UNREADY);
        game.user_nobody =
			new User(User.TYPE.NOBODY, User.UNREADY);
        game.user_computer =
			new User(User.TYPE.COMPUTER, User.READY);

        addPlayer('Player 1', RED,    game.user_nobody);
        addPlayer('Player 2', GREEN,  game.user_nobody);
        addPlayer('Player 3', YELLOW, game.user_nobody);
        addPlayer('Player 4', BLUE,   game.user_nobody);

        game.status = GAME_STATUS.WAIT_FOR_CONNECTION;
        nextPlayer();

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
          console.log('Received Sender Disconnected event: ' + event.data);
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


        // initialize the CastReceiverManager with an application status message
        game.castReceiverManager.start({statusText: "Application is starting"});
        console.log('Receiver Manager started');

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

    }

    function rollDoneHandler(newValue) {
        var player = getCurrentPlayer();

        console.log('rollDoneHandler inbusy: currentPlayer=' + player.color +
				' dice=' + newValue);

        if ((game.board.getBaseFreeField(player.color) === null) &&
                (newValue !== 6)) {
            nextPlayer();
        } else {
			// TODO: select a pawn before focus the player
            getCurrentPlayer().focus();
            game.stat = GAME_STATUS.WAIT_FOR_PAWN;
        }
    }
	function rollDoneHandler_outofbusy(diceValue) {
        var player = getCurrentPlayer();
		var user = player.getUser();

        console.log('rollDoneHandler postbusy: currentPlayer=' + player.color +
				' dice=' + diceValue);

		if (user.type != User.TYPE.COMPUTER) {
			return;
		}
		if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
            game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
		} else if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
			player.selectPawnAndMove(diceValue);
		}
	};

    function handlemsg_prehistoric(channel, msg) {
        var player = getCurrentPlayer();
        var pawn = player.getCurrentPawn();

        console.log("'" + msg +
			"' received in handlemsg from channel " + channel);

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

		var currentChannel = player.getUser().senderID;
        if (currentChannel != channel) {
            console.log("" + channel + ", it's not your turn, but for " +
					currentChannel);
            return;
        }

        if (msg === 'click') {
            if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
                game.board.dice.roll(rollDoneHandler,
						rollDoneHandler_outofbusy);
            } else if (game.stat === GAME_STATUS.WAIT_FOR_PAWN) {
                player.move(game.board.dice.getValue(), pawn);
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
                var msgObj = $.parseJSON(msg);
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
        console.log('key ' + event.keyCode + ' pressed!');
        if (event.keyCode === 13) {
            handlemsg(game.testChannel, 'click');
			//handlemsg(0, '{"command":"connect","MAGIC":"ONLINE","username":"alice","prot_version":1}');
        } else if (event.keyCode === 37) {
            handlemsg(game.testChannel, 'prev');
        } else if (event.keyCode === 39) {
            handlemsg(game.testChannel, 'next');
        } else if (event.keyCode === 67 /*'c'*/) {
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
			if (game.user_test)
				return;
			game.testChannel = "testChannel";
			game.user_test =
				new User(User.TYPE.HUMAN, User.READY, "test",
						game.testChannel);
			game.playersColorIndex[RED].setUser(game.user_test);
			game.playersColorIndex[GREEN].setUser(game.user_computer);
			game.playersColorIndex[YELLOW].setUser(game.user_unavailable);
			game.playersColorIndex[BLUE].setUser(game.user_computer);
		}
    }

    global.addEventListener('load', function () {
        onload();
    });
}(this));
