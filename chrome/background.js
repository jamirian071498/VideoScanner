chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		try {
			if (request.key != "password") {
				sendResponse({status: "failure"})
			}

			console.log("Background.js received message")

		    sendResponse({status: "success"})
		} catch (err) {
			sendResponse({status: "failure"})
		}
	}
)