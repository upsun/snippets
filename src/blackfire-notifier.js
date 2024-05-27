function base64Encode(input) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';
    let i = 0;

    while (i < input.length) {
        const a = input.charCodeAt(i++);
        const b = input.charCodeAt(i++);
        const c = input.charCodeAt(i++);
        const index1 = a >> 2;
        const index2 = ((a & 3) << 4) | (b >> 4);
        const index3 = isNaN(b) ? 64 : ((b & 15) << 2) | (c >> 6);
        const index4 = isNaN(c) ? 64 : c & 63;
        output += chars.charAt(index1) + chars.charAt(index2) + chars.charAt(index3) + chars.charAt(index4);
    }
    return output;
}

// Add marker to your corresponding Blackfire blackfire_server_id
if (!variables.blackfire_server_id) {
    console.log("Variable BLACKFIRE_SERVER_ID is not defined!");
    console.log("Please define an environment variable with your BLACKFIRE_SERVER_ID using command: ");
    console.log("1. Get your BLACKFIRE_SERVER_ID value");
    console.log("upsun ssh 'echo $BLACKFIRE_SERVER_ID'");
    console.log("2. copy/paste it in the command line:");
    console.log("upsun project:curl /integrations/<INTEGRATION_ID>/variables -X POST -d '{\"name\": \"blackfire_server_id\", \"value\": \"<BLACKFIRE_SERVER_ID>\", \"is_sensitive\": true, \"is_json\": false}'");
} else if (!variables.blackfire_server_token) {
    console.log("Variable BLACKFIRE_SERVER_TOKEN is not defined!");
    console.log("Please define an environment variable with your BLACKFIRE_SERVER_TOKEN using command: ");
    console.log("1. Get your BLACKFIRE_SERVER_TOKEN value");
    console.log("upsun ssh 'echo $BLACKFIRE_SERVER_TOKEN'");
    console.log("2. copy/paste it in the command line:");
    console.log("upsun project:curl /integrations/<INTEGRATION_ID>/variables -X POST -d '{\"name\": \"blackfire_server_token\", \"value\": \"<BLACKFIRE_SERVER_TOKEN>\", \"is_sensitive\": true, \"is_json\": false}'");
} else {
    resp = fetch("https://apm.blackfire.io/api/v1/events", {
        headers: {
            "Content-type": "application/json",
            "Accept": "application/json",
            'Authorization': 'Basic ' + base64Encode(variables.blackfire_server_id + ':' + variables.blackfire_server_token)
        },
        method: "POST",
        body: JSON.stringify({
            'name': '(' + activity.state + ') ' + activity.type,
        })
    });

    if (!resp.ok) {
        console.log("Failed to add a marker \"" + '(' + activity.state + ') ' + activity.text + "\" on your Blackfire environment, status code was " + resp.status);
    } else {
        console.log("Marker \"" + '(' + activity.state + ') ' + activity.text + "\" added on Blackfire");
    }
}