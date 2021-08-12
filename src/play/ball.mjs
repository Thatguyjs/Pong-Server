import Net from "./net.mjs";


function random(min, max) {
	return Math.random() * (max - min) + min;
}


function constrain(val, min, max) {
	if(val < min) val = min;
	else if(val > max) val = max;

	return val;
}


class Ball {
	x = 0;
	y = 0;

	size = 10;

	constructor() {
		Net.socket.on('ball_update', (ball) => {
			this.x = ball.x;
			this.y = ball.y;
		});
	}


	render(ctx) {
		ctx.fillStyle = '#fff';
		ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
	}
}


export default Ball;
