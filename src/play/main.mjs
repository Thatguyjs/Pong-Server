// import Renderer from './renderer/include.mjs';
import Player from './player.mjs';
import Ball from './ball.mjs';

import Net from './net.mjs';


const bit_font = new FontFace('8-bit', 'url(/fonts/Chakra_Petch/ChakraPetch-Regular.ttf)');

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width = window.innerWidth;
let height = window.innerHeight;


function resize() {
	width = window.innerWidth;
	height = window.innerHeight;

	canvas.width = width;
	canvas.height = height;
}

window.addEventListener('resize', resize);
resize();


function clear(color=null) {
	ctx.clearRect(0, 0, width, height);

	let tempColor = ctx.fillStyle;

	if(color !== null) ctx.fillStyle = color;
	ctx.fillRect(0, 0, width, height);
	ctx.fillStyle = tempColor;
}


function text(text, x, y, size=16) {
	ctx.font = `${size}px "8-bit"`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(text, x, y);
}


const player_1 = new Player(Player.LEFT, Player.LOCAL);
const player_2 = new Player(Player.RIGHT, Player.NET);

const ball = new Ball();


Net.socket.on('position', (position) => {
	player_1.position = position;
	player_2.position = +!position;
});


// window.addEventListener('keypress', (evt) => {
// 	if(evt.code === 'Space') {
// 		paused = !paused;
// 	}
// });


function render() {
	clear('#000');

	ctx.fillStyle = "#fff";
	text(Net.state.scores[0], width / 2 - 100, 80, 80);
	text(Net.state.scores[1], width / 2 + 100, 80, 80);

	ctx.fillStyle = "#222";
	for(let i = 0; i < 20; i++) {
		ctx.fillRect(width / 2 - 2, height / 20 * i, 4, height / 30);
	}

	if(!Net.state.paused) {
		player_1.update();
		player_2.update();
	}
	else {
		ctx.fillStyle = "#888";
		text("Press [space] to resume", width / 2, height - 40, 28);
	}

	player_1.render(ctx);
	player_2.render(ctx);

	if(Net.state.won) return show_win(Net.state.winner);

	ball.render(ctx);

	// TODO: Check for score

	window.requestAnimationFrame(render);
}

bit_font.load().then((font) => {
	document.fonts.add(font);
	window.requestAnimationFrame(render);
});


function show_win(player) {
	ctx.fillStyle = "#fff";
	text(`Player ${player} wins!`, width / 2, height / 2, 80);

	ctx.fillStyle = "#555";
	text("Press [space] to restart", width / 2, height - 40, 32);

	window.addEventListener('keypress', (evt) => {
		if(evt.code === "Space") window.location.reload();
	});
}
