
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

async function app() {
	const quake_params = {
		start_time: "2025-04-29 00:00:00",
		size_min: 1,
	}

	console.log(await getQuakes(quake_params));
}


app();
