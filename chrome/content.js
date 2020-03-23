import $ from "jquery";

function completeRequest(results) {
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

	queryResults = results.map(Math.floor)
}

function onNext() {
	if (queryResults.length == 0) {
		return
	}

	let next_url = current_url.origin + current_url.pathname + 
	"?v=" + current_url.searchParams.get("v") + 
	"&t=" + queryResults[current_index] + "s"
	
	chrome.runtime.sendMessage({new_url: next_url}, function(response) {
		console.log(response.status);
	});
}

function onSearch() {
	let inputVal = searchInput.value

	$.ajax({
	    method: "GET",
	    url: _config.api.invokeUrl + "/transcript",
	    headers: {
	        "x-api-key": _config.api.key
	    },
        data: {
	        query: inputVal,
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
}

let current_url = new URL(document.URL)
console.log(current_url.origin)
let current_index = 0
let queryResults = []

let newDiv = document.createElement("div");
newDiv.setAttribute("id","vidscan");

let header = document.createElement("h4");
header.innerHTML="Video Scanner: ";

let searchButton = document.createElement("BUTTON")
searchButton.id = "vidscan-search-button"
searchButton.innerHTML = "Search"
searchButton.onclick = onSearch

let nextButton = document.createElement("BUTTON")
nextButton.id = "vidscan-next-button"
nextButton.innerHTML = ">"
nextButton.onclick = onNext

let searchInput = document.createElement("INPUT")
searchInput.id = "vidscan-search-input"

newDiv.appendChild(header);
newDiv.appendChild(searchInput);
newDiv.appendChild(nextButton);
newDiv.appendChild(searchButton);

$(document).ready(function(){
	let primaryInner = document.getElementById("info");
	primaryInner.appendChild(newDiv);
	// let profileIcon = insertionElement.$("ytd-topbar-menu-button-renderer")
	// console.log("LENGTH:" + profileIcon.length)
});