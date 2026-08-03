// Simple HTML escape to avoid injection issues
function escapeHtml(str) {
	return String(str).replace(/[&<>"']/g, s =>
		({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;'
		})[s]
	);
}

async function loadProjects() {
	const res = await fetch('products.json'); // gets the data in the json
	const projects = await res.json(); // what does it do?

	const grid = document.getElementById('products-grid'); // find the element in the html file with an id of games-grid
	grid.innerHTML = ''; // clear any loading state

	// creates all the cards per projects
	projects.forEach(project => {
		const card = document.createElement('article'); // creates the article html element
		card.className = 'products-cards'; //give it the class name to not loose my css
		card.id = project.id; // give the article an id corresponding to the id in Json so the functions knows which we targetting? what the need?

		// Build inner HTML in a given structure fetching the data for each element in the json
		card.innerHTML = `
			<h5>${escapeHtml(project.title)}</h5>
			<p>${escapeHtml(project.description)}</p>
			<p>${escapeHtml(project.language)}</p>
			<a class="github-button" href="${escapeHtml(project.github_link)}" target="_blank" rel="noopener noreferrer">
			View code </a>

		`;
		grid.appendChild(card);
	});
}

document.addEventListener('DOMContentLoaded', loadProjects);