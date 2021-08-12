// This is pong server

import { HttpServer } from "./http/export.mjs";
import { Frame, SocketServer } from "./ws/export.mjs";
import { LobbyManager, GameManager } from "./game/export.mjs";

import { settings } from "./settings.mjs";
import Console from "./util/console.mjs";
import Query from "./util/query.mjs";

import http from "http";
import pfs from "fs/promises";


// HTTP stuff
const http_server = new HttpServer(settings.ip, settings['http-port']);

http_server.redirects = {
	'/': '/menu'
};

http_server.interrupt('/query', Query.interrupt.bind(Query));


// WebSocket stuff
const ws_server = new SocketServer(settings.ip, settings['ws-port']);

ws_server.on('disconnect', (reason, sk_info) => {
	// console.log("Disconnect:", reason, sk_info);
});

// LobbyManager.init(ws_server);
GameManager.init(ws_server);


http_server.listen();
Console.info(`HTTP server started at: ${http_server.ip}:${http_server.port}`);

ws_server.listen();
Console.info(`WS server started at: ${ws_server.ip}:${ws_server.port}`);
