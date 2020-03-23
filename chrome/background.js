chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		console.log(request.new_url)

		try {
			chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
		    	chrome.tabs.update(tab.id, {url: request.new_url});
		    })

		    sendResponse({status: "success"})
		} catch (err) {
			sendResponse({status: "failure"})
		}
	}
)