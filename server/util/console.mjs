// Console with built-in logging (TODO), and color support


const style = {
	RESET: 0,
	BRIGHT: 1,
	DIM: 2,

	ITALIC: 3,
	BLINK: 5,
	HIGHLIGHT: 7,
	STRIKE: 9,

	BLACK: 30,
	RED: 31,
	GREEN: 32,
	YELLOW: 33,
	BLUE: 34,
	MAGENTA: 35,
	CYAN: 36,
	WHITE: 37
};


// Apply a style to a string
function apply_style(value, string, reset=true) {
	if(!Array.isArray(value)) value = [value];
	let result = '';

	for(let v in value) {
		let code = style[value[v].toUpperCase()];

		if(value[v].startsWith('BG_')) {
			code = style[value[v].slice(3).toUpperCase()] + 10;
		}

		if(code === undefined) continue;
		result += `\x1b[${code}m`;
	}

	result += string;
	if(reset) result += '\x1b[0m';

	return result;
}


const Console = {

	style,

	level: {
		DEBUG: 0,
		INFO: 1,
		SUCCESS: 2,
		WARN: 3,
		ERROR: 4
	},

	level_style: {
		DEBUG: ['italic', 'purple'],
		INFO: ['italic', 'cyan'],
		SUCCESS: ['italic', 'green'],
		WARN: ['italic', 'yellow'],
		ERROR: ['italic', 'red']
	},


	// Console output
	LOG_LEVEL: 0,

	debug: function(...args) {
		console.log(apply_style(this.level_style.DEBUG, '[debug]'), ...args);
	},

	info: function(...args) {
		console.log(apply_style(this.level_style.INFO, '[info]'), ...args);
	},

	success: function(...args) {
		console.log(apply_style(this.level_style.SUCCESS, '[success]'), ...args);
	},

	warn: function(...args) {
		console.log(apply_style(this.level_style.WARN, '[warn]'), ...args);
	},

	error: function(...args) {
		console.log(apply_style(this.level_style.ERROR, '[error]'), ...args);
	},

	style: function(style, ...args) {
		return apply_style(style, args.join(' '));
	}

};


export default Console;
