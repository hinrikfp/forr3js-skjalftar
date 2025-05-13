
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
	if (!data.event_id) {
		return [];
	}
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
		map.on("zoomend", (e) => {
			if (app.map) {
				app.map.refresh();
			}
		});

		this.mapDiv = mapDiv;
		this.map = map;
		this.quakeCircles = new Map();
		let markers = L.markerClusterGroup({
			disableClusteringAtZoom: 11,
			spiderfyOnMaxZoom: false,
		});
		this.markers = markers;
		this.quakeList = [];
	}

	refresh() {
		this.clearQuakes();
		this.addEarthquakes();
	}

	setQuakes(quakeList) {
		this.quakeList = quakeList;
		this.clearQuakes();
		this.addEarthquakes();
	}

	addEarthquakes() {
		for (let quake of this.quakeList) {
			let color =
				quake.magnitude > 3 ? "red"
					: quake.magnitude > 2 ? "orange"
						: quake.magnitude > 1 ? "yellow"
							: "green";
			let quakeCircle = L.circle([quake.lat, quake.long], {
				color: color,
				fillColor: color,
				fillOpacity: 0.5,
				radius: Math.pow(quake.magnitude * 2.2, 2) * (20 - this.map.getZoom()),
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
		container.classList.add("hidden");

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

class Slider {
	constructor(parent, config, onSet) {
		let slider = document.createElement("div");
		slider.id = "slider";
		parent.append(slider);
		noUiSlider.create(slider, config);
		slider.noUiSlider.on("set", onSet);
	}
}

class DatePicker {
	constructor(parent, onPickerClose) {
		let flatpickrElement = document.createElement("div");
		flatpickrElement.innerText = "Select Date Range";
		flatpickrElement.style = `
			border: 2px solid black;
			padding: 4px;
			height: 20px;
			width: fit-content;
		`;
		let fp = flatpickr(flatpickrElement, {
			enableTime: true,
			dateFormat: "d-m-Y H:i",
			time_24hr: true,
			mode: "range",
			appendTo: parent,
			onClose: onPickerClose,
		});
		parent.append(flatpickrElement);

		this.flatpickrElement = flatpickrElement;
		this.fp = fp;
	}
}

class FilterModule {
	id = "filterModule";
	constructor(parent, magSliderStart) {
		let container = document.createElement("div");
		container.style = `
			display: grid;
			padding: 20px;
			padding-top: 40px;
		`;
		container.id = this.id;
		parent.append(container);
		let magnitudeSlider = new Slider(container, {
			start: magSliderStart,
			connect: true,
			range: {
				min: 0,
				max: 10,
			},
			tooltips: true,
		}, (values) => {
			console.log(values);
			app.setMagMinMax(values);
		});
		let datePicker = new DatePicker(container, (dates) => {
			console.log(dates);
			app.setDateRange(dates);
		});


		this.datePicker = datePicker;
		this.magnitudeSlider = magnitudeSlider;
		this.container = container;
	}
}

class App {
	constructor() {
		this.quakeParams = {
			start_time: "2025-03-30 00:00:00",
			// end_time: flatpickr.formatDate(Date.now(), "Y-m-d H:i:S"),
			size_min: 1,
			size_max: 10,
		};
		this.map = new QuakeMap(document.body);
		this.modal = new Modal(document.body, "hello");
		this.filterModule = new FilterModule(document.body, [this.quakeParams.size_min, this.quakeParams.size_max]);

		document.body.style = `
			margin: 0;
			display: grid;
			grid-template-columns: 1fr 1fr;
		`;
	}

	async init() {
		let quakes = await getQuakes(this.quakeParams);
		this.map.setQuakes(quakes);
	}

	setMagMinMax(values) {
		this.quakeParams.size_min = parseFloat(values[0]);
		this.quakeParams.size_max = parseFloat(values[1]);
		getQuakes(this.quakeParams).then((quakes) => {
			app.map.setQuakes(quakes);
		})
	}
	setDateRange(range) {
		this.quakeParams.start_time = flatpickr.formatDate(range[0], "Y-m-d H:i:S");
		this.quakeParams.end_time = flatpickr.formatDate(range[1], "Y-m-d H:i:S");
		getQuakes(this.quakeParams).then((quakes) => {
			app.map.setQuakes(quakes);
		});
	}
}

let app = new App();
app.init();
