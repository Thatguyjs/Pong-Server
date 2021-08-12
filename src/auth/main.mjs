function verify() {
	const value = document.getElementById('key').value;
	const length = value.length;
	// if(!value.length) return;

	const bytes = new Uint8Array(4);
	window.crypto.getRandomValues(bytes);

	let result = new Uint8Array(4 + length);
	for(let i = 0; i < 4; i++) result[i] = bytes[i];

	for(let i = 0; i < length; i++) {
		result[i + 4] = value.charCodeAt(i) ^ bytes[i % 4];
	}

	fetch(`/auth`, { method: 'POST', body: result }).then(async (res) => {
		const data = await res.text();

		if(!data.length) {}
		else {
			document.cookie = `auth=${data};`;
			window.location.href = "/";
		}
	});
}


document.getElementById('key').addEventListener('keypress', (evt) => {
	if(evt.code === 'Enter') verify();
});

document.getElementById('verify').addEventListener('click', verify);
