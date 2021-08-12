// Handle HTTP requests for /query

import { HttpServer } from "../http/export.mjs";
import { GameManager } from "../game/export.mjs";
import ServerAuth from "./auth.mjs";
import { settings } from "../settings.mjs";


const Query = {

	interrupt: function(url, req, res) {
		let cancel = false;

		switch(url.query.get) {

			case 'ws-port':
				res.writeHead(200);
				res.end(settings['ws-port'].toString());
				cancel = true;
				break;

		}

		if(cancel) return HttpServer.CANCEL;

		switch(url.query.auth) {

			case 'game-create':
				res.writeHead(200);
				res.end(this.auth_game_create(url));
				cancel = true;
				break;

			case 'game-join':
				res.writeHead(200);
				res.end(this.auth_game_join(url));
				cancel = true;
				break;

		}

		return cancel ? HttpServer.CANCEL : HttpServer.CONTINUE;
	},


	auth_game_create: function(url) {
		// TODO: Check permissions of user
		if(GameManager.available > 0) {
			let game_key = GameManager.create_game();
			return game_key + '\n' + GameManager.gen_admin_key(game_key);
		}
		return '';
	},


	auth_game_join: function(url) {
		if(GameManager.is_joinable(url.query.key))
			return GameManager.gen_player_key(url.query.key);
		return '';
	}

};


export default Query;
