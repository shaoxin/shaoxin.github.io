(function (global) {
    var game = {
            board: null,
            current: -1,
            players: [],
            playerList: null,
            pickupIndex: 0
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

        log(navigator.userAgent.toLowerCase());
        log('init game');

        game.board = new Board('board');
        game.board.dice = new Dice('content');
        addPlayer('Player 1', RED);
        addPlayer('Player 2', GREEN);
        addPlayer('Player 3', YELLOW);
        addPlayer('Player 4', BLUE);
        nextPlayer();

        str = '{ "header": { "magic": "ONLINE", "prot_version": 1}, "body": "hihi"}';
        //str = '{ "name": "strong", "header": {"age": 16 } }';
        log(typeof(str));
        js  = $.parseJSON(str);
        log(typeof js);
        log(js.header.age);

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
            game.stat = 'waitPawn';
            game.players[game.current].focus();
        }
    }

/*
 * 1. message = $header + $body
 *
 * 2. header
 * $MAGIC,$prot_version
 *     MAGIC                "ONLINE"
 *     prot_version         1~FFFF
 *
 * 3. body
 * connect,$username [c2s]  user connects to the game
 * connect_reply,$ret,$ishost,$level:$player_status[]
 *                   [s2c]  send feedback to client for 'connect'
 *     ret                  true/false
 *                          only allow 4 connections at most
 *     ishost               true/false
 *                          game host has some privileges:
 *                              set game level
 *                              set player as unavailable/computer
 *                              override player set by other clients
 *     level                difficult/medium/easy
 *     player_status        $color:$user_type:$isready:$username
 *                          color         red/green/yellow/blue
 *                          user_type     unavailable/nobody/human/computer
 *                          isready       yes/no
 *                          username      could be an empty string
 *
 * setlevel:$level   [c2s]  set the AI level of computer player
 * setlevel_notify:$level
 *                   [s2c]  broadcast to clients new $level is set
 *
 * pickup:$color:$user_type
 *                   [c2s]  pickup as $user_type with $color pawns
 * pickup_notify:$player_status
 *                   [s2c]  broadcast to clients about $player_status
 *
 * getready          [c2s]  user is ready to play the game
 * getready_notify:$color[]
 *                   [s2c]  broadcast to other clients that $color[] is/are ready to start game
 *
 * disready          [c2s]  mark user is not ready now
 * disready_notify:$color[]
 *                   [s2c]  broadcast to other clients that $color[] become(s) unready for the game
 *
 * disconnect        [c2s]
 * disconnect_notify:$color[]
 *                   [s2c]  broadcast to other clients that $color[] get(s) disconnected
 *
 * changehost_notify [s2c]  when original host leaves game,
 *                          notify the new picked up user to be the new game host,
 *                          other clients won't receive this notification
 *
 * startgame_notify  [s2c]
 *
 * endofgame_notify: [s2c]
 *
 * 4. example flow
 *    ==Bob==          ==chromecast==           ==Alice==             ==Chandler==
 *    connect   -->
 *              <--    connect_reply
 *
 *    setlevel  -->
 *              <--    setlevel_reply
 *
 *                                       <--    connect
 *                     connect_reply     -->
 *
 *                                                             <--    connect
 *                     connect_reply                           -->
 *
 *    pickup    -->
 *              <--    pickup_reply
 *                     pickup_notify     -->
 *
 *                                       <--    pickup
 *                     pickup_reply      -->
 *              <--    pickup_notify                           -->
 *
A*    getready  -->
 *              <--    getready_reply
 *                     getready_notify   -->                   -->
 *
 *                                       <--    getready
 *                     getready_reply    -->
 *              <--    getready_notify                         -->
 *
 *                                                             <--    getready
 *                     getready_reply                          -->
 *              <--    getready_notify   -->
B*              <--    startgame_notify  -->
 *
 *              <--    endofgame_notify  -->
 *
 *    repeat A->B
 *                     disconnect_notify -->                   -->
 *                     changehost_notify -->
 *                     pickup_notify     -->                   -->
 *
 *                     endofgame_notify  -->                   -->
 */
    function handlemsg(channel, msg) {
        var player = game.players[game.current];
        var pawn = player.getCurrentPawn();

        if (typeof msg === "object") {
            if (typeof msg.COMMAND === "undefined") {
                log("wrong msg format");
                return;
            }
            log("msg.COMMAND=" + msg.COMMAND);
            msg.COMMAND=msg.COMMAND+"_reply";
            game.messageBus.send(channel, msg);
            return;
        } else {
        	log("typeof msg = " + typeof msg);
            log("else msg.command: " + msg.COMMAND);
            return;
        }

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