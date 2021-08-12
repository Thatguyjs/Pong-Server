// A simple WebSocket implementation

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
	#connections = [];

	#emitter = new EventEmitter();

	constructor(ip, port) {
		this.ip = ip;
		this.port = port;

		this.#server.on('upgrade', this.#upgrade.bind(this));

		// Prevent the program from crashing if there are no error listeners
		this.#emitter.on('error', () => {});
	}


	// Receive an 'upgrade' request to the ws:// protocol
	#upgrade(req, socket) {
		if(is_banned(req.client.remoteAddress)) {
			// TODO: Log this?
			socket.destroy(); // Immediately close the connection
			return;
		}

		if(req.headers.upgrade.toLowerCase() !== 'websocket' || !ServerAuth.is_authorized(req)) {
			socket.destroy();
			return;
		}

		const ws_accept = generate_ws_accept(req.headers);

		socket.write([
			'HTTP/1.1 101 Switching Protocols',
			'Upgrade: WebSocket',
			'Connection: Upgrade',
			`Sec-WebSocket-Accept: ${ws_accept}`
		].join('\r\n') + '\r\n\r\n');

		// Clean up the connection list
		let end_index = this.#connections.length;
		while(--end_index >= 0 && this.#connections[end_index] === null) this.#connections.pop();

		let index = this.#connections.push(socket) - 1;

		socket.on('data', this.#data.bind(this, index));
		socket.on('error', (err) => {
			this.#emitter.emit("error", {
				message: err.message,
				index,
				socket
			});
		});
	}


	// Receive data from a socket
	#data(socket_ind, data) {
		const socket = this.#connections[socket_ind];
		const frame = Frame.read(data);

		// Invalid frame (too large)
		if(frame === null) return this.#emitter.emit("error", {
			message: "Invalid frame received",
			socket
		});

		// Invalid frame (missing mask), disconnect
		if(!frame.mask) {
			this.#emitter.emit("error", {
				message: "Frame missing mask",
				socket
			});

			this.disconnect(socket_ind, "Frame missing mask");
			return;
		}

		// Text or binary data
		if(frame.opcode === Frame.TEXT || frame.opcode === Frame.BINARY) {
			this.#emitter.emit("message", frame, socket_ind);
		}

		// Close the connection
		if(frame.opcode === Frame.CLOSE) {
			this.disconnect(socket_ind, frame.data);
		}

		// Ping
		else if(frame.opcode === Frame.PING) {
			this.#emitter.emit("ping", frame, socket_ind);

			const pong = Frame.write(Frame.PONG, frame.data);
			socket.write(pong);
		}

		// Pong
		else if(frame.opcode === Frame.PONG) {
			this.#emitter.emit("pong", frame, socket_ind);
		}
	}


	listen() {
		this.#server.listen(this.port, this.ip);
	}

	close(callback) {
		this.#server.close(callback);
	}



	// Send data to a socket
	send(index, opcode, data) {
		if(typeof opcode === 'string') {
			data = opcode;
			opcode = Frame.TEXT;
		}
		else if(Buffer.isBuffer(opcode)) {
			data = opcode;
			opcode = Frame.BINARY;
		}

		const socket = this.#connections[index];
		if(!socket) return false;

		socket.write(Frame.write(opcode, data));
		return true;
	}


	// Disconnect a socket
	disconnect(index, reason=null) {
		if(this.#connections[index] === null) return;
		const close_frame = Frame.write(Frame.CLOSE, reason);

		this.#connections[index].write(close_frame);
		this.#connections[index].end();

		this.#emitter.emit('disconnect', reason, this.#connections[index]);
		this.#connections[index] = null;
	}


	on(...args) { this.#emitter.on(...args); }
	once(...args) { this.#emitter.once(...args); }
}


export { Frame, SocketServer };
