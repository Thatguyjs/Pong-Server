// A custom WebSocket server for pong

import Frame from "./frame.mjs";
import ServerAuth from "../util/auth.mjs";
import { parse_url } from "../util/url.mjs";
import { is_banned } from "../settings.mjs";

import http from "http";
import crypto from "crypto";
import EventEmitter from "events";


// Generate the WebSocket accept key
function generate_ws_accept(headers) {
	const magic = headers['sec-websocket-key'] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
	const hash = crypto.createHash('sha1');

	hash.update(magic);
	return hash.digest().toString('base64');
}


class SocketServer {
	ip = '';
	port = null;

	#server = http.createServer();
	#connections = {}; // Stores connections per URL
	#info = {}; // Stores extra socket info (for external use)

	#emitter = new EventEmitter();

	constructor(ip, port) {
		this.ip = ip;
		this.port = port;

		this.#server.on('upgrade', this.#upgrade.bind(this));

		// Prevent crashes when no error listeners are active
		this.#emitter.on('error', () => {});
	}


	// Clean up a connection & info list
	#clean_connections(path) {
		if(!this.#connections[path]) return;

		let ind = this.#connections[path].length;

		while(--ind >= 0 && this.#connections[path][ind] === null) {
			this.#connections[path].pop();
			this.#info[path].pop();
		}

		// No more connections, delete the path to (potentially) save memory
		if(ind < 0) {
			delete this.#connections[path];
			delete this.#info[path];
		}
	}


	// Add a connection
	#add_connection(path, socket) {
		if(!this.#connections[path]) {
			this.#connections[path] = [];
			this.#info[path] = [];
		}

		const index = this.#connections[path].push(socket) - 1;
		this.#info[path].push({});

		return index;
	}


	// Upgrade a request to the WebSocket protocol
	#upgrade(req, socket) {
		if(is_banned(req.client.remoteAddress)) {
			// TODO: Log this?
			socket.destroy(); // Immediately terminate the connection
			return;
		}

		if(req.headers.upgrade?.toLowerCase() !== 'websocket' || !ServerAuth.is_authorized(req)) {
			socket.destroy();
			return;
		}

		// Accept the connection
		const accept = generate_ws_accept(req.headers);

		socket.write([
			'HTTP/1.1 101 Switching Protocols',
			'Upgrade: WebSocket',
			'Connection: Upgrade',
			`Sec-WebSocket-Accept: ${accept}`
		].join('\r\n') + '\r\n\r\n');

		// Add the socket to the correct connection list
		const url = parse_url(req.url);

		this.#clean_connections(url.path);
		const index = this.#add_connection(url.path, socket);

		// Handle socket events
		socket.on('data', this.#data.bind(this, { path: url.path, index }));

		socket.on('error', (err) => {
			this.#emitter.emit('error', {
				message: err.message,
				path: url.path,
				index,
				socket
			});
		});
	}


	// Receive data from a socket
	#data(sk_info, data) {
		const socket = this.#connections[sk_info.path][sk_info.index];
		const info = this.#info[sk_info.path][sk_info.index];
		const frame = Frame.read(data);

		if(frame === null) {
			this.#emitter.emit('error', {
				message: "Received an invalid frame",
				socket
			});

			return;
		}

		// Disconnect if the frame is missing a mask
		// source: https://datatracker.ietf.org/doc/html/rfc6455#section-5.1
		if(!frame.mask) {
			this.#emitter.emit('error', {
				message: "Received an unmasked frame",
				socket
			});

			this.disconnect(sk_info, "Frame missing mask");
			return;
		}

		// Text / binary data
		if(frame.opcode === Frame.TEXT || frame.opcode === Frame.BINARY) {
			this.#emitter.emit('message', frame, sk_info, info);
		}

		// Close opcode
		else if(frame.opcode === Frame.CLOSE) {
			this.disconnect(sk_info);
		}

		// Ping
		else if(frame.opcode === Frame.PING) {
			this.#emitter.emit('ping', frame, sk_info, info);

			const pong = Frame.write(Frame.PONG, frame.data);
			socket.write(pong);
		}

		// Pong
		else if(frame.opcode === Frame.PONG) {
			this.#emitter.emit('pong', frame, sk_info, info);
		}
	}


	// Start listening
	listen() {
		this.#server.listen(this.port, this.ip);
	}

	// Stop listening
	close(callback) {
		this.#server.close(callback);
	}


	// Send data to a socket
	send(sk_info, opcode, data) {
		if(typeof opcode === 'string') {
			data = opcode;
			opcode = Frame.TEXT;
		}
		else if(Buffer.isBuffer(opcode)) {
			data = opcode;
			opcode = Frame.BINARY;
		}

		const socket = this.#connections[sk_info.path][sk_info.index];
		if(!socket) return false;

		socket.write(Frame.write(opcode, data));
		return true;
	}


	// Disconnect a socket
	disconnect(sk_info, reason=null, send_frame=true) {
		const socket = this.#connections[sk_info.path][sk_info.index];
		if(!socket) return false;

		if(send_frame) {
			const close_frame = Frame.write(Frame.CLOSE, reason);
			socket.write(close_frame);
		}

		socket.end();

		this.#emitter.emit('disconnect', reason, sk_info);
		this.#connections[sk_info.path][sk_info.index] = null;
		this.#info[sk_info.path][sk_info.index] = null;
	}


	// Add / set extra info for a socket
	setInfo(sk_info, info) {
		if(!(sk_info.path in this.#info) || !this.#info[sk_info.path][sk_info.index]) return;
		this.#info[sk_info.path][sk_info.index] = info;
	}


	on(...args) { this.#emitter.on(...args); }
	once(...args) { this.#emitter.once(...args); }
}


export default SocketServer;
