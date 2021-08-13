// The ball implementation for Pong

import EventEmitter from "events";


// Generate a random number in a range
function random(min, max) {
	return Math.random() * (max - min) + min;
}


class Ball {
	x = 0;
	y = 0;
	vel = { x: 0, y: 0 };

	size = 1; // % of normalized height (0 to 100)

	#emitter = new EventEmitter();


	reset() {
		this.x = 50;
		this.y = 50;

		this.vel.x = random(0.05, 0.08);
		if(Math.random() > 0.5) this.vel.x = -this.vel.x;

		this.vel.y = random(-0.01, 0.01);
	}


	update() {
		this.x += this.vel.x;
		this.y += this.vel.y;

		if(this.x < 0) {
			this.#emitter.emit('score', 'left');
			return;
		}
		else if(this.x > 100) {
			this.#emitter.emit('score', 'right');
			return;
		}

		if(this.y < this.size / 2) {
			this.y = this.size / 2;
			this.vel.y = -this.vel.y;
		}
		else if(this.y > 100 - this.size / 2) {
			this.y = 100 - this.size / 2;
			this.vel.y = -this.vel.y;
		}
	}


	// Check for collisions with players
	collide(p1, p2) {
		if(this.x < 0.06 && this.y > p1 - 0.15 && this.y < p1 + 0.15) {
			this.x = 0.05;
			this.vel.x = -this.vel.x * 1.005;
		}
		else if(this.x > 99.94 && this.y > p2 - 0.15 && this.x < p2 + 0.15) {
			this.x = 99.95;
			this.vel.x = -this.vel.x * 1.005;
		}
	}


	// Generate a buffer for a ball_update packet
	get_buffer(opcode) {
		const buf = Buffer.alloc(10);
		buf.writeUint16LE(opcode);

		buf.writeFloatBE(this.x, 2);
		buf.writeFloatBE(this.y, 6);

		return buf;
	}


	on(...args) { this.#emitter.on(...args); }
	once(...args) { this.#emitter.once(...args); }
}


export default Ball;
