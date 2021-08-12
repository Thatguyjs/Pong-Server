function element(id) {
	return document.getElementById(id);
}


async function post_settings(settings) {
	return await fetch(`/create?settings=${JSON.stringify(settings)}`, { method: 'POST' });
}


element('continue').addEventListener('click', async () => {
	let settings = {
		name: element('setting-name').value.trim()
	};

	await post_settings(settings);

	sessionStorage.setItem('game-owner', true);
	window.location.assign(`/lobby?game=${sessionStorage.getItem('game-key')}`);
});
