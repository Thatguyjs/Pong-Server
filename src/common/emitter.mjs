// An EventEmitter-like implementation for browsers


function expect_type(type, type_name, data) {
	if(typeof data !== type)
		throw new TypeError(`Expected ${type_name} to be a ${type}, got ${typeof data} instead.`);
}


class EventEmitter {
	#events = {};


	// Listen for events

	#add_listener(event_name, listener, once) {
		if(!(event_name in this.#events))
			this.#events[event_name] = [];

		this.#events[event_name].push({ listener, once });
	}

	on(event_name, listener) {
		expect_type('string', 'event_name', event_name);
		expect_type('function', 'listener', listener);

		this.#add_listener(event_name, listener, false);
	}

	once(event_name, listener) {
		expect_type('string', 'event_name', event_name);
		expect_type('function', 'listener', listener);

		this.#add_listener(event_name, listener, true);
	}


	// Emit events

	emit(event_name, ...args) {
		if(!(event_name in this.#events))
			return;

		let ind = 0;

		while(ind < this.#events[event_name].length) {
			this.#events[event_name][ind].listener(...args);

			if(this.#events[event_name][ind].once)
				this.#events[event_name].splice(ind, 1);
			else ind++;
		}
	}
}


export default EventEmitter;
