let localEndpoint = "https://localhost:8000/";
let backendUrl = '';

function getBackendUrl() {
    if ('PLATFORM_ROUTES' in process.env) {
        var data = decode(process.env.PLATFORM_ROUTES)
        const result = Object.entries(data)
            .filter(([key, value]) => value.id === "api")
            .map(([key, value]) => key)
        backendUrl = `${result[0]}`;
        console.log('On an Upsun Environment:' + backendUrl);
    } else {
        backendUrl = `${localEndpoint}`;
        console.log('Running locally: ' + backendUrl);
    }
    return backendUrl;
}

function decode(value) {
    return JSON.parse(Buffer.from(value, 'base64'));
}

export async function SpeakerList() {
    backendUrl = getBackendUrl();
    let speakerList = [];
    try {
        speakerList = await fetch(backendUrl + 'api/get-speaker-list');
        speakerList = await speakerList.json();
    } catch (e) {
        return 'Error during SpeakerList ' + e.message;
    }

    if (!speakerList) {
        return '';
    }

    return (
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
                    {speakerList.map((node, index) => (
                        <div className="divTableRow" key={index}>
                            <div className="divTableCell">
                                <img className={'speaker-img'} src={node.picture} alt=""/>
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
    );
}

export async function Podium() {
    backendUrl = getBackendUrl();
    let podiumList = [];
    let podium = false;
    try {
        podiumList = await fetch(backendUrl + 'api/get-podium');
        podium = await podiumList.json();
    } catch (e) {
        return 'Error during Podium ' + e.message;
    }

    if (!podium) {
        return '';
    }

    return (
        <div className={'row'}>
            <div className={'col-12'}>
                <div id="root">
                    <div className="podium-container">
                        <div className={'podium-title'}>
                            <h1>Congrats</h1>
                        </div>
                        <div className={'podium'}>
                            <div className={'item-block-second'}>
                                <div className={'image-container'}><img src={podium[1].picture} alt=""/></div>
                                <div>{podium[1].username} - {podium[1].city}</div>
                                <div className={'podium-item-second'}><span>2</span></div>
                            </div>
                            <div className={'item-block-first'}>
                                <div className={'image-container'}><img src={podium[0].picture} alt=""/></div>
                                <div>{podium[0].username} - {podium[0].city}</div>
                                <div className={'podium-item-first'}><span>1</span></div>
                            </div>
                            <div className={'item-block-third'}>
                                <div className={'image-container'}><img src={podium[2].picture} alt=""/></div>
                                <div>{podium[2].username} - {podium[2].city}</div>
                                <div className={'podium-item-third'}><span>3</span></div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}