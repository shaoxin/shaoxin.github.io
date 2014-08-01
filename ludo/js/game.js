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
            num_user: 0,
            users: {},

        },

        GAME_STATUS = {
          WAIT_FOR_CONNECTION: 'wait_for_connection',
          WAIT_FOR_DICE: 'wait_for_rolling_dice',
          WAIT_FOR_PAWN: 'wait_for_moving_pawn'
        },
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
            log('all players are done, need to restart the game');
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
            if (game.players[next].numArrived == 4) {
                i++;
                continue;
            } else {
                break;
            }
        }
        if (game.current >= 0)
            log("player switch from " + getCurrentPlayer().color +
                " to " + getPlayerFromIndex(next).color);
        else
            log("player " + getPlayerFromIndex(next).color + " starts");
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
		if (game.users[user.senderID] == undefined) {
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
			console.log("user is chosen to be the host");
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

		game.addUser = addUser;
		game.getUserFromSenderID = getUserFromSenderID;

		game.numDone = 0;
        game.playerList = $('#players-list');

        log(navigator.userAgent.toLowerCase());
        log('init game');

        game.proto = new LudoProtocol();
        game.board = new Board('board');
        game.board.dice = new Dice('content');

        game.users = {};
        game.user_unavailable =
			new User(User.TYPE.UNAVAILABLE, User.UNREADY, 'N/A');
        game.user_nobody =
			new User(User.TYPE.NOBODY, User.UNREADY, 'Nobody');
        game.user_computer =
			new User(User.TYPE.COMPUTER, User.READY, 'AI');

        addPlayer('Player 1', RED,    game.user_nobody);
        addPlayer('Player 2', GREEN,  game.user_nobody);
        addPlayer('Player 3', YELLOW, game.user_nobody);
        addPlayer('Player 4', BLUE,   game.user_nobody);

        game.status = GAME_STATUS.WAIT_FOR_CONNECTION;
        nextPlayer();

        log('init chrome cast handler');
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
          game.messageBus.send(event.senderId, event.data+"_test");

          var msg = event.data;
          console.log("onMessage msg.command=" + msg.command);
          console.log("onMessage msg.COMMAND=" + msg.COMMAND);
          handlemsg(event.senderId, event.data);
        }

    }

    function rollDoneHandler(newValue) {
        var player = getCurrentPlayer();

        log('rollDoneHandler: currentPlayer=' + player.color + ' dice=' + newValue);

        if ((player.start.getFreeField() === null) &&
                (newValue !== 6)) {
            nextPlayer();
        } else {
            getCurrentPlayer().focus();
            game.stat = GAME_STATUS.WAIT_FOR_PAWN;
        }
    }

    function handlemsg_prehistoric(channel, msg) {
        var player = getCurrentPlayer();
        var pawn = player.getCurrentPawn();

        log("'" + msg + "' received in handlemsg from channel " + channel);

        if (msg === 'join') {
            var i = game.pickupIndex;
            if (i <= 1) {
                game.players[2*i].channel = channel;
                game.players[2*i+1].channel = channel;
                log('player ' + 2*i + ' and ' + 2*i+1 +
                    ' are allocated to channel ' + channel);
                i++;
                game.pickupIndex = i;
            } else {
                log('no more players could be allocated');
            }
            return;
        }

        if (player.channel != channel) {
            log("" + channel + ", it's not your turn, but for " + player.channel);
            return;
        }

        if (msg === 'click') {
            if (game.stat === GAME_STATUS.WAIT_FOR_DICE) {
                game.board.dice.roll(rollDoneHandler);
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
        log("'" + msg + "' received in handlemsg from channel " + channel);

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
        log('key ' + event.keyCode + ' pressed!');
        if (event.keyCode === 13) {
            handlemsg(0, 'click');
			handlemsg(0, '{"command":"connect","MAGIC":"ONLINE","username":"alice","prot_version":1}');
        } else if (event.keyCode === 37) {
            handlemsg(0, 'prev');
        } else if (event.keyCode === 39) {
            handlemsg(0, 'next');
        }
    }

    global.addEventListener('load', function () {
        onload();
    });
}(this));
