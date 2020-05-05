import $ from "jquery";
import "regenerator-runtime/runtime.js";


var current_url = null
var toTheRight = null

var state = {
	times: [],
	currentInputVal: ""
}

embed(runEmbedded);

var darkTheme = $("html").get(0).hasAttribute("dark")

var logo = document.createElement("svg")
logo.setAttribute("height", "2cm")
logo.setAttribute("width", "2cm")
logo.setAttribute("version", "1.1")
logo.style.marginRight = "8px"
logo.onclick = toggleVisibility

var image = document.createElement("img")
image.setAttribute("src", chrome.runtime.getURL("icons/icon_128.png"))
image.setAttribute("alt", "YouTube Video Word Finder Icon")
image.setAttribute("x", "0")
image.setAttribute("y", "0")
image.setAttribute("height", "30px")
image.setAttribute("width", "30px")
logo.append(image)

var prevButton = document.createElement("button")
prevButton.id = "vidscan-prev-button"
prevButton.innerHTML = "<"
prevButton.onclick = onLeftClick
prevButton.style.marginLeft = "5px"
prevButton.style.marginRight = "5px"

var nextButton = document.createElement("button")
nextButton.id = "vidscan-next-button"
nextButton.innerHTML = ">"
nextButton.onclick = onRightClick

var searchInput = document.createElement("input")
searchInput.id = "vidscan-search-input"
searchInput.setAttribute("placeholder", "Search")

var notFoundMessage = document.createElement("span")
notFoundMessage.id = "vidscan-not-found"
notFoundMessage.innerText = "Query not found in captions"
notFoundMessage.style.marginLeft = "8px"

setColors()

var searchComponents = document.createElement("span")
searchComponents.id = "vidScanSearchComponents"
searchComponents.setAttribute("id","vidscan")
searchComponents.setAttribute("style", "display:table-cell;vertical-align:middle;")
searchComponents.appendChild(logo)
searchComponents.appendChild(searchInput)
searchComponents.appendChild(prevButton)
searchComponents.appendChild(nextButton)
searchComponents.appendChild(notFoundMessage)
$(searchComponents).hide()

var logoSpan = document.createElement("span")
logoSpan.appendChild(logo)

var videoScannerDiv = document.createElement("div")
videoScannerDiv.setAttribute("style", "display:table;")
videoScannerDiv.appendChild(logoSpan)
videoScannerDiv.appendChild(searchComponents)

var primaryInner = null;

window.addEventListener("message", function(event) {
	if (event.source != window)
		return;

	if (event.data.hasOwnProperty("current_time")) {
		let next_time = seekNext(event.data.current_time)
		window.postMessage({time: next_time}, "*");
	}
}, false);


function toggleVisibility() {
	$(searchComponents).toggle()
	$("#vidscan-not-found").hide()
}


function setColors() {
	prevButton.style.color = darkTheme ? "white" : "#909090";
	prevButton.style.background = darkTheme ? "#303030" : "white";
	prevButton.style.border = "none"

	nextButton.style.color = darkTheme ? "white" : "#909090";
	nextButton.style.background = darkTheme ? "#303030" : "white";
	nextButton.style.border = "none"

	searchInput.style.color = darkTheme ? "white" : "#909090";
	searchInput.style.background = darkTheme ? "black" : "white";
	searchInput.style.border = "#303030";

	notFoundMessage.style.color = darkTheme ? "white" : "black";
}


function completeRequest(results) {
	if (!results.length) {
		return;
	}

	// logTimestamps(results)
	state.times = results.map(Math.floor)
}

function logTimestamps(results) {
	results.forEach(time => {
		time = secondsToTimestamp(time)
	})
}

function showPopup() {
	$("#vidscan-not-found").show().delay(1000).fadeOut()
}

function secondsToTimestamp(seconds) {
	let timestamp = (seconds%60) >= 10 ? Math.floor(seconds%60).toString() : "0" + Math.floor(seconds%60).toString()
	let minutes = Math.floor(seconds/60)
	let hours = Math.floor(seconds/3600)

	if (minutes > 0) {
		timestamp = (minutes >= 10 ? minutes.toString() : "0" + minutes.toString()) + ":" + timestamp
	}

	if (hours > 0) {
		timestamp = (hours >= 10 ? hours.toString() : "0" + hours.toString()) + ":" + timestamp
	}

	return timestamp
}

async function onSearch() {
	current_url = new URL(document.URL)
	let newInputVal = searchInput.value

	if (newInputVal === "") {
		clearState()
		saveState()
		return
	}

	if (state.currentInputVal !== newInputVal || state.times.length === 0) {
		clearState()
		state.currentInputVal = newInputVal;
		await getCaptionData()
		saveState()
	}

	if (state.times.length === 0) {
		return;
	}

	window.postMessage({get_current: "gimme current time"})
}

function timestampToSeconds(time) {
	let colonIndex = time.indexOf(":")
	let secondColonIndex = time.lastIndexOf(":")

	if (colonIndex === secondColonIndex) {
		return 60 * parseInt(time.substring(0, colonIndex)) + parseInt(time.substring(colonIndex + 1))
	}

	return 3600 * parseInt(time.substring(0, colonIndex)) + 
	60 * parseInt(time.substring(colonIndex + 1, secondColonIndex)) + 
	parseInt(time.substring(secondColonIndex + 1))
}

function seekNext(current) {
	let length = state.times.length

    if (length === 1) return state.times[0]
    
    if (length === 2) {
    	if ((toTheRight && (current >= state.times[0] && current < state.times[1])) || 
    		(!toTheRight && (current < state.times[0] + 2 || current >= state.times[1] + 2))) {
            return state.times[1]
        } else {
            return state.times[0]
        }
    }
        
    if (current >= state.times[length - 1]) {
    	if (toTheRight) {
    		return state.times[0]
    	} else {
        	if (current >= state.times[length - 1] + 2) {
                return state.times[length - 1]
        	} else {
        		return state.times[length - 2]
        	}
        }
    }

    if (toTheRight) {
    	if (current < state.times[0]) {
    		return state.times[0]
    	}
    } else {
    	if (current < state.times[0] + 2) {
    		return state.times[length - 1]
    	}
    }
        
    if (toTheRight) {
        return state.times[bSearchRight(current, 0, length)]
    }
    
    return state.times[bSearchLeft(current, 0, length)]
}

function bSearchRight(current, left, right) {
	if (left === right - 1) {
        return right
	}
    
    let middle = left + Math.floor((right - left)/2)
    
    if (current < state.times[middle]) {
        return bSearchRight(current, left, middle)
    }
    
    return bSearchRight(current, middle, right)
}

function bSearchLeft(current, left, right) {
	if (left === right - 1) {
		if (current >= state.times[left] + 2) {
            return left
		}

        return left - 1
	}
    
    let middle = left + Math.floor((right - left)/2)
    
    if (current < state.times[middle]) {
        return bSearchLeft(current, left, middle)
    }
    
    return bSearchLeft(current, middle, right)
}

function onLeftClick() {
	toTheRight = false
	onSearch()
}

function onRightClick() {
	toTheRight = true
	onSearch()
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

		if (results.no_captions || !results.length) {
			showPopup()
			return
		}

		// logTimestamps(results)
		state.times = results.map(Math.floor)
	} catch (err) {
	}
}

function saveState() {
	chrome.storage.sync.set({"currentState": state})
}

function runEmbedded() {
	window.addEventListener("message", function(event) {
		if (event.source != window)
			return;

		if (event.data.hasOwnProperty("time")) {
			let player = document.getElementById('movie_player')
			player.seekTo(event.data.time)
		} else if (event.data.hasOwnProperty("get_current")) {
			let player = document.getElementById('movie_player')
			window.postMessage({current_time: player.getCurrentTime()}, "*");
		}
	}, false);
}

function embed(fn) {
    const script = document.createElement("script");
    script.text = `(${fn.toString()})();`;
    document.documentElement.appendChild(script);
}

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

	current_url = new URL(document.URL)

	chrome.storage.sync.get("currentState", function(result) {
		if (typeof result.currentState !== typeof undefined && 
			typeof result.currentState.currentInputVal !== typeof undefined) {
			state = result.currentState
			searchInput.value = state.currentInputVal
		}
    });

	primaryInner = $("div#container.style-scope.ytd-video-primary-info-renderer")
	primaryInner.append(videoScannerDiv)
}

$(document).ready(function() {
	let profileImageRenderTimer = setInterval(checkForProfileImageRender, 100);
	let count = 0;

    function checkForProfileImageRender() {
    	count++;

        if ($("div#info.style-scope.ytd-video-primary-info-renderer").length > 0) { // Total elements ~ 4392
            clearInterval(profileImageRenderTimer);
            main();
        }

        if (count === 50) {
        	clearInterval(profileImageRenderTimer);
        }
     }
});