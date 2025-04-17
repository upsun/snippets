import '@/app/page.css';
import Post from "@/app/components/post";

export default async function PostPage({ params }) {
    const { lang, id } = await params
    return (
        <div className={'container'}>
            <nav className="navbar navbar-expand navbar-dark bg-dark ">
                <a className={"navbar-brand"} href="/">
                    <img src="https://docs.upsun.com/images/logo.svg" width="150"
                         className="d-inline-block align-top" alt="podium"/>
                </a>
            </nav>
            <Post id={id} lang={lang} />
        </div>
    );
}