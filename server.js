// Node.js HTTP server

// You can change this, or add a command-line argument specifying the port number
const settings = {
	default_port: 8080,

	redirects: {

	}
};


// Don't change these unless you want the server to break
const { CommandArg, Command, CommandList } = require('./cli.js');

const http = require('http');
const pfs = require('fs/promises');

// These give the browser information about what type of data it's receiving
const mime_types = {
	'txt': 'text/plain',
	'manifest': 'application/manifest',

	'html': 'text/html',
	'css': 'text/css',
	'js': 'text/javascript',
	'mjs': 'text/javascript',

	'png': 'image/png',
	'jpg': 'image/jpeg',
	'jpeg': 'image/jpeg',
	'ico': 'image/x-icon',

	'ttf': 'application/x-font-ttf' // Technically not needed
};


// Convert a request path to a filepath
function get_path(req_url) {
	if(!req_url.startsWith('/')) req_url = '/' + req_url;

	let last_part = req_url.slice(req_url.lastIndexOf('/') + 1);

	// Automatically serve index.html if not included in the request
	if(!last_part.includes('.')) {
		if(req_url.endsWith('/')) return req_url + 'index.html';
		else return req_url + '/index.html';
	}
	else return req_url;
}


// Handle HTTP requests
function on_request(req, res) {
	if(req.method !== 'GET') {
		console.log("Bad request method:", req.method, req.url);

		res.writeHead(400, { 'Content-Type': 'text/plain' });
		res.end("Bad request method");

		return;
	}

	// Redirects
	if(req.url in settings.redirects) {
		res.writeHead(302, { 'Location': settings.redirects[req.url] });
		res.end();
		return;
	}

	// Find the filepath and correct MIME type
	const path = get_path(req.url);
	const ext = path.slice(path.lastIndexOf('.') + 1);
	const mime = mime_types[ext] ?? 'text/plain';

	// Respond with the file or a 404 error
	pfs.readFile(`./src${path}`).then((data) => {
		res.writeHead(200, { 'Content-Type': mime });
		res.end(data);
	}).catch((err) => {
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('404 Not Found');
	});
}


// Create a CommandList instance and parse the Command-Line-Input (CLI)
const cmd_list = CommandList.from_commands([
	new Command('port', ['p'], [new CommandArg('port', true)], '[Optional] Specify a port to run the server on')
]);

const args = cmd_list.parse_args(process.argv);

// Get the desired port to host on
let host_port = settings.default_port;

if(args.length) {
	host_port = +args[0].args.port;

	if(isNaN(host_port)) {
		console.error("Invalid port:", args[0].args.port);
		process.exit(1);
	}
}

// Create the server and start listening for requests
const server = http.createServer(on_request);
server.listen(host_port, '127.0.0.1');

console.log(`Listening at 127.0.0.1:${host_port}`);
