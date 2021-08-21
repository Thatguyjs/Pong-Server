// WebSocket communication using a custom protocol

import { buffer, array, join_buffers, stringify } from "./buffer.mjs";

import EventEmitter from "./emitter.mjs";
import Console from "./console.mjs";


const socket_port = await (await fetch(location.origin + '/query?get=ws-port')).text();
Console.info("Using WebSocket port:", socket_port);


class LobbySocket {
	static opcode = {
		AUTH: 0,
		PLAYER_LIST: 1,
		PLAYER_JOIN: 2,
		UPDATE: 3,
		SET_NAME: 4,
		NAME_ERROR: 5,
		PING: 6,
		START_GAME: 7
	};

	ip = "";
	port = null;

	#socket = null;
	#emitter = new EventEmitter();

	constructor() {
		this.ip = location.hostname;
		this.port = socket_port;

		this.#socket = new WebSocket(`ws://${this.ip}:${this.port}/lobby`);

		this.#socket.addEventListener('open', this.#open.bind(this));
		this.#socket.addEventListener('message', this.#message.bind(this));
		this.#socket.addEventListener('close', this.#close.bind(this));
		this.#socket.addEventListener('error', this.#error.bind(this));
	}


	#open() {
		// Send authorization
		this.#socket.send(new Uint8Array([
			LobbySocket.opcode.AUTH, 0,
			...array(
				sessionStorage.getItem('game-key') +
				' ' +
				sessionStorage.getItem('player-key')
			)
		]));
	}

	async #message(evt) {
		if(typeof evt.data === 'string') {
			Console.info("LobbySocket string message:", evt.data);
			return;
		}

		const buffer = await evt.data.arrayBuffer();
		const bytes = new Uint16Array(buffer);

		switch(bytes[0]) {

			case LobbySocket.opcode.AUTH:
				this.#emitter.emit('auth', bytes[1], stringify(bytes, 2));
				if(bytes[1]) this.#init_ping();
				break;

			case LobbySocket.opcode.PLAYER_LIST:
				this.#parse_player_list(bytes);
				break;

			case LobbySocket.opcode.PLAYER_JOIN:
				this.#parse_player_join(bytes);
				break;

			case LobbySocket.opcode.UPDATE:
				this.#parse_update(bytes);
				break;

			case LobbySocket.opcode.NAME_ERROR:
				this.#parse_name_error(bytes);
				break;

			case LobbySocket.opcode.START_GAME:
				if(bytes[1]) window.location.assign(`/play?game=${sessionStorage.getItem('game-key')}`);
				break;

			default:
				Console.warn("Received unknown frame:", bytes);

		}
	}

	#close(evt) {
		Console.warn("LobbySocket closed");
	}

	#error(err) {
		Console.error("LobbySocket error:", err);
	}


	// Initialize server ping messages
	#init_ping() {
		setInterval(() => {
			this.#socket.send(new Uint8Array([
				LobbySocket.opcode.PING, 0,
				...array(Date.now().toString())
			]));
		}, 3000);
	}


	// Parse a player list and emit 'player_join' events
	#parse_player_list(buffer) {
		const player_list = stringify(buffer, 1).trim().split('\n');

		for(let p in player_list) {
			const player = JSON.parse(player_list[p]);
			this.#emitter.emit('player_join', player);
		}
	}


	// Parse a player join frame and emit a 'player_join' event
	#parse_player_join(buffer) {
		Console.debug("Received player join message");
		const player = stringify(buffer, 1).trim();

		this.#emitter.emit('player_join', JSON.parse(player));
	}


	// Parse a player update list and emit 'player_update' events
	#parse_update(buffer) {
		Console.debug("Received player update message");
		const player_list = stringify(buffer, 1).trim().split('\n');

		for(let p in player_list) {
			const player = JSON.parse(player_list[p]);
			this.#emitter.emit('player_update', player);
		}
	}


	// Update the player name on the server
	update_name(name) {
		this.#socket.send(new Uint8Array([
			LobbySocket.opcode.SET_NAME, 0,
			...array(name)
		]));
	}

	// Parse a name error message from the server
	#parse_name_error(buffer) {
		this.#emitter.emit('name_error', stringify(buffer, 1));
	}


	// Request to start the game
	start_game() {
		this.#socket.send(new Uint8Array([
			LobbySocket.opcode.START_GAME, 0
		]));
	}


	on(...args) { this.#emitter.on(...args); }
	once(...args) { this.#emitter.once(...args); }
}


class GameSocket {
	static opcode = {
		AUTH: 0,
		START: 1,
		POSITION: 2,
		PLAYER_UPDATE: 3,
		BALL_UPDATE: 4,
		SCORE: 5,
		WIN: 6,
		PING: 7
	};

	ip = "";
	port = null;

	#socket = null;
	#emitter = new EventEmitter();

	constructor() {
		this.ip = location.hostname;
		this.port = socket_port;

		this.#socket = new WebSocket(`ws://${this.ip}:${this.port}/play`);

		this.#socket.addEventListener('open', this.#open.bind(this));
		this.#socket.addEventListener('message', this.#message.bind(this));
		this.#socket.addEventListener('close', this.#close.bind(this));
		this.#socket.addEventListener('error', this.#error.bind(this));
	}


	#open() {
		// Send authorization
		this.#socket.send(new Uint8Array([
			GameSocket.opcode.AUTH, 0,
			...array(
				sessionStorage.getItem('game-key') +
				' ' +
				sessionStorage.getItem('player-key')
			)
		]));
	}

	async #message(evt) {
		if(typeof evt.data === 'string') {
			Console.info("LobbySocket string message:", evt.data);
			return;
		}

		const buffer = await evt.data.arrayBuffer();
		const view = new DataView(buffer);
		const chars = new Uint16Array(buffer);

		switch(chars[0]) {

			case GameSocket.opcode.AUTH:
				this.#emitter.emit('auth', chars[1], stringify(chars, 2));
				if(chars[1]) this.#init_ping();
				break;

			case GameSocket.opcode.POSITION:
				this.#emitter.emit('position', chars[1]);
				break;

			case GameSocket.opcode.START:
				this.#emitter.emit('start');
				break;

			case GameSocket.opcode.PLAYER_UPDATE:
				this.#emitter.emit('player_update', view.getFloat32(2));
				break;

			case GameSocket.opcode.BALL_UPDATE:
				this.#emitter.emit('ball_update', view.getFloat32(2), view.getFloat32(6));
				break;

			case GameSocket.opcode.SCORE:
				this.#emitter.emit('score', view.getUint8(2), view.getUint8(3));
				break;

			case GameSocket.opcode.WIN:
				this.#emitter.emit('win', stringify(chars, 1));
				break;

			default:
				Console.warn("Received unknown frame:", chars);

		}
	}

	#close(evt) {
		Console.warn("GameSocket closed");
	}

	#error(err) {
		Console.error("GameSocket error:", err);
	}


	// Initialize server ping messages
	#init_ping() {
		// setInterval(() => {
		// 	this.#socket.send(new Uint8Array([
		// 		GameSocket.opcode.PING, 0,
		// 		...array(Date.now().toString())
		// 	]));
		// }, 3000);
	}


	// Send a player update message to the server
	send_update(player) {
		const buf = new ArrayBuffer(6);
		const view = new DataView(buf);

		view.setUint16(0, GameSocket.opcode.PLAYER_UPDATE, true);
		view.setFloat32(2, player.y);

		this.#socket.send(buf);
	}


	on(...args) { this.#emitter.on(...args); }
	once(...args) { this.#emitter.once(...args); }
}


export { LobbySocket, GameSocket };
