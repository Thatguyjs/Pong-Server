// Custom styled logging


const style = {
	black: "#0C0C0C",
	red: "#C50F1F",
	green: "#13A10E",
	yellow: "#C19C00",
	blue: "#0037DA",
	magenta: "#881798",
	cyan: "#3A96DD",
	white: "#CCCCCC"
};


function apply_color(color) {
	return `font-style: italic; color: ${style[color]};`;
}


const Console = {

	level: {
		DEBUG: 0,
		INFO: 1,
		SUCCESS: 2,
		WARN: 3,
		ERROR: 4
	},

	level_style: {
		DEBUG: 'magenta',
		INFO: 'cyan',
		SUCCESS: 'green',
		WARN: 'yellow',
		ERROR: 'red'
	},


	debug: function(...args) {
		console.log("%c[debug]", apply_color(this.level_style.DEBUG), ...args);
	},


	info: function(...args) {
		console.log("%c[info]", apply_color(this.level_style.INFO), ...args);
	},


	success: function(...args) {
		console.log("%c[success]", apply_color(this.level_style.SUCCESS), ...args);
	},


	warn: function(...args) {
		console.log("%c[warn]", apply_color(this.level_style.WARN), ...args);
	},


	error: function(...args) {
		console.log("%c[error]", apply_color(this.level_style.ERROR), ...args);
	}

};


export default Console;
