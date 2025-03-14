import { getBackendUrl } from "@/app/components/utils";
export default async function SpeakerList() {
    const backendUrl = getBackendUrl();

    const res = await fetch(backendUrl + "/api/get-speaker-list", { cache: "no-store" });

    if (!res.ok) {
        throw new Error(`Error while fetching speakers: ${res.status}`);
    }

    const speakers = await res.json();

    return (
        <div className="row">
            <div className="col-12">
                <div className={'podium-title'}>
                    <h2>Speaker List</h2>
                </div>
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
    );
}
