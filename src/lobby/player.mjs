const player_list = document.getElementById('player-list');


class Player {
	index = -1;
	name = "";
	ping = -1;

	#element = null;

	constructor(index, name, ping) {
		this.index = index;
		this.name = name;
		this.ping = ping ?? -1;

		this.#element = this.#create_elements();
		player_list.appendChild(this.#element);
	}


	#create_elements() {
		const base = document.createElement('div');
		base.classList.add('player');

		const name = document.createElement('span');
		name.classList.add('player-name');
		name.innerText = this.name;

		const ping = document.createElement('span');
		ping.classList.add('player-ping');
		ping.innerText = this.ping + ' ms';

		base.appendChild(name);
		base.appendChild(ping);

		return base;
	}

	#update_elements() {
		this.#element.querySelector('.player-name').innerText = this.name;
		this.#element.querySelector('.player-ping').innerText = this.ping + ' ms';
	}


	update(name, ping) {
		this.name = name ?? this.name;
		this.ping = ping ?? this.ping;

		this.#update_elements();
	}

	destroy() {
		player_list.removeChild(this.#element);
		this.#element = null;
	}
}


export default Player;
