// Authorize users

import gen_string from "./string.mjs";
import { settings } from "../settings.mjs";
import Console from "./console.mjs";

import EventEmitter from "events";
const emitter = new EventEmitter();


// Parse a request cookie into a JS object
function parse_cookie(cookie) {
	if(!cookie || typeof cookie !== 'string') return {};

	let vars = cookie.split(';');
	let result = {};

	for(let v in vars) {
		if(!vars[v].length) continue;

		let [key, value] = vars[v].split('=');
		key = key?.trim();
		value = value?.trim();

		result[key] = value;
	}

	return result;
}


const ServerAuth = {

	ADMIN: 0,
	GUEST: 1,

	keys: {},
	sessions: [],


	// Initialize keys & timeouts
	init: function() {
		Console.info("Admin keys generated:");
		for(let i = 0; i < settings.keys.admin.amount; i++) {
			const key_str = gen_string(settings.keys.admin.length);

			this.keys[key_str] = {
				type: ServerAuth.ADMIN,
				timestamp: Date.now(),
				uses: 0
			};

			console.log(Console.style(['green'], `  ${key_str}`));
		}

		Console.info("Guest keys generated:");
		for(let i = 0; i < settings.keys.guest.amount; i++) {
			const key_str = gen_string(settings.keys.guest.length);

			this.keys[key_str] = {
				type: ServerAuth.GUEST,
				timestamp: Date.now(),
				uses: 0
			};

			console.log(Console.style(['green'], `  ${key_str}`));
		}

		setInterval(() => {
			this.update_keys(ServerAuth.ADMIN);
		}, settings.keys.admin.expiration * 60 * 1000);

		setInterval(() => {
			this.update_keys(ServerAuth.GUEST);
		}, settings.keys.guest.expiration * 60 * 1000);
	},


	// Update a single key & associated sessions
	update_key: function(key) {
		const old_type = this.keys[key].type;
		delete this.keys[key];

		const key_length = old_type === ServerAuth.ADMIN ? settings.keys.admin.length : settings.keys.guest.length;
		const new_key = gen_string(key_length);
		this.keys[new_key] = { type: old_type, timestamp: Date.now() };

		for(let s in this.sessions) {
			if(this.sessions[s].key === key) {
				this.sessions[s].key = new_key;
			}
		}

		Console.info(`${old_type === ServerAuth.ADMIN ? "ADMIN" : "GUEST"} key updated: ${Console.style(['green'], new_key)}`);
	},


	// Update keys if they've expired (expiration times are in settings.json)
	update_keys: function(type) {
		const now = Date.now();

		for(let k in this.keys) {
			if(this.keys[k].type !== type) continue;

			const age = now - this.keys[k].timestamp;

			switch(type) {
				case ServerAuth.ADMIN:
					if(age >= settings.keys.admin.expiration * 60 * 1000) {
						this.update_key(k);
					}
					break;

				case ServerAuth.GUEST:
					if(age >= settings.keys.guest.expiration * 60 * 1000) {
						this.update_key(k);
					}
					break;
			}
		}
	},


	// Accept a connection & start their 'session'
	add_session: function(request, key) {
		if(this.keys[key].type === ServerAuth.GUEST && this.sessions.length >= settings['max-sessions']) {
			return '';
		}

		{
			const key_type = this.keys[key].type === ServerAuth.ADMIN ? "ADMIN" : "GUEST";
			const styled_ip = Console.style(['magenta'], request.connection.remoteAddress.toString());

			Console.info(`${key_type} joined from ${styled_ip}`);
		}

		const cookie = gen_string(32);

		this.sessions.push({
			key,
			auth: cookie,
			ip: request.connection.remoteAddress
		});

		this.keys[key].uses++;

		switch(this.keys[key].type) {
			case ServerAuth.ADMIN:
				if(this.keys[key].uses >= settings.keys.admin.uses) {
					this.update_key(key);
				}
				break;

			case ServerAuth.GUEST:
				if(this.keys[key].uses >= settings.keys.guest.uses) {
					this.update_key(key);
				}
				break;
		}

		return cookie;
	},


	// Check if a request is authorized
	is_authorized: function(req) {
		const cookie = parse_cookie(req.headers.cookie);
		if(!('auth' in cookie)) return false;

		for(let s in this.sessions) {
			if(this.sessions[s].auth === cookie.auth) {
				return true;
			}
		}

		return false;
	},


	// Authorize a session if they provide a valid key
	try_auth: function(req) {
		return new Promise((resolve, reject) => {
			let data = Buffer.alloc(128);
			let length = 0;

			// Read the request body
			req.on('data', (chunk) => {
				if(chunk.length + length >= 128) {
					return resolve('');
				}

				chunk.copy(data, length); // Length is used as the offset
				length += chunk.length;
			});

			// Decode the key and check for a match
			req.on('end', (...args) => {
				if(length >= 128) return;
				if(length - 4 <= 0) return resolve('');

				const data_key = data.slice(0, 4);
				let key = data.slice(4, length);

				for(let i = 0; i < length - 4; i++) {
					key[i] = key[i] ^ data_key[i % 4];
				}

				key = key.toString();

				if(key in this.keys) {
					resolve(this.add_session(req, key));
				}
				else resolve('');
			});
		});
	},


	on: function(...args) { emitter.on(...args); },
	once: function(...args) { emitter.once(...args); }

};


ServerAuth.init();
export default ServerAuth;
