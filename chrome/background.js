chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		try {
			if (request.key != "password") {
				sendResponse({status: "failure"})
			}

			chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
		    	chrome.tabs.update(tab.id, {url: request.new_url});
		    })

		    sendResponse({status: "success"})
		} catch (err) {
			sendResponse({status: "failure"})
		}
	}
)