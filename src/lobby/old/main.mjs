import Player from "./player.mjs";
import LobbySocket from "./socket.mjs";
await LobbySocket.init();

import Console from "/common/console.mjs";


function element(id) {
	return document.getElementById(id);
}


element('name-submit').addEventListener('click', use_name);

element('name-input').addEventListener('keypress', (evt) => {
	if(evt.code !== 'Enter') return;
	use_name();
});


function use_name() {
	const name = element('name-input').value;
	// if(!name) return;
	
	LobbySocket.send_name(name);
	sessionStorage.setItem('player-name', name);

	element('name-overlay').classList.add('hidden');
}


const game_key = sessionStorage.getItem('game-key');
const player_key = sessionStorage.getItem('player-key');


const player_list = element('player-list');
const players = [new Player(-1, 'You', 0)];


LobbySocket.on('auth', (success, message) => {
	if(success) {
		Console.success("WS Authorized");

		if(sessionStorage.getItem('player-name')) {
			element('name-input').value = sessionStorage.getItem('player-name');
			use_name();
		}
	}
	else Console.error("WS Unauthorized:", message);
});

LobbySocket.on('player_list', (players) => {
	Console.debug("Player list:", players);
});

LobbySocket.on('player_join', (player) => {
	Console.info("Player join:", player);
});

LobbySocket.on('player_update', (data) => {
	const players = data.split('\n');
	for(let p in players) players[p] = players[p].split(' ');

	console.log(players);
});

LobbySocket.on('join_error', (message) => {
	Console.error("Join Error:", message);
	element('name-overlay').classList.remove('hidden');
});
