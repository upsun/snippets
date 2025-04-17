import Link from "next/link";
const localhost="http://localhost:8000";
const locale = typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en";

export default async function Posts() {
    const backendUrl = ('API_HOST' in process.env) ? process.env.API_SCHEME + "://" + process.env.API_HOST : localhost;
    const res = await fetch(`${backendUrl}/${locale}/api/get-all-posts/`, {cache: "no-store"});

    if (!res.ok) {
        throw new Error(`Error while fetching posts:  ${res.status}`);
    }

    const posts = await res.json();

    return (
        <div className="row">
            <div className="col-12 ">
                <div className={'post-title'}><h2>Posts</h2></div>
                <div className="divTable table table-striped table-dark table-borderless table-hover">
                    <div className="divTableHeading">
                        <div className="divTableRow bg-info">
                            <div className="divTableHead">Title</div>
                            <div className="divTableHead">Summary</div>
                            <div className="divTableHead">Published At</div>
                        </div>
                    </div>
                    {posts.map((post, index) => (
                        <div className="divTableRow" key={index}>
                            <Link  href={`/post/${locale}/${post.id}`} className="divTableCell">{post.title}</Link>
                            <Link href={`/post/${locale}/${post.id}`} className="divTableCell">{post.summary}</Link>
                            <Link href={`/post/${locale}/${post.id}`} className="divTableCell">{post.publishedAt.date}</Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}