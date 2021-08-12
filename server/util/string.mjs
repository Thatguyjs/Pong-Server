// Generate random (printable) strings


// Generate a random number within a range
function random(min, max) {
	return Math.random() * (max - min) + min;
}


export default function(length, url_safe) {
	const bytes = Buffer.alloc(length);

	for(let i = 0; i < length; i++) {
		const part = Math.random() * 3;

		if(part <= 1) bytes[i] = random(45, 57);
		else if(part <= 2) bytes[i] = random(65, 90);
		else bytes[i] = random(97, 122);
	}

	if(url_safe) return bytes.toString().replaceAll(/\/|\&|\#/g, '-');
	return bytes.toString();
}
