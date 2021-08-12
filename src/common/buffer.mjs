// Helper methods for data conversion / management


function buffer(data, length, buffer, offset) {
	if(typeof data !== 'string')
		throw new TypeError(`Expected a string for buffer(), got ${typeof data} instead`);

	length = length ?? data.length;

	if(!buffer) buffer = new ArrayBuffer(length);
	const view = new DataView(buffer);

	for(let i = 0; i < length; i++) {
		view.setUint8(offset + i, data.charCodeAt(i));
	}

	return buffer;
}


function array(data) {
	if(typeof data !== 'string')
		throw new TypeError(`Expected a string for buffer(), got ${typeof data} instead`);

	const length = data.length;
	let result = new Array(length * 2);

	for(let i = 0; i < length; i++) {
		const char = data.charCodeAt(i);
		result[i * 2] = char & 0xff;
		result[i * 2 + 1] = char >>> 8;
	}

	return result;
}


function join_buffers(buffers) {
	let length = 0;

	for(let b in buffers) {
		length += buffers[b].byteLength;
	}

	const result = new ArrayBuffer(length);
	const view = new DataView(result);

	let byte = 0;
	let buffer = 0;
	let buf_byte = 0;
	let src_view = new DataView(buffers[0]);

	while(byte < length) {
		while(buf_byte >= buffers[buffer].byteLength) {
			buf_byte = 0;
			buffer++;
			src_view = new DataView(buffers[buffer]);
		}

		view.setUint8(byte, src_view.getUint8(buf_byte));

		byte++;
		buf_byte++;
	}

	return result;
}


function stringify(buffer, offset=0) {
	if(!(buffer instanceof Uint16Array))
		throw new TypeError(`Expected a Uint16Array for stringify(), got ${typeof buffer} instead`);

	const length = buffer.length;
	let result = "";

	for(let i = offset; i < length; i++) {
		result += String.fromCharCode(buffer[i]);
	}

	return result;
}


export { buffer, array, join_buffers, stringify };
