window._config = {
    api: {
        invokeUrl: process.env.LAMBDA_INVOKE_URL,
        key: process.env.LAMBDA_API_KEY
    },
    message: {
    	key: process.env.BACKGROUND_KEY
    }
};
