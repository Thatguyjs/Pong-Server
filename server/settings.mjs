// Read / parse / apply settings, and provide useful utilities

import fs from "fs";

const settings = JSON.parse(fs.readFileSync('./settings.json'));


// Checks if a user is IP-banned
function is_banned(ip) {
	return settings['ip-bans'].includes(ip);
}


export {
	settings,
	is_banned
};
