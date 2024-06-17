// please customize these values
const projectId = 'abcdef12345'; // Status Holder projectId
const environment = 'main';
const interval = 2000; // 2sec
const apiEndpoint = 'StatusHolderUri' + '/api/'; // Status Holder uri

/**
 * Function that checks project status and displays a Notiflix banner if a deployment is in progress.
 * Notiflix Documentation: https://notiflix.github.io/documentation
 *
 * @returns void
 */
async function checkProjectStatus() {
    const response = await fetch(apiEndpoint + projectId + '/' + environment, {
        method: 'GET',
        crossDomain: true,
        contentType: 'application/json',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        // do something
    }

    const body = await response.json();

    if (!body.available) {
        // Do whatever you want to make your visitor wait for the application to be back
        Notiflix.Loading.custom(
            'A new deployment of the application has been triggered, please wait for the app to be back. This should take a few.',
            {
                customSvgUrl: 'https://raw.githubusercontent.com/upsun/infrasctucture-notif/main/assets/images/anim_shadok_01.gif',
                svgSize: '400px',
                backgroundColor: 'rgba(0,0,0,0.8)',
                messageMaxLength: 300,
                messageFontSize: '20px',

            });
    } else {
        // application is back
        Notiflix.Loading.remove();
    }
}

// check project status every interval (default to 2sec).
setInterval(function () {
    checkProjectStatus();
}, interval);