import $ from "jquery";


var current_url = new URL(document.URL)
var currentIndex = 0
var timestamps = []

var header = document.createElement("h2");
header.style.color = "white";
header.innerHTML = "Video Scanner: ";

var searchButton = document.createElement("BUTTON")
searchButton.id = "vidscan-search-button"
searchButton.innerHTML = "Search"
searchButton.onclick = onSearch

var prevButton = document.createElement("BUTTON")
prevButton.id = "vidscan-prev-button"
prevButton.innerHTML = "<"
prevButton.onclick = onPrev

var nextButton = document.createElement("BUTTON")
nextButton.id = "vidscan-next-button"
nextButton.innerHTML = ">"
nextButton.onclick = onNext

var searchInput = document.createElement("INPUT")
searchInput.id = "vidscan-search-input"

var newDiv = document.createElement("div");
newDiv.setAttribute("id","vidscan");
newDiv.appendChild(header);
newDiv.appendChild(searchInput);
newDiv.appendChild(prevButton);
newDiv.appendChild(nextButton);
newDiv.appendChild(searchButton);

var primaryInner = null;


function completeRequest(results) {
	console.log(results)

	if (!results.length) {
		console.log('no captions');
		console.log('\n');
		return;
	}

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

	timestamps = results.map(Math.floor)

	onNext()
}

function onPrev() {
	if (timestamps.length == 0) {
		return;
	}

	currentIndex -= 1;

	if (currentIndex == -1) {
		currentIndex = timestamps.length - 1;
	}

	let next_url = current_url.origin + current_url.pathname + 
	"?v=" + current_url.searchParams.get("v") + 
	"&t=" + timestamps[currentIndex] + "s";

	saveState(timestamps, currentIndex, searchInput.value)
	
	chrome.runtime.sendMessage({new_url: next_url, key: _config.message.key}, function(response) {
		console.log(response.status);
	});
}

function onNext() {
	if (timestamps.length == 0) {
		return;
	}

	currentIndex += 1;

	if (currentIndex == timestamps.length) {
		currentIndex = 0;
	}

	let next_url = current_url.origin + current_url.pathname + 
	"?v=" + current_url.searchParams.get("v") + 
	"&t=" + timestamps[currentIndex] + "s"

	saveState(timestamps, currentIndex, searchInput.value)
	
	chrome.runtime.sendMessage({new_url: next_url, key: _config.message.key}, function(response) {
		console.log(response.status);
	});
}

function onSearch() {
	let inputValue = searchInput.value;

	$.ajax({
	    method: "GET",
	    url: _config.api.invokeUrl + "/transcript",
	    headers: {
	        "x-api-key": _config.api.key
	    },
        data: {
	        query: inputValue,
	        vid_id: current_url.searchParams.get("v")
	    },
	    contentType: "application/json; charset=utf-8",
        dataType: "json",
	    success: completeRequest,
	    error: function ajaxError(jqXHR, textStatus, errorThrown) {
	        console.error('Error requesting transcript: ', textStatus, ', Details: ', errorThrown);
	        console.error('Response: ', jqXHR.responseText);
	    }
	});

	saveState(timestamps, currentIndex, inputValue)
}

function saveState(timestamps, currentIndex, inputValue) {
	var state = {
		"timestamps": timestamps,
		"currentIndex": currentIndex,
		"inputVal": inputValue
	};

	chrome.storage.sync.set({"currentState": state}, function() {
		console.log("Current state set");
    });
}

function main() {
	chrome.storage.sync.get("currentState", function(result) {
		if (result.timestamps === undefined) {
			console.log("No state found in storage")
		} else {
			searchInput.value = result.inputVal
			timestamps = result.timestamps
			currentIndex = result.currentIndex
			console.log("timestamps: " + timestamps)
			console.log("currentIndex: " + currentIndex)
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

        if ($("img#img.style-scope.yt-img-shadow").length > 0) {
            clearInterval(profileImageRenderTimer);
            main();
        }

        if (count == 10) {
        	clearInterval(profileImageRenderTimer);
        	console.log("VidScanner: YouTube webpage took more than a second to load");
        }
     }
});