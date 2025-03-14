import '@/app/page.css';

let localEndpoint = "https://localhost:8000";
let backendUrl = '';

function getBackendUrl() {
    if ('API_HOST' in process.env) {
        backendUrl = process.env.API_SCHEME + "://" + process.env.API_HOST;
        console.log('On an Upsun Environment test:' + backendUrl);
    } else {
        backendUrl = `${localEndpoint}`;
        console.log('Running locally: ' + backendUrl);
    }
    return backendUrl;
}

export default async function PodiumPage() {
    const backendUrl = getBackendUrl();

    const res = await fetch(backendUrl + "/api/get-podium", {
        cache: "no-store", // Pour éviter la mise en cache en production
    });

    if (!res.ok) {
        throw new Error(`Erreur lors de la récupération du podium: ${res.status}`);
    }

    const podium = await res.json();

    return (
        <div className={'container'}>
            <nav className="navbar navbar-expand navbar-dark bg-dark ">
                <a className={"navbar-brand"} href="/">
                    <img src="https://s2.qwant.com/thumbr/280x122/e/e/b5d5772ba90bc19429884de88b7a9a16b899624173e1c3ff8c005afc13ee76/th.jpg?u=https%3A%2F%2Ftse.mm.bing.net%2Fth%3Fid%3DOIP.HP2RBmw3Ftrd_EyEQg4b6wAAAA%26pid%3DApi&q=0&b=1&p=0&a=0" width="25" height="30"
                         className="d-inline-block align-top" alt="podium"/>
                    SymfonyCon Vienna 2024
                </a>
            </nav>

            <div className={'row'}>
                <div className={'col-12'}>
                    <div id="root">
                        <div className="podium-container">
                            <div className={'podium-title'}>
                                <h1>Congrats</h1>
                            </div>
                            <div className={'podium'}>
                                <div className={'item-block-second'}>
                                    <div className={'image-container'}><img src={podium[1].picture || ""} alt=""/></div>
                                    <div>{podium[1].username} - {podium[1].city}</div>
                                    <div className={'podium-item-second'}><span>2</span></div>
                                </div>
                                <div className={'item-block-first'}>
                                    <div className={'image-container'}><img src={podium[0].picture || ""} alt=""/></div>
                                    <div>{podium[0].username} - {podium[0].city}</div>
                                    <div className={'podium-item-first'}><span>1</span></div>
                                </div>
                                <div className={'item-block-third'}>
                                    <div className={'image-container'}><img src={podium[2].picture || ""} alt=""/></div>
                                    <div>{podium[2].username} - {podium[2].city}</div>
                                    <div className={'podium-item-third'}><span>3</span></div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}