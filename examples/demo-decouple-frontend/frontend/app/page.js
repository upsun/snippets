import '@/app/page.css';
import Posts from "@/app/components/posts";

export default function Home() {
  return (
      <div className={'container'}>
        <nav className="navbar navbar-expand navbar-dark bg-dark ">
          <a className={"navbar-brand"} href="/"><img src="https://docs.upsun.com/images/logo.svg" width="150" className="d-inline-block align-top" alt="podium"/></a>
        </nav>
        <div className="row">
          <div className="col-12">
            <div className={'post-title'}>
              <h1>Welcome on our decoupled website</h1>
            </div>
          </div>
        </div>

        <Posts />
      </div>
  );
}