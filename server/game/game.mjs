// Create, update, and close games

// import LobbyManager from "./lobby.mjs";
import Ball from "./ball.mjs";

import gen_string from "../util/string.mjs";
import { settings } from "../settings.mjs";


const lobby_opcode = {
	AUTH: 0,
	PLAYER_LIST: 1,
	PLAYER_JOIN: 2,
	UPDATE: 3,
	SET_NAME: 4,
	NAME_ERROR: 5,
	PING: 6,
	START_GAME: 7
};

const game_opcode = {
	AUTH: 0,
	START: 1,
	PLAYER_UPDATE: 2,
	BALL_UPDATE: 3,
	GAME_UPDATE: 4,
	PING: 5
};


class Game {
	static NOT_STARTED = 0;
	static ACTIVE = 1;
	static ENDED = 2;

	static ADMIN = 0;
	static PLAYER = 1;

	key = null;
	state = 0;

	players = {};
	player_count = 0;
	max_players = 2;

	scores = [0, 0];

	ball = new Ball();


	constructor(key) {
		this.key = key;
		this.state = Game.NOT_STARTED;

		// Send player updates to everyone
		const update_int = setInterval(() => {
			if(this.state !== Game.NOT_STARTED) return clearInterval(update_int);

			const player_list = this.get_player_list(lobby_opcode.UPDATE);

			for(let p in this.players) {
				if(!this.players[p].joined) continue;
				GameManager.server.send(this.players[p].sk_info, player_list);
			}
		}, 3000);
	}

	has_player(player_key) {
		return player_key in this.players;
	}

	has_player_name(name) {
		for(let p in this.players) {
			if(this.players[p].name === name) return true;
		}

		return false;
	}


	// Create an admin / player spot from a key
	create_admin(key) {
		if(key in this.players) return false;

		this.player_count++;

		this.players[key] = {
			type: Game.ADMIN,
			sk_info: null,
			joined: false,
			name: `Player ${this.player_count}`,
			ping: 0,
			pos: 50
		};

		return true;
	}

	create_player(key) {
		if(key in this.players) return false;

		this.player_count++;

		this.players[key] = {
			type: Game.PLAYER,
			sk_info: null,
			joined: false,
			name: `Player ${this.player_count}`,
			ping: 0,
			pos: 50
		};

		return true;
	}


	// Add an existing player to the game (works for admins too)
	join_player(key, sk_info) {
		if(!(key in this.players) || this.players[key].joined) return false;

		this.players[key].joined = true;
		this.players[key].sk_info = sk_info;

		// Send the PLAYER_JOIN event to all other players
		for(let p in this.players) {
			if(p === key) continue;

			GameManager.server.send(this.players[p].sk_info, Buffer.from(
				String.fromCharCode(lobby_opcode.PLAYER_JOIN) +
				JSON.stringify({
					index: Object.keys(this.players).indexOf(key),
					name: this.players[key].name,
					ping: this.players[key].ping
				}),
				'utf16le'
			));
		}

		return true;
	}

	// Update an existing player's connection if it changes
	update_socket(key, sk_info) {
		if(!(key in this.players)) return;
		this.players[key].sk_info = sk_info;
	}


	// Get the player list as a buffer
	get_player_list(opcode) {
		let ind = 0;
		let player_str = String.fromCharCode(opcode);

		for(let p in this.players) {
			player_str += JSON.stringify({
				index: ind,
				name: this.players[p].name,
				ping: this.players[p].ping
			}) + '\n';

			ind++;
		}

		return Buffer.from(player_str, 'utf16le');
	}


	// Try to start the game
	start(player_id) {
		if(this.state !== Game.NOT_STARTED) return false;
		if(this.player_count !== 2) return false; // This check will change if other gamemodes are added
		if(this.players[player_id]?.type !== Game.ADMIN) return false;

		this.state = Game.ACTIVE;

		for(let p in this.players) {
			GameManager.server.send(this.players[p].sk_info, Buffer.from([
				lobby_opcode.START_GAME, 0, 1, 0
			]));
		}

		// Start the game after 5 seconds & start sending update messages
		setTimeout(() => {
			for(let p in this.players) {
				GameManager.server.send(this.players[p].sk_info, Buffer.from([
					game_opcode.START, 0
				]));
			}

			this.ball.on('score', this.score.bind(this));
			this.ball.reset();

			this.start_updates();
		}, 5000);

		return true;
	}


	// Start sending player / game / ball updates to all players
	start_updates() {
		const keys = Object.keys(this.players);

		setInterval(() => {
			this.send_update(this.players[keys[0]].sk_info, this.players[keys[1]].pos);
			this.send_update(this.players[keys[1]].sk_info, this.players[keys[0]].pos);

			this.ball.update();
			this.ball.collide(this.players[keys[0]].pos, this.players[keys[1]].pos);

			GameManager.server.send(this.players[keys[0]].sk_info, this.ball.get_buffer(game_opcode.BALL_UPDATE));
			GameManager.server.send(this.players[keys[1]].sk_info, this.ball.get_buffer(game_opcode.BALL_UPDATE));
		}, 0);
	}


	// Send a player update to a player socket
	send_update(sk_info, pos) {
		const buf = Buffer.alloc(6);
		buf.writeUint16LE(game_opcode.PLAYER_UPDATE, 0);
		buf.writeFloatBE(pos, 2);

		GameManager.server.send(sk_info, buf);
	}


	// A player scored
	score(side) {
		this.ball.reset();
		let winner = -1;

		if(side === 'left') {
			this.scores[0]++;
			if(this.scores[0] > 10) winner = 0;
		}
		else {
			this.scores[1]++;
			if(this.scores[1] >= 10) winner = 1;
		}

		if(winner !== -1) {
			for(let p in this.players) {
				GameManager.server.send(this.players[p].sk_info, Buffer.from([
					game_opcode.GAME_UPDATE, 0,
					winner, 0
				]));
			}
		}
	}
}


const GameManager = {

	server: null, // WebSocket server

	max_games: settings['max-games'],
	available: settings['max-games'],
	games: {},


	init: function(server) {
		this.server = server;
		this.server.on('message', this._message.bind(this));
		this.server.on('disconnect', this._disconnect.bind(this));
	},


	// Receive a WebSocket message
	_message: function(frame, sk_info, extra_info) {
		if(frame.opcode === 1) return; // All data frames should be binary

		if(!extra_info.authed && frame.data[0] !== lobby_opcode.AUTH) {
			this.server.disconnect(sk_info);
			return;
		}

		if(sk_info.path === '/lobby') {
			if(this.games[extra_info.game_key] && this.games[extra_info.game_key].state !== Game.NOT_STARTED) {
				this.server.disconnect(sk_info);
				return;
			}

			switch(frame.data[0]) {

				case lobby_opcode.AUTH: {
					const [game_key, player_key] = frame.data.slice(2).toString('utf16le').split(' ');

					// Failure
					if(!(game_key in this.games))
						return this.server.send(sk_info, Buffer.from("\x00\x00Invalid game key", 'utf16le'));
					if(!this.games[game_key].has_player(player_key))
						return this.server.send(sk_info, Buffer.from("\x00\x00Invalid player key", 'utf16le'));

					this.server.setInfo(sk_info, { game_key, player_key, authed: true });
					this.games[game_key].join_player(player_key, sk_info);

					// Send auth success & player list
					this.server.send(sk_info, Buffer.from('\x00\x01', 'utf16le'));
					this.server.send(sk_info, this.games[game_key].get_player_list(lobby_opcode.PLAYER_LIST));
					break; }

				case lobby_opcode.SET_NAME: {
					const new_name = frame.data.slice(2).toString('utf16le').trim();

					if(!new_name.length || new_name.length > 24 || this.games[extra_info.game_key].has_player_name(new_name)) {
						this.server.send(sk_info, Buffer.from(String.fromCharCode(lobby_opcode.NAME_ERROR) + "Invalid name", 'utf16le'));
						return;
					}

					this.games[extra_info.game_key].players[extra_info.player_key].name = new_name;
					break; }

				case lobby_opcode.PING: {
					const timestamp = +(frame.data.slice(2).toString('utf16le'));
					const diff = Date.now() - timestamp;
					if(isNaN(diff) || diff < 0) return;

					this.games[extra_info.game_key].players[extra_info.player_key].ping = diff;
					break; }

				case lobby_opcode.START_GAME: {
					const success = this.games[extra_info.game_key].start(extra_info.player_key);
					if(!success) this.server.send(sk_info, Buffer.from([lobby_opcode.START_GAME, 0, 0, 0]));
					break; }

			}
		}
		else if(sk_info.path === '/play') {
			if(this.games[extra_info.game_key] && this.games[extra_info.game_key].state !== Game.ACTIVE) {
				this.server.disconnect(sk_info);
				return;
			}

			switch(frame.data[0]) {

				case game_opcode.AUTH: {
					const [game_key, player_key] = frame.data.slice(2).toString('utf16le').split(' ');

					// Failure
					if(!(game_key in this.games))
						return this.server.send(sk_info, Buffer.from("\x00\x00Invalid game key", 'utf16le'));
					if(!this.games[game_key].has_player(player_key))
						return this.server.send(sk_info, Buffer.from("\x00\x00Invalid player key", 'utf16le'));

					this.server.setInfo(sk_info, { game_key, player_key, authed: true });
					this.games[game_key].update_socket(player_key, sk_info);

					// Send auth success & player list
					this.server.send(sk_info, Buffer.from('\x00\x01', 'utf16le'));
					break; }

				case game_opcode.PLAYER_UPDATE:
					const pos = frame.data.readFloatBE(2);
					if(pos < 0) pos = 0;
					if(pos > 100) pos = 100;

					this.games[extra_info.game_key].players[extra_info.player_key].pos = pos;
					break;

				case game_opcode.PING:
					// TODO
					break;

				default:
					console.log("[/play] Unknown frame:", frame.data[0]);

			}
		}
	},


	// Listen for WebSocket disconnections
	_disconnect: function(reason, sk_info) {

	},


	create_game: function() {
		if(this.available === 0) return null;

		const game_key = gen_string(16, true);
		this.games[game_key] = new Game(game_key);

		this.available--;
		return game_key;
	},


	gen_admin_key: function(game_key) {
		if(!this.games[game_key]) return null;

		let key = gen_string(16, true);
		if(this.games[game_key].create_admin(key))
			return key;

		return '';
	},

	gen_player_key: function(game_key) {
		if(!this.games[game_key]) return null;

		let key = gen_string(12, true);
		if(this.games[game_key].create_player(key))
			return key;

		return '';
	},


	// Checks if a player can join a game
	is_joinable: function(game_key) {
		if(!(game_key in this.games)) return false;
		if(this.games[game_key].state !== Game.NOT_STARTED) return false;
		if(this.games[game_key].player_count >= this.games[game_key].max_players) return false;

		return true;
	},

};


export default GameManager;
