// The multiplayer / networking portion of Pong

import { GameSocket } from "/common/socket.mjs";
import Console from "/common/console.mjs";


const Net = {

	socket: new GameSocket(),
	ready: false,

	opponent_pos: 0,

	state: {
		scores: [0, 0],
		paused: false,
		won: false,
		winner: ''
	},


	init: function() {
		this.socket.on('auth', (success, message) => {
			if(success)
				Console.success("GameSocket Authorized");
			else
				Console.error("Unauthorized:", message);
		});

		this.socket.on('player_info', (player) => {
			this.opponent = player;
		});

		// Start allowing updates to be sent
		if(sessionStorage.getItem('game-started') === 'true') {
			this.ready = true;
		}
		else {
			this.socket.on('start', () => {
				this.ready = true;
				sessionStorage.setItem('game-started', true);
			});
		}

		this.socket.on('player_update', (position) => {
			this.opponent_pos = position;
		});

		this.socket.on('score', (left, right) => {
			this.state.scores[0] = left;
			this.state.scores[1] = right;
		});

		this.socket.on('win', (name) => {
			this.state.won = true;
			this.state.winner = name;
		});
	},


	send_update: function(player) {
		if(!this.ready || this.state.won) return false;

		this.socket.send_update(player);
		return true;
	}

};


Net.init();
export default Net;
