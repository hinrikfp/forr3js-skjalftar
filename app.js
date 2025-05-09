
async function getQuakes(params) {
	const response = await fetch("https://api.vedur.is/skjalftalisa/v1/quake/array/", {
		method: "POST",
		headers: {
			"Accept": "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(params),
	});

	obj = await response.json();
	return quakesObjReformat(obj);
}

function quakesObjReformat(obj) {
	let data = obj.data;
	let quakeArray = []
	for (let i = 0; i < data.event_id.length; i++) {
		let quakeObj = {
			event_id: data.event_id[i],
			lat: data.lat[i],
			long: data.long[i],
			magnitude: data.magnitude[i],
		};
		quakeArray.push(quakeObj);
	}

	return quakeArray;
}

class QuakeMap {
	constructor(parent) {
		let mapDiv = document.createElement("div");
		mapDiv.style = "height: 600px; width: 800px;";
		parent.append(mapDiv);
		mapDiv.id = "map";
		let map = L.map(mapDiv, {
			center: [65.0, -18.0],
			zoom: 6,
		});
		L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: 19,
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);

		this.mapDiv = mapDiv;
		this.map = map;
		this.quakeCircles = new Map();
		let markers = L.markerClusterGroup({
			disableClusteringAtZoom: 11,
			spiderfyOnMaxZoom: false,
		});
		this.markers = markers;
	}

	addEarthquakes(quakeList) {
		for (let quake of quakeList) {
			let color =
				quake.magnitude > 3 ? "red"
					: quake.magnitude > 2 ? "orange"
						: quake.magnitude > 1 ? "yellow"
							: "green";
			let quakeCircle = L.circle([quake.lat, quake.long], {
				color: color,
				fillColor: color,
				fillOpacity: 0.5,
				radius: Math.pow(quake.magnitude * 5, 2),
			});
			quakeCircle.on("click", (e) => {
				app.modal.text = `
				magnitude: ${quake.magnitude}
				location: ${quake.lat}, ${quake.long}
				`;
				app.modal.refresh();
				app.modal.show();
			});
			this.quakeCircles.set(quake.event_id, quakeCircle);
			this.markers.addLayer(quakeCircle);
		}
		this.map.addLayer(this.markers);
	}

	clearQuakes() {
		this.markers.clearLayers();
	}
}

class Modal {
	constructor(parent, text) {
		this.text = text;
		let id = "modal";
		this.id = id;

		let container = document.createElement("div");
		container.style = `
			margin: 0;
			padding: 10px;
			position: absolute;
			width: 400px;
			height: 300px;
			border: 2px solid black;
			border-radius: 10px;
			background: white;
			top: 20%;
			left: 40%;
			z-index: 1000;
		`;
		container.id = this.id;
		let textElement = document.createElement("p");
		textElement.innerText = this.text;
		container.append(textElement);
		let closeButton = document.createElement("button");
		closeButton.addEventListener("click", (e) => {
			document.getElementById(id).classList.add("hidden");
		});
		closeButton.innerText = "X";
		closeButton.style = `
			position: absolute;
			right: 10px;
			top: 10px;
		`;
		container.append(closeButton);

		parent.append(container);

		this.container = container;
		this.textElement = textElement;
	}

	refresh() {
		this.textElement.innerText = this.text;
	}
	hide() {
		this.container.classList.add("hidden");
	}
	show() {
		this.container.classList.remove("hidden");
	}
}

class App {
	constructor() {
		this.quakeParams = {
			start_time: "2025-03-30 00:00:00",
			size_min: 1,
		};
		this.map = new QuakeMap(document.body);
		this.modal = new Modal(document.body, "hello");

		document.body.style = `
			margin: 0;
		`;
	}

	async init() {
		let quakes = await getQuakes(this.quakeParams);
		this.map.addEarthquakes(quakes);
	}
}

let app = new App();
app.init();
