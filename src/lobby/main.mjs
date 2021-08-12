import Player from "./player.mjs";

import { LobbySocket } from "/common/socket.mjs";
import Console from "/common/console.mjs";


function element(id) {
	return document.getElementById(id);
}


if(sessionStorage.getItem('game-owner') === 'true') {
	element('start-button').classList.remove('hidden');
}


const socket = new LobbySocket();
let players = [];

socket.on('auth', (success, message) => {
	if(success)
		Console.success("LobbySocket Authorized");
	else
		Console.error("Unauthorized:", message);
});

socket.on('player_join', (player) => {
	players.push(new Player(player.index, player.name, player.ping));
});

socket.on('player_update', (player) => {
	players[player.index].update(player.name, player.ping);
});


// Change / update the player's username
element('name-input').addEventListener('keypress', (evt) => {
	if(evt.code === 'Enter') {
		const new_name = element('name-input').value.trim();
		if(!new_name.length || new_name.length > 24) return;

		socket.update_name(new_name);
	}
});

socket.on('name_error', (message) => {
	Console.error("Name error:", message);
});


// Try to start the game
element('start-button').addEventListener('click', () => {
	socket.start_game();
});
