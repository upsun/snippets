import { getBackendUrl } from "@/app/components/utils";

export default async function Podium() {
    const backendUrl = getBackendUrl();

    const res = await fetch(backendUrl + "/api/get-podium", { cache: "no-store" });

    if (!res.ok) {
        throw new Error(`Error while fetching podium: ${res.status}`);
    }

    const podium = await res.json();
    
    return (
        <div className={'row'}>
            <div className={'col-12'}>
                <div id="root">
                    <div className="podium-container">
                        <div className={'podium-title'}>
                            <h2>Congrats to the 3 farthest speakers</h2>
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
    );
}
