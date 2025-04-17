const localhost="http://localhost:8000";

export default async function Post({ lang, id }) {
    const backendUrl = ('API_HOST' in process.env) ? process.env.API_SCHEME + "://" + process.env.API_HOST : localhost;;
    const res = await fetch(`${backendUrl}/${lang}/api/get-post/${id}`, {cache: "no-store"});

    if (!res.ok) {
        throw new Error(`Error while fetching posts: ${res.status}`);
    }

    let post = await res.json();

    return (
        <div className="row">
            <div className="col-12">
                <h1>{post[0].title}</h1>
                <p>{post[0].content}</p>
            </div>
        </div>
    );
}