
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
		mapDiv.style = "height: 400px; width: 600px;";
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
	}

	addEarthquakes(quakeList) {
		let markers = L.markerClusterGroup({
			disableClusteringAtZoom: 11,
			spiderfyOnMaxZoom: false,
		});
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
			this.quakeCircles.set(quake.event_id, quakeCircle);
			markers.addLayer(quakeCircle);
		}
		this.map.addLayer(markers);
	}
}

class App {
	constructor() {
		this.quakeParams = {
			start_time: "2025-03-30 00:00:00",
			size_min: 1,
		};
		this.map = new QuakeMap(document.body);
	}

	async init() {
		let quakes = await getQuakes(this.quakeParams);
		this.map.addEarthquakes(quakes);
	}
}

async function app() {
	let app = new App();
	await app.init();
}


app();
