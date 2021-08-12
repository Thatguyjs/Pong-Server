// The ball implementation for Pong

import EventEmitter from "events";


class Ball {
	x = 0;
	y = 0;
	vel = { x: 0, y: 0 };

	size = 1; // % of normalized height (0 to 100)

	#emitter = new EventEmitter();


	reset() {
		this.x = 50;
		this.y = 50;

		// TODO: Random velocity
		this.vel.x = 0;
		this.vel.y = 0;
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
		// TODO
	}


	on(...args) { this.#emitter.on(...args); }
	once(...args) { this.#emitter.once(...args); }
}


export default Ball;
