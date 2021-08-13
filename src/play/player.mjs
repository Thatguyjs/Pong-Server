// Player controller

import Net from "./net.mjs";


function lerp(from, to, amount) {
	return from + (to - from) * amount;
}


function constrain(val, min, max) {
	if(val < min) val = min;
	else if(val > max) val = max;

	return val;
}


class Player {
	static LEFT = 0;
	static RIGHT = 1;

	static LOCAL = 2;
	static NET = 3;

	position = null;

	input_mode = 0;
	input_keys = {};
	#keys = { up: false, down: false };

	x = 0;
	y = 50;
	vel = { x: 0, y: 0 };

	width = 8; // px
	height = 1.2; // % of height

	constructor(position, input_mode) {
		if(position < 0 || position > 1) throw new RangeError("Invalid position: " + position);
		if(input_mode < 2 || input_mode > 3) throw new RangeError("Invalid input keys: " + input_mode);

		this.position = position;
		this.input_mode = input_mode;

		if(input_mode === Player.LOCAL)
			this.input_keys = { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'] };
		else
			this.input_keys = { up: [], down: [] };

		window.addEventListener('keydown', (evt) => {
			if(this.input_keys.up.includes(evt.code))
				this.#keys.up = true;
			else if(this.input_keys.down.includes(evt.code))
				this.#keys.down = true;
		});

		window.addEventListener('keyup', (evt) => {
			if(this.input_keys.up.includes(evt.code))
				this.#keys.up = false;
			else if(this.input_keys.down.includes(evt.code))
				this.#keys.down = false;
		});
	}


	reset() {
		if(this.position === Player.LEFT) this.x = 60;
		else this.x = window.innerWidth - 60;

		let interval = setInterval(() => {
			this.y = lerp(this.y, window.innerHeight / 2, 0.1);
		}, 10);

		setTimeout(clearInterval, 300, interval);

		this.vel.x = 0;
		this.vel.y = 0;
	}


	update() {
		if(this.position === Player.LEFT) this.x = 60;
		else this.x = window.innerWidth - 60;

		let slow = true;

		if(this.#keys.up) {
			this.vel.y = lerp(this.vel.y, -14, 0.1);
			slow = false;
		}
		if(this.#keys.down) {
			this.vel.y = lerp(this.vel.y, 14, 0.1);
			slow = false;
		}

		if(slow) this.vel.y = lerp(this.vel.y, 0, 0.12);

		this.x += this.vel.x;
		this.y += this.vel.y;

		if(this.input_mode === Player.NET) {
			this.y = Net.opponent_pos / 100 * (window.innerHeight - this.height) + this.height / 2;
		}

		this.y = constrain(this.y, this.height / 2, window.innerHeight - this.height / 2);

		if(this.input_mode === Player.LOCAL) {
			Net.send_update(this);
		}
	}


	render(ctx) {
		const height = this.height * 100;

		ctx.fillStyle = '#ffffff';
		ctx.fillRect(this.x - this.width / 2, this.y - height / 2, this.width, height);
	}
}




export default Player;
