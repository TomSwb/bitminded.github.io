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
	const res = await fetch('projects.json'); // gets the data in the json
	const projects = await res.json(); // parse the response text from JSON into an array of project objects

	const grid = document.getElementById('projects-grid'); // find the element in the html file with an id of games-grid
	grid.innerHTML = ''; // clear any loading state

	// creates all the cards per projects
	projects.forEach(project => {
		const card = document.createElement('article'); // creates the article html element
		card.className = 'projects-cards'; //give it the class name to not loose my css
		card.id = project.id; // unique id per card, e.g. to link to it (projects/#libft) or style it in CSS

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