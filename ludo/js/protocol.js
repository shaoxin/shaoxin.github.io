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
 *                          isready       true/false
 *                          username      could be an empty or normal string
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

var LudoProtocol = function () {
    this.prot_version = 0; /* could accept any available version */
};

LudoProtocol.MAGIC = 'ONLINE';

LudoProtocol.COMMAND = {
	connect:           'connect',
	connect_reply:     'connect_reply',

	setlevel:          'setlevel',
	setlevel_notify:   'setlevel_notify',

	pickup:            'pickup',
	pickup_notify:     'pickup_notify',

	getready:          'getready',
	getready_notify:   'getready_notify',

	disready:          'disready',
	disready_notify:   'disready_notify',

	disconnect:        'disconnect',
	disconnect_notify: 'disconnect_notify',

	startgame_notify:  'startgame_notify',
	endofgame_notify:  'endofgame_notify',
};

LudoProtocol.prototype.parseProt_1 = function(senderID, msgObj) {
	try {
		switch (msgObj.command) {
			case LudoProtocol.COMMAND.connect:
				var user = new User(User.type.HUMAN, User.UNREADY,
						senderID, msgOjb.username);
				game.addUser(user);
				if (user.ishost) {
					console.log('force LudoProtocol version(' + msgObj.prot_version
							+ ') the same as host');
					this.prot_version = msgObj.prot_version;
				}

				var reply = new Object();
				reply.ret = true;
				reply.ishost = user.ishost;
				reply.level = game.level;
				reply.player_status = [];
				for (i=0; i<game.players.length; i++) {
					var p = game.players[i];
					var ps = new Object();
					var user = p.getUser();

					ps.color = p.color;
					ps.user_type = user.type;
					ps.isready = user.isready;
					ps.username = user.name;

					reply.player_status.push(ps);
				}
				this.sendMsg(senderID, reply);
				break;

			case LudoProtocol.COMMAND.setlevel:
				break;

			case LudoProtocol.COMMAND.pickup:
				break;

			case LudoProtocol.COMMAND.getready:
				break;

			case LudoProtocol.COMMAND.disready:
				break;

			case LudoProtocol.COMMAND.disconnect:
				break;

			default:
				break;
		}
	} catch (err) {
    	console.log(err);
		return false;
	}
};

LudoProtocol.prototype.parseMsg = function (senderID, msgObj) {
	try {
        if (msgObj.MAGIC !== "ONLINE")
            throw "invalid MAGIC";

        if (this.prot_version !== 0) {
        	console.log("check msg.prot_version against protocol version in use");
			if (!(msgObj.prot_version >= 1 && msgObj.prot_version <=1))
				throw "not supported protocol version";
        	if (msgObj.prot_version != this.prot_version)
        	    throw "not matching protocol in use";
        }

        if (msgObj.prot_version === 1) {
            this.parseProt_1(senderID, msgObj);
        } else {
            throw "unknown protocol version";
        }
    } catch(err) {
    	console.log(err);
    }
};

LudoProtocol.prototype.sendMsg = function (senderID, msgObj) {
	msgObj.MAGIC = LudoProtocol.MAGIC;
	msgObj.prot_version = this.prot_version;
	game.messageBus.send(senderID, JSON.stringify(msgObj));
};
