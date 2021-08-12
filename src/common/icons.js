(async function() {
	'use strict';

	const icon_src = await (await fetch("/common/icons.svg")).text();
	document.getElementById('icon-container').innerHTML = icon_src;
})();
