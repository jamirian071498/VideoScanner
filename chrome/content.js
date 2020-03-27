import $ from "jquery";
import "regenerator-runtime/runtime.js";

var current_url = new URL(document.URL)

var state = {
	times: [],
	currentInputVal: ""
}

// var port = chrome.runtime.connect();

// window.addEventListener("message", function(event) {
//   if (event.source != window)
//     return;

//   if (event.data.type && (event.data.type == "FROM_PAGE")) {
//     console.log("Content script received: " + event.data.text);
//     port.postMessage(event.data.text);
//   }
// }, false);

var darkTheme = $("html").get(0).hasAttribute("dark")

var header = document.createElement("h2");
header.innerHTML = "Video Scanner:";
header.style.marginTop = "5px"
header.style.marginBottom = "8px"

var prevButton = document.createElement("BUTTON")
prevButton.id = "vidscan-prev-button"
prevButton.innerHTML = "<"
prevButton.onclick = onLeftClick
prevButton.style.marginLeft = "5px"
prevButton.style.marginRight = "5px"

var nextButton = document.createElement("BUTTON")
nextButton.id = "vidscan-next-button"
nextButton.innerHTML = ">"
nextButton.onclick = onRightClick

var searchInput = document.createElement("INPUT")
searchInput.id = "vidscan-search-input"

setColors()

var newDiv = document.createElement("div");
newDiv.setAttribute("id","vidscan");
newDiv.appendChild(header);
newDiv.appendChild(searchInput);
newDiv.appendChild(prevButton);
newDiv.appendChild(nextButton);

var primaryInner = null;


function setColors() {
	header.style.color = darkTheme ? "white" : "black";

	prevButton.style.color = darkTheme ? "white" : "#909090";
	prevButton.style.background = darkTheme ? "#303030" : "white";
	prevButton.style.border = "none"

	nextButton.style.color = darkTheme ? "white" : "#909090";
	nextButton.style.background = darkTheme ? "#303030" : "white";
	nextButton.style.border = "none"

	searchInput.style.color = darkTheme ? "white" : "#909090";
	searchInput.style.background = darkTheme ? "black" : "white";
	searchInput.style.border = "#303030";
}


function completeRequest(results) {
	if (!results.length) {
		console.log('no captions');
		console.log('\n');
		return;
	}

	logTimestamps(results)
	state.times = results.map(Math.floor)
}

function logTimestamps(results) {
	let timestamps = []

	results.forEach(result => {
		let minutes = Math.floor(result/60)
		let seconds = Math.floor(result%60)

		if (seconds < 10) {
			seconds = "0" + seconds
		}

		timestamps.push(minutes + ":" + seconds)
	})

	timestamps.forEach(timestamp => {
		console.log(timestamp)
	})

	console.log('\n')
}

async function onSearch(right) {
	let newInputVal = searchInput.value

	if (newInputVal === "") {
		clearState()
		saveState()
		return
	}

	if (state.currentInputVal !== newInputVal) {
		clearState()
		state.currentInputVal = newInputVal;
		await getCaptionData()
		saveState()
	} else {
		if (state.times.length === 0) {
			await getCaptionData()
			saveState()
		}
	}

	if (state.times.length === 0) {
		return;
	}

	let current_time = convertToSeconds($("span.ytp-time-current")[0].innerHTML)
	let next_time = seekNext(right, current_time)
	let next_url = current_url.origin + current_url.pathname + 
	"?v=" + current_url.searchParams.get("v") + 
	"&t=" + next_time + "s";

	current_url = new URL(next_url)
	
	chrome.runtime.sendMessage({new_url: next_url, key: _config.message.key}, function(response) {
		console.log(response.status);
	});
}

function convertToSeconds(time) {
	let colonIndex = time.indexOf(":")
	let secondColonIndex = time.lastIndexOf(":")

	if (colonIndex === secondColonIndex) {
		return 60 * parseInt(time.substring(0, colonIndex)) + parseInt(time.substring(colonIndex + 1))
	}

	return 3600 * parseInt(time.substring(0, colonIndex)) + 
	60 * parseInt(time.substring(colonIndex + 1, secondColonIndex)) + 
	parseInt(time.substring(secondColonIndex + 1))
}

// Optimize with binary search
function seekNext(right, current_time) {
	//let middle = state.times[Math.floor((right - left)/2)]

	if (right) {
		if (current_time > state.times[state.times.length - 1]) return state.times[0]

		for (let i = 0; i < state.times.length; i++) {
			if (state.times[i] > current_time) return state.times[i]
		}
	}

	if (current_time < state.times[0]) return state.times[state.times.length - 1]

	for (let i = 0; i < state.times.length; i++) {
		if (state.times[i] > current_time) return state.times[i - 1]
	}

	console.log('hit')
}

function onLeftClick() {
	onSearch(false)
}

function onRightClick() {
	onSearch(true)
}

function clearState() {
	state.currentInputVal = ""
	state.times = []
}

async function getCaptionData() {
	let fetchUrl = new URL(_config.api.invokeUrl + "/transcript")
	let params = {query: state.currentInputVal, vid_id: current_url.searchParams.get("v")}
	Object.keys(params).forEach(key => fetchUrl.searchParams.append(key, params[key]))

	try {
		const response = await fetch(fetchUrl, {
			method: 'GET',
			headers: {
			  'Content-Type': 'application/json',
			  "x-api-key": _config.api.key
			}
		});

		let results = await response.json()

		if (!results.length) {
			console.log('no captions');
			console.log('\n');
			return
		}

		logTimestamps(results)
		state.times = results.map(Math.floor)
	} catch (err) {
		console.log("An exception occured in getCaptionData: " + err)
	}
}

function saveState() {
	chrome.storage.sync.set({"currentState": state}, function() {
		console.log("current state set");
    });

    console.log(state)
}

// function embedScript() {
// 	let script = document.createElement('script');
// 	script.src = chrome.runtime.getURL('content.js');

// 	document.getElementsByTagName("body")[0].append(script);

// 	// document.getElementById("theButton").addEventListener("click",
//  //    function() {
// 	//   window.postMessage({ type: "FROM_PAGE", text: "Hello from the webpage!" }, "*");
// 	// }, false);
// }

function main() {
	$("body").on('DOMSubtreeModified', "ytd-popup-container", function() {
		let toggle = $("ytd-popup-container").find("paper-toggle-button")

		if (toggle.length > 0) {
			let attr = toggle.attr("checked");

			if (typeof attr !== typeof undefined && attr !== false) {
				if (!darkTheme) {
					darkTheme = true;
					setColors();
				}
			} else {
				if (darkTheme) {
					darkTheme = false;
					setColors();
				}
			}
		}
	});

	chrome.storage.sync.get("currentState", function(result) {
		if (typeof result.currentState === typeof undefined || 
			typeof result.currentState.currentInputVal === typeof undefined) {
			console.log("No state found in storage")
		} else {
			state = result.currentState
			searchInput.value = state.currentInputVal
			console.log(state)
		}
    });

	primaryInner = document.getElementById("info");
	primaryInner.appendChild(newDiv);

	// let player = document.getElementById('movie_player')
	// embedScript()
}

$(document).ready(function() {
	let profileImageRenderTimer = setInterval(checkForProfileImageRender, 100);
	let count = 0;

    function checkForProfileImageRender() {
    	count++;

        if ($("*").length > 1500) {
            clearInterval(profileImageRenderTimer);
            main();
        }

        if (count === 20) {
        	clearInterval(profileImageRenderTimer);
        	console.log("VidScanner: YouTube webpage took more than 2 seconds to load");
        }
     }
});