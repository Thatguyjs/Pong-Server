// A static file server

import ServerAuth from "../util/auth.mjs";
import { parse_url } from "../util/url.mjs";
import { is_banned } from "../settings.mjs";

import pfs from "fs/promises";
import http from "http";
import EventEmitter from "events";


// Get the correct MIME type for a request url
function get_mime(url) {
	if(!url.includes('.')) return null;
	const ext = url.slice(url.lastIndexOf('.') + 1);

	// Found at https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
	return {
		'bin': 'application/octet-stream',
		'txt': 'text/plain',
		'csv': 'text/csv',
		'json': 'application/json',

		'html': 'text/html',
		'xml': 'text/xml',

		'css': 'text/css',

		'js': 'text/javascript',
		'mjs': 'application/javascript',

		'png': 'image/png',
		'jpg': 'image/jpeg',
		'jpeg': 'image/jpeg',
		'tif': 'image/tiff',
		'tiff': 'image/tiff',
		'gif': 'image/gif',
		'ico': 'image/x-icon',

		'ttf': 'font/ttf',
		'otf': 'font-otf',
		'woff': 'font-woff',
		'woff2': 'font-woff2'
	}[ext] ?? null;
}


class HttpServer {
	static CONTINUE = 0;
	static CANCEL = 1;

	ip = '';
	port = null;
	redirects = {};

	#server = http.createServer();
	#error_pages = {};

	#emitter = new EventEmitter();
	#interrupts = {};

	constructor(ip, port) {
		this.ip = ip;
		this.port = port;

		this.#server.on('request', this.#request.bind(this));

		// Prevent the program from crashing if there are no error listeners
		this.#emitter.on('error', () => {});
	}


	// Write an error page body to a response
	async #write_error_page(error, res) {
		let data = await pfs.readFile(this.#error_pages[error]);
		res.end(data);
	}


	// Receive a request
	async #request(req, res) {
		if(is_banned(req.client.remoteAddress)) {
			// TODO: Log this?
			req.connection.destroy(); // Immediately close the connection
			return;
		}

		if(req.method === 'POST' && req.url === '/auth') {
			const auth_res = await ServerAuth.try_auth(req);

			res.writeHead(200, { 'Content-Type': 'text/plain', 'Connection': 'close' });
			res.write(auth_res);
		}

		let url = parse_url(req.url);

		// Check for authentication
		if(!url.path.startsWith('/auth') && !ServerAuth.is_authorized(req)) {
			res.writeHead(302, { 'Location': '/auth' });
			res.end();
			return;
		}

		// Check for interrupts
		if(url.path in this.#interrupts) {
			if(this.#interrupts[url.path](url, req, res) === HttpServer.CANCEL) {
				return;
			}
		}

		// Reject all non-GET requests for content
		if(req.method !== 'GET') {
			res.end();
			return;
		}

		// Check for redirects
		if(url.path in this.redirects) {
			res.writeHead(302, { 'Location': this.redirects[url.path] }); // Not 301, stops browsers from auto-redirecting in the future
			res.end();
			return;
		}

		// Serve a static file
		if(!url.path.slice(url.path.lastIndexOf('/') + 1).includes('.')) url.path += '/index.html';
		const mime = get_mime(url.path);

		pfs.readFile(`../src${url.path}`).then((data) => {
			if(mime !== null) res.writeHead(200, { 'Content-Type': mime });
			else res.writeHead(200);

			res.end(data);
		}).catch(() => {
			const err_mime = get_mime(this.#error_pages[404] ?? '');
			if(err_mime !== null) res.writeHead(404, { 'Content-Type': err_mime });
			else res.writeHead(404);

			this.#write_error_page(404, res).catch(() => {
				res.end("404 Not Found");
			});
		});
	}


	// Set an error page
	set_error_page(error_code, page_path) {
		this.#error_pages[error_code] = page_path;
	}


	// Add a request interrupt
	interrupt(path, callback) {
		this.#interrupts[path] = callback;
	}


	listen() {
		this.#server.listen(this.port, this.ip);
	}

	close(callback) {
		this.#server.close(callback);
	}


	on(...args) { this.#emitter.on(...args); }
	once(...args) { this.#emitter.once(...args); }
}


export default HttpServer;
