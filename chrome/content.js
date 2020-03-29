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

window.addEventListener("message", function(event) {
	if (event.source != window)
		return;

	if ("current_time" in event.data) {
		console.log("Extension received: " + event.data.current_time)
		let next_time = seekNext(event.data.current_time)
		window.postMessage({time: next_time}, "*");
	}
}, false);


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
	results.forEach(time => {
		time = secondsToTimestamp(time)
		console.log(time)
	})

	console.log('\n')
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
	chrome.storage.sync.set({"currentState": state});
    console.log(state)
}

function runEmbedded() {
	window.addEventListener("message", function(event) {
		if (event.source != window)
			return;

		if ("time" in event.data) {
			console.log("Webpage received: " + event.data.time)
			let player = document.getElementById('movie_player')
			player.seekTo(event.data.time)
		} else if ("get_current" in event.data) {
			console.log("Webpage received: " + event.data.get_current)
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