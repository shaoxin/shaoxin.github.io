(function (global) {
    var game = {
            board: null,
            current: -1,
            players: [],
            playerList: null
        },
        RED = 2,
        GREEN = 3,
        YELLOW = 4,
        BLUE = 5;

    function nextPlayer() {
        var next = game.current + 1,
            arrow = $('.arrow'),
            i = 0;

        while (game.players[i]) {
            game.players[i].blur();
            i++;
        }

        arrow.removeClass('arrow-' + game.current);
        game.current = next > 3 ? 0 : next;
        arrow.addClass('arrow-' + game.current);
        game.players[game.current].focus();
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
        game.playerList = $('#players-list');
        
        game.board = new Board('board');
        game.board.dice = new Dice('content');
        addPlayer('Player 1', RED);
        addPlayer('Player 2', GREEN);
        addPlayer('Player 3', YELLOW);
        addPlayer('Player 4', BLUE);
        nextPlayer();
    }

    function handlemsg(msg) {
        if (msg === 'click') {
            log("click received in handleChromeCast");
            if (game.stat === 'waitDice') {
                game.board.dice.roll(function (newValue) {game.stat = 'waitPawn';});
            }
            if (game.stat === 'waitPawn') {
            	var player = game.players[game.current];
            	var pawn = player.getCurrentPawn();
                player.move(game.board.dice.getValue(), pawn);
            }
        }
        if (msg === 'next') {
            log("next received in handleChromeCast");
            if (game.stat === 'waitPawn') {
            	var player = game.players[game.current];
                player.nextPawn();
            }
        }
        if (msg === 'prev') {
            log("prev received in handleChromeCast");
            if (game.stat === 'waitPawn') {
            	var player = game.players[game.current];
                player.prevPawn();
            }
        }
    }

    global.addEventListener('load', function () {
        init();
    });
}(this));

      window.onload = function() {
        cast.receiver.logger.setLevelValue(0);
        window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
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

        // handler for the CastMessageBus message event
        window.messageBus.onMessage = function(event) {
          console.log('Message [' + event.senderId + ']: ' + event.data);
          game.nextPlayer();
          game.handlemsg(event.data);
          // display the message from the sender
          //displayText(event.data);
          // inform all senders on the CastMessageBus of the incoming message event
          // sender message listener will be invoked
          window.messageBus.send(event.senderId, event.data);
        }

        // initialize the CastReceiverManager with an application status message
        window.castReceiverManager.start({statusText: "Application is starting"});
        console.log('Receiver Manager started');
      };
