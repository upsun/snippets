export function getBackendUrl() {
    if ('API_HOST' in process.env) {
        return process.env.API_SCHEME + "://" + process.env.API_HOST;
    } else {
        return "http://localhost:8000";
    }
}
