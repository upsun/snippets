let simulation="myfirstsimulation";

if (!variables.gatling_enterprise_api_token) {
    console.log("Variable GATLING_ENTERPRISE_API_TOKEN is not defined!");
    console.log("Please define an environment variable with your GATLING_ENTERPRISE_API_TOKEN using command: ");
    console.log("upsun project:curl /integrations/<INTEGRATION_ID>/variables -X POST -d '{\"name\": \"gatling_enterprise_api_token\", \"value\": \"<GATLING_ENTERPRISE_API_TOKEN>\", \"is_sensitive\": true, \"is_json\": false}'");
} else {
    npx gatling enterprise-start --enterprise-simulation=simulation;

    if (!resp.ok) {
        console.log("Failed to add a marker \"" + '(' + activity.state + ') ' + activity.text + "\" on your Blackfire environment, status code was " + resp.status);
    } else {
        console.log("Marker \"" + '(' + activity.state + ') ' + activity.text + "\" added on Blackfire");
    }
}