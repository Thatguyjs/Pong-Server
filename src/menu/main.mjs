function element(id) {
	return document.getElementById(id);
}

async function fetch_text(url) {
	return await (await fetch(url)).text();
}

function show_error(message) {
	const elem = element('error-message');
	elem.innerText = message;

	setTimeout(() => {
		elem.classList.add('fade');

		setTimeout(() => {
			elem.innerText = '';
			elem.classList.remove('fade');
		}, 300);
	}, 1200);
}


sessionStorage.clear();


element('game-create').addEventListener('click', async () => {
	let auth = await fetch_text('/query?auth=game-create');

	if(auth === '') {
		show_error("You're not allowed to create a game");
	}
	else {
		const [game_key, player_key] = auth.split('\n');

		sessionStorage.setItem('game-key', game_key);
		sessionStorage.setItem('player-key', player_key);
		window.location.replace(`/create?game=${game_key}&user=${player_key}`);
	}
});


element('game-join').addEventListener('click', () => {
	element('game-join').classList.add('hidden');
	element('join-container').classList.remove('hidden');

	element('join-key').focus();
});

element('join-close').addEventListener('click', () => {
	element('join-container').classList.add('hidden');
	element('game-join').classList.remove('hidden');
});


element('join-key').addEventListener('keypress', async (evt) => {
	if(evt.code === 'Enter') {
		const join_key = element('join-key').value;
		let auth = await fetch_text(`/query?auth=game-join&key=${join_key}`);

		if(auth === '') {
			show_error("Invalid game key");
		}
		else {
			sessionStorage.setItem('game-key', join_key);
			sessionStorage.setItem('player-key', auth);
			window.location.assign(`/lobby?game=${join_key}`);
		}
	}
});
