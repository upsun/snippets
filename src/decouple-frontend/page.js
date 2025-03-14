"use client";
import '@/app/page.css';
import Link from "next/link";

export default function Homepage() {
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
                    Welcome on our website showcasing how to decouple your frontend.
                </div>
            </div>
            <div className="row">
                <div className="col-12">
                    <div className="mt-4">
                        <Link href="/speakers" className="btn btn-primary">
                            Speaker list
                        </Link>
                    </div>
                    <div className="mt-4">
                        <Link href="/podium" className="btn btn-primary">
                            Podium
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
