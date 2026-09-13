import { Bell, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Layout() {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [count, setCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setMenu(false);
  }, [location.pathname]);
  useEffect(() => {
    if (user)
      api<number>("/notifications/unread/count")
        .then((v) =>
          setCount(
            typeof v === "number"
              ? v
              : Number((v as unknown as { count: number })?.count || 0),
          ),
        )
        .catch(() => {});
  }, [user, location.pathname]);
  const search = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    navigate(`/?q=${encodeURIComponent(String(q || ""))}`);
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span>roomly</span>
          <i>.</i>
        </Link>
        <form className="nav-search" onSubmit={search}>
          <Search size={17} />
          <input
            name="q"
            placeholder="Bạn muốn đi đâu?"
            defaultValue={new URLSearchParams(location.search).get("q") || ""}
          />
        </form>
        <nav className={menu ? "nav open" : "nav"}>
          <NavLink to="/">Khám phá</NavLink>
          <NavLink to="/auctions">Đấu giá</NavLink>
          {user && <NavLink to="/dashboard/host">Đăng phòng</NavLink>}
          {user ? (
            <Link className="profile-chip" to="/dashboard">
              <span className="avatar">{user.name?.[0]?.toUpperCase()}</span>
              <span>{user.name}</span>
            </Link>
          ) : (
            <Link className="btn small" to="/auth">
              Đăng nhập
            </Link>
          )}
          {user && (
            <Link className="icon-link" to="/dashboard/notifications">
              <Bell size={20} />
              {count > 0 && <b>{count > 9 ? "9+" : count}</b>}
            </Link>
          )}
        </nav>
        <button
          className="menu-btn"
          onClick={() => setMenu(!menu)}
          aria-label="Menu"
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        <div>
          <Link className="brand light" to="/">
            roomly<i>.</i>
          </Link>
          <p>Một chốn nhỏ. Một câu chuyện lớn.</p>
        </div>
        <div className="footer-links">
          <Link to="/">Khám phá</Link>
          <Link to="/auctions">Đấu giá</Link>
          <Link to="/dashboard/host">Trở thành chủ nhà</Link>
        </div>
        <div>
          <p>© 2026 Roomly Hub</p>
          <p>Made for meaningful stays.</p>
        </div>
      </footer>
    </div>
  );
}
