// Command parsing


class CommandArg {
	name = "";
	required = false;

	constructor(name, required) {
		this.name = name;
		this.required = required ?? false;
	}
}


class Command {
	name = "";
	aliases = [];
	args = [];
	description = "";

	constructor(name, aliases, args, description) {
		this.name = name;
		this.aliases = aliases;
		this.args = args;
		this.description = description;
	}

	parse_args(arg_list) {
		let usable_args = [];

		let end = 0;
		while(end < arg_list.length && !arg_list[end].startsWith('-')) usable_args.push(arg_list[end++]);

		if(usable_args.length > this.args.length)
			return { error: true, message: 'Too many arguments' };

		let result = {};

		for(let a in this.args) {
			if(this.args[a].required) {
				if(!usable_args[a]) return { error: true, message: 'Not enough arguments' };
				result[this.args[a].name] = usable_args[a];
			}
			else if(usable_args[a]) {
				result[this.args[a].name] = usable_args[a];
			}
		}

		return { error: false, args: result };
	}
}


class CommandList {

	commands = [];
	#alias_map = {};


	constructor() {}

	static from_commands(commands) {
		const instance = new CommandList();

		for(let c in commands) {
			instance.add(commands[c]);
		}

		return instance;
	}


	add(command) {
		if(!command instanceof Command) throw new TypeError(`Expected type "Command", got "${typeof command}"`);

		for(let a in command.aliases) {
			this.#alias_map[command.aliases[a]] = command.name;
		}

		this.commands.push(command);
	}


	get_command(name) {
		for(let c in this.commands) {
			if(this.commands[c].name === name) return this.commands[c];
		}

		return null;
	}


	parse_args(args) {
		let start = 0;
		while(start < args.length && !args[start].startsWith('-')) start++;
		args = args.slice(start);

		if(!args.length) return [];

		const result = [];

		for(let a in args) {
			if(args[a][0] === '-' && args[a][1] !== '-') {
				args[a] = '--' + this.#alias_map[args[a].slice(1)];
			}

			if(args[a].startsWith('--')) {
				const command = this.get_command(args[a].slice(2));
				if(!command) continue;
				const cmd_args = command.parse_args(args.slice(+a + 1));

				if(!cmd_args.error) result.push({ command: command.name, error: false, args: cmd_args.args });
				else result.push({ command: command.name, error: true, message: cmd_args.message });
			}
		}

		return result;
	}


	// List all commands and relevant info
	show_help() {
		let max_length = 0;
		let commands = [];

		for(let c in this.commands) {
			let arg_str = "";

			for(let a in this.commands[c].args) {
				if(this.commands[c].args[a].required)
					arg_str += `[${this.commands[c].args[a].name}] `;
				else
					arg_str += `{${this.commands[c].args[a].name}} `;
			}

			let cmd_str = `${this.commands[c].name} ${arg_str}`;
			if(cmd_str.length > max_length) max_length = cmd_str.length;

			commands.push({ name: cmd_str, description: this.commands[c].description });
		}

		for(let c in commands) {
			let cmd_str = commands[c].name + ' '.repeat(max_length - commands[c].name.length);
			console.log(`${cmd_str}\t${commands[c].description}`);
		}
	}

}


module.exports = {
	CommandArg,
	Command,
	CommandList
};
