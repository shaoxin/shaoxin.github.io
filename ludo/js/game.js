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
        RED = 2,
        GREEN = 3,
        YELLOW = 4,
        BLUE = 5;

    function playAward() {
        game.board.dice.focus();
        game.board.dice.showHint();
        game.stat = GAME_STATUS.WAIT_FOR_DICE;
    }

    function nextPlayer() {
        var next = game.current,
            arrow = $('.arrow'),
            i = 0;

        if (game.numDone == 4) {
            game.players[game.current].blur();
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
            log("player switch from " + game.players[game.current].color +
                " to " + game.players[next].color);
        else
            log("player " + game.players[next].color + " starts");
        game.current = next > 3 ? 0 : next;
        arrow.addClass('arrow-' + game.current);
        //game.players[game.current].focus();
        game.board.dice.focus();
        game.board.dice.showHint();
        game.board.dice.setPlayer(game.current + 2);
        game.stat = GAME_STATUS.WAIT_FOR_DICE;
    }

    function addPlayer(name, color) {
    	var player = new Player(name, color, game.board);

        player.setUser(game.user_computer);

        game.players.push(player);

        // todo convert to component with focus indicator etc.
        game.playerList.append(
            '<li class="player player-' + color + '"><div class="icon"></div>' + name + '</li>'
        );
    }
    function addUser(user) {
		game.users[user.senderID] = user;
		game.num_user++;
		if (game.num_user == 1) {
			user.ishost = true;
			game.user_host = user;
		}
	};

    function init() {
        //todo remove
        global.game = game;
        global.nextPlayer = nextPlayer;
        global.playAward = playAward;
        global.rollDoneHandler = rollDoneHandler;

		game.addUser = addUser;
		game.numDone = 0;
        game.playerList = $('#players-list');

        log(navigator.userAgent.toLowerCase());
        log('init game');

        game.proto = new LudoProtocol();
        game.board = new Board('board');
        game.board.dice = new Dice('content');

        game.users = {};
        game.user_unavailable = new User(User.TYPE.UNAVAILABLE);
        game.user_nobody      = new User(User.TYPE.NOBODY);
        game.user_computer    = new User(User.TYPE.COMPUTER, User.READY);

        addPlayer('Player 1', RED);
        addPlayer('Player 2', GREEN);
        addPlayer('Player 3', YELLOW);
        addPlayer('Player 4', BLUE);

        game.status = GAME_STATUS.WAIT_FOR_CONNECTION;
        nextPlayer();

        str = '{"magic": "ONLINE", "prot_version": 1, "command": "connect"}';
        //str = '{ "name": "strong", "header": {"age": 16 } }';
        log(typeof(str));
        js  = $.parseJSON(str);
        log(typeof js);
        log(js.magic);
		log(JSON.stringify(js));

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
          game.messageBus.send(event.senderId, event.data);

          var msg = event.data;
          console.log("onMessage msg.command=" + msg.command);
          console.log("onMessage msg.COMMAND=" + msg.COMMAND);
          handlemsg(event.senderId, event.data);
        }

    }

    function rollDoneHandler(newValue) {
        var player = game.players[game.current];

        log('rollDoneHandler: currentPlayer=' + player.color + ' dice=' + newValue);

        game.board.dice.blur();
        game.board.dice.hideHint();
        if ((player.start.getFreeField() === null) &&
                (newValue !== 6)) {
            nextPlayer();
        } else {
            game.stat = GAME_STATUS.WAIT_FOR_PAWN;
            game.players[game.current].focus();
        }
    }

    function handlemsg_prehistoric(channel, msg) {
        var player = game.players[game.current];
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
            log("it's not your turn");
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
        	console.log("unknown typeof msg: " + typeof msg);
        }
    }

    document.onkeydown = function(event) {
        log('key ' + event.keyCode + ' pressed!');
        if (event.keyCode === 13) {
            handlemsg(0, 'click');
        } else if (event.keyCode === 37) {
            handlemsg(0, 'prev');
        } else if (event.keyCode === 39) {
            handlemsg(0, 'next');
        }
    }

    global.addEventListener('load', function () {
        init();
    });
}(this));
