// Basic URL parsing


// Parse a URL query
function parse_query(query) {
	const parts = query.split('&');
	let result = {};

	for(let p in parts) {
		let [key, value] = parts[p].split('=');
		key = key?.trim();
		value = value?.trim();

		result[key] = value;
	}

	return result;
}


function parse_url(url) {
	let result = { path: '', query: {} };

	if(!url.startsWith('/')) url = '/' + url;

	let paramStart = -1;
	if((paramStart = url.slice(url.lastIndexOf('/')).indexOf('?')) !== -1) {
		result.query = parse_query(url.slice(paramStart + 1));
		url = url.slice(0, paramStart);
	}

	if(url.endsWith('/') && url.length > 1) url = url.slice(0, -1);
	result.path = url;

	return result;
}


export { parse_url, parse_query };
