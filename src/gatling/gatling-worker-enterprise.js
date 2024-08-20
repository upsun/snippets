let simulation="myfirstsimulation";

if (!variables.gatling_enterprise_api_token) {
    console.log("Variable GATLING_ENTERPRISE_API_TOKEN is not defined!");
    console.log("Please define an environment variable with your GATLING_ENTERPRISE_API_TOKEN using command: ");
    console.log("upsun project:curl /integrations/<INTEGRATION_ID>/variables -X POST -d '{\"name\": \"gatling_enterprise_api_token\", \"value\": \"<GATLING_ENTERPRISE_API_TOKEN>\", \"is_sensitive\": true, \"is_json\": false}'");
} else {
    npx gatling enterprise-start --enterprise-simulation=simulation --wait-for-run-end --non-interactive;
}