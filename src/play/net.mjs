// The multiplayer / networking portion of Pong

import { GameSocket } from "/common/socket.mjs";
import Console from "/common/console.mjs";


const Net = {

	socket: new GameSocket(),
	ready: false,

	opponent_pos: 0,

	state: {
		scores: [0, 0],
		paused: false
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

		this.socket.on('game_update', (state) => {
			console.log("Game update:", state);
		});
	},


	send_update: function(player) {
		if(!this.ready) return false;

		this.socket.send_update(player);
		return true;
	}

};


Net.init();
export default Net;
