// src/runtime/sanitize.js
let app_container = "app";
let runtime_operation_name = "gatling_myfirstsimulation";

if (!variables.api_token) {
    console.log("Variable API Token is not defined!");
    console.log("Please define an environment variable with your API Token using command: ");
    console.log("upsun project:curl /integrations/<INTEGRATION_ID>/variables -X POST -d '{\"name\": \"api_token\", \"value\": \"<API_TOKEN>\", \"is_sensitive\": true, \"is_json\": false}' ");
} else {
    console.log("OAuth2 API Token defined");
    let resp = fetch('https://auth.api.platform.sh/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: "client_id=platform-api-user&grant_type=api_token&api_token=" + variables.api_token
    });

    if (!resp.ok) {
        console.log("Failed to get an OAuth2 token, status code was " + resp.status);
    } else {
        console.log("OAuth2 API TOKEN ok");
    }

    let access_token = resp.json().access_token;
    
    // get current branch from activity object
    let branch;
    switch (activity.type) {
        case 'environment.synchronize':
            branch = activity.parameters.into;
            break;
        default:
            branch = activity.parameters.environment;
            break;
    }
    
    // run runtime operation runtime_operation_name on current/targeted environment
    resp = fetch("https://api.upsun.com/api/projects/" + activity.project + "/environments/" + branch + "/deployments/current/operations",
        {
            headers: {
                "Authorization": "Bearer " + access_token
            },
            method: "POST",
            body: JSON.stringify({"service": app_container, "operation": runtime_operation_name}),
        });

    if (!resp.ok) {
        console.log("Failed to invoke the runtime operation \"" + runtime_operation_name + "\", status code was " + resp.status);
    } else {
        console.log(runtime_operation_name + " launched");
    }
}