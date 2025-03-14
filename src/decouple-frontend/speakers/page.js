import '@/app/page.css';
let localEndpoint = "https://localhost:8000";
let backendUrl = '';

function getBackendUrl() {
    if ('API_HOST' in process.env) {
        backendUrl = process.env.API_SCHEME + "://" + process.env.API_HOST;
        console.log('On an Upsun Environment:' + backendUrl);
    } else {
        backendUrl = `${localEndpoint}`;
        console.log('Running locally: ' + backendUrl);
    }
    return backendUrl;
}

export default async function PodiumPage() {
    const backendUrl = getBackendUrl();

    const res = await fetch(backendUrl + "/api/get-speaker-list", {
        cache: "no-store", // Pour éviter la mise en cache en production
    });

    if (!res.ok) {
        throw new Error(`Error while fetching speakers: ${res.status}`);
    }

    const speakers = await res.json();

    return (
        <div className={'container'}>
            <nav className="navbar navbar-expand navbar-dark bg-dark ">
                <a className={"navbar-brand"} href="/">
                    <img src="https://s2.qwant.com/thumbr/280x122/e/e/b5d5772ba90bc19429884de88b7a9a16b899624173e1c3ff8c005afc13ee76/th.jpg?u=https%3A%2F%2Ftse.mm.bing.net%2Fth%3Fid%3DOIP.HP2RBmw3Ftrd_EyEQg4b6wAAAA%26pid%3DApi&q=0&b=1&p=0&a=0" width="25" height="30"
                         className="d-inline-block align-top" alt="podium"/>
                    SymfonyCon Vienna 2024
                </a>
            </nav>

            <div className="row">
                <div className="col-12">
                    <div className="divTable table table-striped table-dark table-borderless table-hover">
                        <div className="divTableHeading">
                            <div className="divTableRow bg-info">
                                <div className="divTableHead">Picture</div>
                                <div className="divTableHead">Speaker</div>
                                <div className="divTableHead">Username</div>
                                <div className="divTableHead">City</div>
                                <div className="divTableHead">Distance from Vienna</div>
                            </div>
                        </div>
                        {speakers.map((node, index) => (
                            <div className="divTableRow" key={index}>
                                <div className="divTableCell">
                                    <img className={'speaker-img'} src={node.picture||""} alt=""/>
                                </div>
                                <div className=" divTableCell">
                                    {node.firstName} {node.lastName}
                                </div>
                                <div className=" divTableCell">
                                    {node.username}
                                </div>
                                <div className=" divTableCell">
                                    {node.city}
                                </div>
                                <div className=" divTableCell">
                                    {node.distance / 1000} km
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}