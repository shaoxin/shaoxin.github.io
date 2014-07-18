(function (global) {
    var game = {
            board: null,
            current: -1,
            players: [],
            playerList: null,
            joinIndex: 0
        },
        RED = 2,
        GREEN = 3,
        YELLOW = 4,
        BLUE = 5;

    function playAward() {
        game.board.dice.focus();
        game.board.dice.showHint();
        game.stat = 'waitDice';
    }

    function nextPlayer() {
        var next = game.current,
            arrow = $('.arrow'),
            i = 0;

        if (game.numDone == 4) {
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
        game.current = next > 3 ? 0 : next;
        arrow.addClass('arrow-' + game.current);
        //game.players[game.current].focus();
        game.board.dice.focus();
        game.board.dice.showHint();
        game.stat = 'waitDice';
    }

    function addPlayer(name, color) {
        game.players.push(new Player(name, color, game.board));
        
        // todo convert to component with focus indicator etc.
        game.playerList.append(
            '<li class="player player-' + color + '"><div class="icon"></div>' + name + '</li>'
        );
    }

    function init() {
        //todo remove
        global.game = game;
        global.nextPlayer = nextPlayer;
        global.playAward = playAward;
        global.rollDoneHandler = rollDoneHandler;

        game.numDone = 0;
        game.playerList = $('#players-list');

        log('init game');
        
        game.board = new Board('board');
        game.board.dice = new Dice('content');
        addPlayer('Player 1', RED);
        addPlayer('Player 2', GREEN);
        addPlayer('Player 3', YELLOW);
        addPlayer('Player 4', BLUE);
        nextPlayer();

        log('init chrome cast handler');
        cast.receiver.logger.setLevelValue(0);
        window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
        window.game = game;
        console.log('Starting Receiver Manager');
        
        // handler for the 'ready' event
        castReceiverManager.onReady = function(event) {
          console.log('Received Ready event: ' + JSON.stringify(event.data));
          window.castReceiverManager.setApplicationState("Application status is ready...");
        };
        
        // handler for 'senderconnected' event
        castReceiverManager.onSenderConnected = function(event) {
          console.log('Received Sender Connected event: ' + event.data);
          console.log(window.castReceiverManager.getSender(event.data).userAgent);
        };
        
        // handler for 'senderdisconnected' event
        castReceiverManager.onSenderDisconnected = function(event) {
          console.log('Received Sender Disconnected event: ' + event.data);
          if (window.castReceiverManager.getSenders().length == 0) {
            window.close();
          }
        };
        
        // handler for 'systemvolumechanged' event
        castReceiverManager.onSystemVolumeChanged = function(event) {
          console.log('Received System Volume Changed event: ' + event.data['level'] + ' ' +
              event.data['muted']);
        };

        // create a CastMessageBus to handle messages for a custom namespace
        window.messageBus =
          window.castReceiverManager.getCastMessageBus(
              'urn:x-cast:com.google.cast.sample.helloworld');


        // initialize the CastReceiverManager with an application status message
        window.castReceiverManager.start({statusText: "Application is starting"});
        console.log('Receiver Manager started');

        // handler for the CastMessageBus message event
        window.messageBus.onMessage = function(event) {
          console.log('Message [' + event.senderId + ']: ' + event.data);
          // display the message from the sender
          //displayText(event.data);
          // inform all senders on the CastMessageBus of the incoming message event
          // sender message listener will be invoked
          window.messageBus.send(event.senderId, event.data);

          handlemsg(event.senderId, event.data);
          //window.game.handlemsg(event.data);
        }

    }

    function rollDoneHandler(newValue) {
        log('rollDoneHandler=' + newValue + ', current=' + game.current);
        var player = game.players[game.current];
        game.board.dice.blur();
        game.board.dice.hideHint();
        if ((player.start.getFreeField() === null) &&
                (newValue !== 6)) {
            nextPlayer();
        } else {
            game.stat = 'waitPawn';
            game.players[game.current].focus();
        }
    }

    function handlemsg(channel, msg) {
        var player = game.players[game.current];
        var pawn = player.getCurrentPawn();

        log("'" + msg + "' received in handlemsg from channel " + channel);

        if (msg === 'join') {
            var i = game.joinIndex;
            if (i <= 1) {
                game.players[2*i].channel = channel;
                game.players[2*i+1].channel = channel;
                log('player ' + 2*i + ' and ' + 2*i+1 +
                    ' are allocated to channel ' + channel);
                i++;
                game.joinIndex = i;
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
            if (game.stat === 'waitDice') {
                game.board.dice.roll(rollDoneHandler);
            } else if (game.stat === 'waitPawn') {
                player.move(game.board.dice.getValue(), pawn);
            }
        } else if (msg === 'next') {
            if (game.stat === 'waitPawn') {
                player.nextPawn();
            }
        } else if (msg === 'prev') {
            if (game.stat === 'waitPawn') {
                player.prevPawn();
            }
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