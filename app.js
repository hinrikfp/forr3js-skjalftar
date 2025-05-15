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
			depth: data.depth[i],
			time: data.time[i],
		};
		quakeArray.push(quakeObj);
	}

	return quakeArray;
}

class QuakeMap {
	geoCircle = null;
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
			let time = new Date(quake.time * 1000);
			quakeCircle.on("click", (e) => {
				app.modal.text = `
				magnitude: ${quake.magnitude}
				location: ${quake.lat}, ${quake.long}
				depth: ${quake.depth}
				time: ${dayjs(time).format("D. MMMM YYYY kl: HH:mm:ss")}
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

	setGeoCircle(radius, coords) {
		if (this.geoCircle) {
			this.map.removeLayer(this.geoCircle)
		}
		this.geoCircle = L.circle([coords.latitude, coords.longitude], {
			color: "pink",
			fillColor: "pink",
			fillOpacity: 0.1,
			radius: radius,
		}).addTo(app.map.map);

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
			width: 300px;
			height: 200px;
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
	constructor(parent, id, config, onSet) {
		let slider = document.createElement("div");
		slider.id = id;
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
			maxDate: Date.now(),
			minDate: new Date("1992-01-01"),
			mode: "range",
			appendTo: parent,
			onClose: onPickerClose,
		});
		parent.append(flatpickrElement);

		this.flatpickrElement = flatpickrElement;
		this.fp = fp;
	}
}

class GeoFilter {
	constructor(parent) {
		let container = document.createElement("div");
		parent.append(container);
		let geoLocToggle = document.createElement("input");
		geoLocToggle.type = "checkbox";
		geoLocToggle.style = "margin-bottom: 40px;";
		geoLocToggle.addEventListener("change", (e) => {
			if (e.currentTarget.checked) {
				geoLocate();
			} else {
				app.setQuakesGeo(false);
			}
		});
		let label = document.createElement("h3");
		label.innerText = "Geolocate";
		container.append(label);
		container.append(geoLocToggle);
		let radiusSlider = new Slider(container, "geo-slider", {
			start: 100,
			connect: true,
			range: {
				min: 0,
				max: 500,
			},
			tooltips: true,

		}, (value) => {
			console.log(value);
			app.setGeoRadius(parseFloat(value[0]) * 1000);
		});

		this.container = container;
		this.geolocToggle = geoLocToggle;
		this.label = label;
		this.radiusSlider = radiusSlider;
	}

	geoOn() {
		return this.geolocToggle.checked
	}
}

function geoLocate() {
	function success(position) {
		app.setQuakesGeo(true, position);
	}
	function error(err) {
		app.geoError(err.message);
	}

	navigator.permissions.query({ name: "geolocation" }).then((result) => {
		if (result.state === "granted" || result.state === "prompt") {

			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(success, error);
			} else {
				app.geoError("unsupported");
			}
		} else {
			app.geoError(`geolocation denied ${result.state}`);
		}
	})
}

class FilterModule {
	id = "filterModule";
	constructor(parent, magSliderStart) {
		let container = document.createElement("div");
		container.style = `
			display: grid;
			padding: 20px;
		`;
		container.id = this.id;
		parent.append(container);
		let magnitudeLabel = document.createElement("h3");
		magnitudeLabel.innerText = "Magnitude";
		container.append(magnitudeLabel);
		let magnitudeSlider = new Slider(container, "mag-slider", {
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
		let geoFilter = new GeoFilter(container);


		this.geoFilter = geoFilter;
		this.datePicker = datePicker;
		this.magnitudeSlider = magnitudeSlider;
		this.container = container;
	}
}

class App {
	geoRadius = 100000;
	geoPos = null;
	constructor() {
		this.quakeParams = {
			start_time: "2025-03-30 00:00:00",
			// end_time: flatpickr.formatDate(Date.now(), "Y-m-d H:i:S"),
			size_min: 1,
			size_max: 10,
			fields: [
				"event_id",
				"lat",
				"long",
				"magnitude",
				"time",
				"depth",

			]
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
		dayjs.locale("is");
		let quakes = await getQuakes(this.quakeParams);
		this.map.setQuakes(quakes);
	}

	setMagMinMax(values) {
		this.quakeParams.size_min = parseFloat(values[0]);
		this.quakeParams.size_max = parseFloat(values[1]);
		this.setQuakesGeo(this.geoOn(), this.geoPos);
	}
	setDateRange(range) {
		this.quakeParams.start_time = flatpickr.formatDate(range[0], "Y-m-d H:i:S");
		this.quakeParams.end_time = flatpickr.formatDate(range[1], "Y-m-d H:i:S");
		this.setQuakesGeo(this.geoOn(), this.geoPos);
	}
	setQuakesGeo(enable, pos) {
		if (enable) {
			let coords = pos.coords;
			this.geoPos = pos;
			getQuakes(this.quakeParams).then((quakes) => {
				let quakesFiltered = quakes.filter((q) => {
					const EARTH_RADIUS = 6371000;
					let qlat = q.lat * Math.PI / 180;
					let qlong = q.long * Math.PI / 180;
					let plat = coords.latitude * Math.PI / 180;
					let plong = coords.longitude * Math.PI / 180;
					let dist = 2 * EARTH_RADIUS * Math.asin(Math.sqrt(Math.pow(Math.sin((qlat - plat) / 2), 2) + Math.cos(plat) * Math.cos(qlat) * Math.pow(Math.sin((qlong - plong) / 2), 2)));
					return dist < this.geoRadius;
				})
				app.map.setGeoCircle(this.geoRadius, coords);
				app.map.setQuakes(quakesFiltered);
			});
		} else {
			getQuakes(this.quakeParams).then((quakes) => {
				app.map.setQuakes(quakes);
			})
		}
	}

	geoError(err) {
		console.error(err);
	}
	setGeoRadius(r) {
		this.geoRadius = r;
		console.log(this.geoRadius);
		this.setQuakesGeo(true, this.geoPos);
	}
	geoOn() {
		return this.filterModule.geoFilter.geoOn()
	}
}

let app = new App();
app.init();
