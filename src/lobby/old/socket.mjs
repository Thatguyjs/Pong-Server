// Manage the WebSocket connection for game lobbies

import EventEmitter from "/common/emitter.mjs";
import Console from "/common/console.mjs";


function find_num_size(num) {
	if(Number.isInteger(num)) {
		let bytes = 1;
		while(num >= 2 ** (bytes * 8)) bytes++;

		if(bytes === 3) bytes++;
		return bytes;
	}
	else return 4;
}


function bytes_to_string(buf, offset, length) {
	offset = offset ?? 0;
	length = length ?? buf.length - offset;

	let result = "";

	for(let i = 0; i < length; i++) {
		result += String.fromCharCode(buf[offset + i]);
	}

	return result;
}


function string_to_buffer(string, view, offset=0) {
	const length = string.length;

	for(let i = 0; i < length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}

	return length;
}

function num_to_buffer(num, view, offset=0) {
	let length = find_num_size(num);

	switch(length) {
		case 1:
			view.setUint8(offset, num);
			break;

		case 2:
			view.setUint16(offset, num, false);
			break;

		case 4:
			if(Number.isInteger(num)) view.setUint32(offset, num, false);
			else view.setFloat32(offset, num, false);
			break;

	}

	return length;
}

function copy_buffer(buffer, view, offset=0) {
	const length = buffer.byteLength;
	const src_view = new DataView(buffer);

	for(let i = 0; i < length; i++) {
		view.setUint8(offset + i, src_view.getUint8(i));
	}

	return length;
}


const opcode = {
	INIT: 0,
	AUTH: 1,
	PING: 2,
	PLAYER_LIST: 3,
	SET_NAME: 4,
	PLAYER_JOIN: 5,
	PLAYER_UPDATE: 6,
	JOIN_ERROR: 7
};


const LobbySocket = {

	// WebSocket states
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3,

	ws: null,

	_emitter: new EventEmitter(),


	init: async function() {
		const port = await (await fetch('/query?get=ws-port')).text();
		this.ws = new WebSocket(`ws://${location.hostname}:${port}/lobby`);

		this.ws.addEventListener('open', this._open.bind(this));
		this.ws.addEventListener('close', this._close.bind(this));
		this.ws.addEventListener('message', this._message.bind(this));
		this.ws.addEventListener('error', this._error.bind(this));
	},


	// Start getting client ping from the server
	_init_ping: function() {
		this.send(opcode.PING, [Date.now().toString()]);

		setInterval(() => {
			this.send(opcode.PING, [Date.now().toString()]);
		}, 3000);
	},


	// Called when the WS connection opens
	_open: function() {
		Console.info("Lobby WS connected");
		this._emitter.emit('socket_open');

		this.send(opcode.INIT, ['init']);
	},

	// Called when the WS connection closes
	_close: function(evt) {
		Console.info("Lobby WS disconnected");
		this._emitter.emit('socket_close', evt.reason);
	},

	// Called when the WS connection has an error
	_error: function(err) {
		Console.error("Lobby WS error:", err);
	},


	// Called when the WS connection receives a message
	_message: async function(evt) {
		if(evt.data === 'auth') {
			this.send(opcode.AUTH, [sessionStorage.getItem('game-key') + ' ' + sessionStorage.getItem('player-key')]);
		}

		else if(evt.data instanceof Blob) {
			const buf = await evt.data.arrayBuffer();
			const bytes = new Uint8Array(buf);

			switch(bytes[0]) {

				case opcode.AUTH:
					this._emitter.emit('auth', bytes[1], bytes_to_string(bytes, 2));
					if(bytes[1]) this._init_ping();
					break;

				case opcode.PLAYER_JOIN:
					this._emitter.emit('player_join', bytes[1], bytes_to_string(bytes, 2));
					break;

				case opcode.PLAYER_UPDATE:
					this._emitter.emit('player_update', bytes[1], bytes.slice(2));
					break;

				case opcode.JOIN_ERROR:
					this._emitter.emit('join_error', bytes_to_string(bytes, 1));
					break;

			}
		}
	},


	// Send a message to the server
	send: function(code, data) {
		let length = 1;

		for(let d in data) {
			if(typeof data[d] === 'string') length += data[d].length;
			else if(typeof data[d] === 'number') length += find_num_size(data[d]);
			else if(data[d] instanceof ArrayBuffer) length += data[d].byteLength;
			else throw new Error(`Cannot send data: ${data[d]}`);
		}

		const buffer = new ArrayBuffer(length);
		const view = new DataView(buffer);

		view.setUint8(0, code);
		let ind = 1;

		for(let d in data) {
			if(typeof data[d] === 'string') {
				ind += string_to_buffer(data[d], view, ind);
			}
			else if(typeof data[d] === 'number') {
				ind += num_to_buffer(data[d], view, ind);
			}
			else if(data[d] instanceof ArrayBuffer) {
				ind += copy_buffer(data[d], view, ind);
			}
		}

		this.ws.send(buffer);
	},


	// Send a name for the server to use
	send_name: function(name) {
		this.send(opcode.JOIN, [name]);
	},


	// Events
	on: function(...args) { this._emitter.on(...args); },
	once: function(...args) { this._emitter.once(...args); }

};


export default LobbySocket;
