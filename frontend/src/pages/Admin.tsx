import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileWarning,
  Gauge,
  Image as ImageIcon,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { toast } from "sonner";
import { Badge, Empty, Loading, Modal } from "../components/UI";
import { useAuth } from "../lib/auth";
import { roomlyApi } from "../lib/roomlyApi";
import type { KycSubmission, Room } from "../types";
import { adminRoleName, date, money } from "../types";
import { fail } from "./dashboard/shared";

type PendingRoom = {
  id: string;
  hostId: string;
  submittedAt: string;
  room: Room;
};

const adminNav = [
  { to: "/admin", label: "Tổng quan", icon: Gauge, end: true },
  { to: "/admin/rooms", label: "Duyệt phòng", icon: Building2 },
  { to: "/admin/kyc", label: "Xác minh KYC", icon: ClipboardCheck },
  { to: "/admin/reviews", label: "Quản lý đánh giá", icon: Star },
];

function PageTitle({ eyebrow, title, text, action }: {
  eyebrow: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <header className="admin-page-title">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </header>
  );
}

function QueueCard({ icon, value, label, hint, to, tone }: {
  icon: ReactNode;
  value: number | string;
  label: string;
  hint: string;
  to: string;
  tone: string;
}) {
  return (
    <Link className={`admin-metric ${tone}`} to={to}>
      <div className="admin-metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
      <ChevronRight className="admin-metric-arrow" />
    </Link>
  );
}

function AdminOverview() {
  const [kyc, setKyc] = useState<KycSubmission[]>([]);
  const [rooms, setRooms] = useState<PendingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    Promise.all([roomlyApi.kyc.pending(), roomlyApi.rooms.pending()])
      .then(([nextKyc, nextRooms]) => {
        setKyc(nextKyc);
        setRooms(nextRooms);
      })
      .catch(fail)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const total = kyc.length + rooms.length;
  return (
    <>
      <PageTitle
        eyebrow="TRUNG TÂM ĐIỀU HÀNH"
        title="Chào ngày mới, quản trị viên"
        text="Theo dõi và xử lý các nội dung đang chờ trên Roomly Hub."
        action={
          <button className="admin-refresh" onClick={load} disabled={loading}>
            <RefreshCw /> Làm mới dữ liệu
          </button>
        }
      />
      <section className="admin-metrics">
        <QueueCard icon={<FileWarning />} value={total} label="Tổng việc chờ xử lý" hint={total ? "Cần được kiểm tra" : "Hệ thống đã sạch"} to="/admin/rooms" tone="coral" />
        <QueueCard icon={<Building2 />} value={rooms.length} label="Phòng chờ duyệt" hint="Listing mới từ chủ nhà" to="/admin/rooms" tone="green" />
        <QueueCard icon={<Users />} value={kyc.length} label="Hồ sơ KYC" hint="Danh tính cần xác minh" to="/admin/kyc" tone="sand" />
      </section>

      <div className="admin-overview-grid">
        <section className="admin-surface">
          <div className="admin-section-head">
            <div><span>HÀNG ĐỢI</span><h2>Phòng mới gửi duyệt</h2></div>
            <Link to="/admin/rooms">Xem tất cả <ChevronRight /></Link>
          </div>
          {loading ? <Loading /> : rooms.length ? (
            <div className="admin-compact-list">
              {rooms.slice(0, 4).map((item) => (
                <Link to="/admin/rooms" key={item.id}>
                  <span className="admin-room-thumb">
                    {item.room?.photos?.[0]?.url ? <img src={item.room.photos[0].url} alt="" /> : <ImageIcon />}
                  </span>
                  <span><strong>{item.room?.title || "Phòng chưa đặt tên"}</strong><small>{item.room?.city || "Chưa có địa điểm"}</small></span>
                  <time>{date(item.submittedAt)}</time><ChevronRight />
                </Link>
              ))}
            </div>
          ) : <Empty title="Không có phòng chờ duyệt" text="Mọi listing đã được xử lý." />}
        </section>
        <section className="admin-surface">
          <div className="admin-section-head">
            <div><span>XÁC MINH</span><h2>Hồ sơ KYC gần đây</h2></div>
            <Link to="/admin/kyc">Xem tất cả <ChevronRight /></Link>
          </div>
          {loading ? <Loading /> : kyc.length ? (
            <div className="admin-kyc-list">
              {kyc.slice(0, 5).map((item) => (
                <Link to="/admin/kyc" key={item.id}>
                  <span className="admin-id-avatar">{item.id.slice(0, 2)}</span>
                  <span><strong>Hồ sơ #{item.id.slice(0, 8)}</strong><small>Gửi {date(item.submittedAt)}</small></span>
                  <Badge tone="orange">Chờ duyệt</Badge>
                </Link>
              ))}
            </div>
          ) : <Empty title="Không có hồ sơ KYC" text="Hàng đợi xác minh đang trống." />}
        </section>
      </div>
    </>
  );
}

function RejectDialog({ title, onClose, onConfirm, busy }: {
  title: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <form className="admin-reject-form" onSubmit={(event) => {
        event.preventDefault();
        if (reason.trim()) onConfirm(reason.trim());
      }}>
        <label>
          <span>Lý do từ chối</span>
          <textarea autoFocus required minLength={5} rows={5} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mô tả rõ nội dung cần chỉnh sửa…" />
        </label>
        <div>
          <button type="button" className="outline-btn" onClick={onClose}>Hủy</button>
          <button className="btn admin-danger-btn" disabled={busy || reason.trim().length < 5}><XCircle /> Xác nhận từ chối</button>
        </div>
      </form>
    </Modal>
  );
}

function RoomModeration() {
  const [items, setItems] = useState<PendingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PendingRoom | null>(null);
  const [rejecting, setRejecting] = useState<PendingRoom | null>(null);
  const [busyId, setBusyId] = useState("");
  const load = () => {
    setLoading(true);
    roomlyApi.rooms.pending().then(setItems).catch(fail).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const filtered = useMemo(() => {
    const value = query.toLowerCase().trim();
    return value ? items.filter((item) => [item.room?.title, item.room?.city, item.hostId, item.id].join(" ").toLowerCase().includes(value)) : items;
  }, [items, query]);
  const act = async (item: PendingRoom, approved: boolean, reason?: string) => {
    setBusyId(item.id);
    try {
      if (approved) await roomlyApi.rooms.approve(item.id);
      else await roomlyApi.rooms.reject(item.id, reason!);
      setItems((current) => current.filter((room) => room.id !== item.id));
      setSelected(null); setRejecting(null);
      toast.success(approved ? "Đã duyệt phòng" : "Đã từ chối phòng");
    } catch (error) { fail(error); } finally { setBusyId(""); }
  };
  return (
    <>
      <PageTitle eyebrow="KIỂM DUYỆT LISTING" title="Phòng chờ duyệt" text="Kiểm tra thông tin, hình ảnh và tiêu chuẩn listing trước khi xuất bản." action={<button className="admin-refresh" onClick={load}><RefreshCw /> Làm mới</button>} />
      <section className="admin-surface admin-table-surface">
        <div className="admin-list-tools">
          <label><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên phòng, thành phố hoặc ID…" /></label>
          <Badge tone={items.length ? "orange" : "green"}>{items.length} đang chờ</Badge>
        </div>
        {loading ? <Loading /> : filtered.length ? (
          <div className="admin-room-table">
            <div className="admin-table-head"><span>Listing</span><span>Chủ nhà</span><span>Ngày gửi</span><span>Mức giá</span><span>Thao tác</span></div>
            {filtered.map((item) => (
              <article key={item.id}>
                <button className="admin-listing-cell" onClick={() => setSelected(item)}>
                  <span className="admin-room-thumb">{item.room?.photos?.[0]?.url ? <img src={item.room.photos[0].url} alt="" /> : <ImageIcon />}</span>
                  <span><strong>{item.room?.title || "Phòng chưa đặt tên"}</strong><small>{item.room?.city || item.room?.address || "Chưa có địa điểm"}</small></span>
                </button>
                <span className="admin-mono">{item.hostId.slice(0, 8)}…</span><span>{date(item.submittedAt)}</span><strong>{money(item.room?.pricePerNight)}</strong>
                <span className="admin-row-actions">
                  <button className="admin-icon-success" title="Duyệt" disabled={busyId === item.id} onClick={() => void act(item, true)}><Check /></button>
                  <button className="admin-icon-danger" title="Từ chối" disabled={busyId === item.id} onClick={() => setRejecting(item)}><X /></button>
                  <button className="admin-icon-plain" title="Xem chi tiết" onClick={() => setSelected(item)}><ChevronRight /></button>
                </span>
              </article>
            ))}
          </div>
        ) : <Empty title="Không tìm thấy phòng chờ duyệt" text={query ? "Thử một từ khóa khác." : "Tất cả listing đã được xử lý."} />}
      </section>
      {selected && (
        <Modal title="Chi tiết listing" onClose={() => setSelected(null)}>
          <div className="admin-room-detail">
            <div className="admin-detail-photo">{selected.room?.photos?.[0]?.url ? <img src={selected.room.photos[0].url} alt={selected.room.title} /> : <ImageIcon />}</div>
            <div><Badge tone="orange">Chờ duyệt</Badge><h2>{selected.room?.title}</h2><p>{selected.room?.description || "Chưa có mô tả."}</p></div>
            <dl>
              <div><dt>Địa chỉ</dt><dd>{selected.room?.address || selected.room?.city || "—"}</dd></div><div><dt>Giá mỗi đêm</dt><dd>{money(selected.room?.pricePerNight)}</dd></div><div><dt>Số khách tối đa</dt><dd>{selected.room?.maxGuests || "—"}</dd></div><div><dt>Loại phòng</dt><dd>{String(selected.room?.roomType || "—")}</dd></div>
            </dl>
            <div className="admin-detail-actions"><button className="outline-btn danger" onClick={() => setRejecting(selected)}><X /> Từ chối</button><button className="btn" disabled={busyId === selected.id} onClick={() => void act(selected, true)}><Check /> Duyệt listing</button></div>
          </div>
        </Modal>
      )}
      {rejecting && <RejectDialog title={`Từ chối “${rejecting.room?.title || "listing"}”`} busy={busyId === rejecting.id} onClose={() => setRejecting(null)} onConfirm={(reason) => void act(rejecting, false, reason)} />}
    </>
  );
}

function KycModeration() {
  const [items, setItems] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [rejecting, setRejecting] = useState<KycSubmission | null>(null);
  const [busyId, setBusyId] = useState("");
  const load = () => {
    setLoading(true);
    roomlyApi.kyc.pending().then(setItems).catch(fail).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const filtered = items.filter((item) => item.id.toLowerCase().includes(query.toLowerCase().trim()));
  const act = async (item: KycSubmission, approved: boolean, reason?: string) => {
    setBusyId(item.id);
    try {
      await roomlyApi.kyc.review(item.id, approved, reason);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setRejecting(null);
      toast.success(approved ? "Đã xác minh hồ sơ KYC" : "Đã từ chối hồ sơ KYC");
    } catch (error) { fail(error); } finally { setBusyId(""); }
  };
  return (
    <>
      <PageTitle eyebrow="XÁC MINH DANH TÍNH" title="Hồ sơ KYC" text="Xử lý các yêu cầu xác minh theo dữ liệu được cung cấp bởi API Roomly." action={<button className="admin-refresh" onClick={load}><RefreshCw /> Làm mới</button>} />
      <section className="admin-surface admin-table-surface">
        <div className="admin-list-tools"><label><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo mã hồ sơ…" /></label><Badge tone={items.length ? "orange" : "green"}>{items.length} đang chờ</Badge></div>
        {loading ? <Loading /> : filtered.length ? (
          <div className="admin-kyc-grid">
            {filtered.map((item) => (
              <article key={item.id}>
                <div className="admin-kyc-card-head"><span className="admin-id-avatar">{item.id.slice(0, 2)}</span><Badge tone="orange">Chờ duyệt</Badge></div>
                <span>MÃ HỒ SƠ</span><h3>#{item.id.slice(0, 13)}</h3>
                <dl><div><dt>Ngày gửi</dt><dd>{date(item.submittedAt)}</dd></div><div><dt>Trạng thái API</dt><dd>{String(item.status)}</dd></div></dl>
                <div className="admin-kyc-actions"><button className="outline-btn danger" disabled={busyId === item.id} onClick={() => setRejecting(item)}><X /> Từ chối</button><button className="btn" disabled={busyId === item.id} onClick={() => void act(item, true)}><Check /> Xác minh</button></div>
              </article>
            ))}
          </div>
        ) : <Empty title="Không tìm thấy hồ sơ KYC" text={query ? "Kiểm tra lại mã hồ sơ." : "Hàng đợi xác minh đang trống."} />}
      </section>
      {rejecting && <RejectDialog title={`Từ chối hồ sơ #${rejecting.id.slice(0, 8)}`} busy={busyId === rejecting.id} onClose={() => setRejecting(null)} onConfirm={(reason) => void act(rejecting, false, reason)} />}
    </>
  );
}

function ReviewModeration() {
  const [reviewId, setReviewId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewId.trim() || !confirmed) return;
    setBusy(true);
    try {
      await roomlyApi.reviews.remove(reviewId.trim());
      toast.success("Đã gỡ đánh giá khỏi hệ thống");
      setReviewId(""); setConfirmed(false);
    } catch (error) { fail(error); } finally { setBusy(false); }
  };
  return (
    <>
      <PageTitle eyebrow="AN TOÀN CỘNG ĐỒNG" title="Quản lý đánh giá" text="Gỡ nội dung vi phạm bằng mã đánh giá theo endpoint kiểm duyệt hiện có." />
      <div className="admin-review-layout">
        <section className="admin-surface admin-review-form">
          <div className="admin-warning-icon"><FileWarning /></div><h2>Gỡ một đánh giá</h2>
          <p>Hành động này sẽ xóa đánh giá khỏi Roomly. Hãy đối chiếu chính xác mã đánh giá trước khi tiếp tục.</p>
          <form onSubmit={remove}>
            <label><span>Mã đánh giá (Review ID)</span><input value={reviewId} onChange={(e) => { setReviewId(e.target.value); setConfirmed(false); }} placeholder="Ví dụ: 1d94cf9e-…" required /></label>
            <label className="admin-confirm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>Tôi đã kiểm tra và xác nhận đánh giá này vi phạm.</span></label>
            <button className="btn admin-danger-btn" disabled={busy || !confirmed || !reviewId.trim()}><XCircle /> {busy ? "Đang xử lý…" : "Gỡ đánh giá"}</button>
          </form>
        </section>
        <aside className="admin-guideline"><ShieldCheck /><h3>Lưu ý kiểm duyệt</h3><ul><li>Kiểm tra đúng mã đánh giá được báo cáo.</li><li>Chỉ gỡ nội dung vi phạm quy chuẩn cộng đồng.</li><li>API hiện tại chưa cung cấp danh sách đánh giá bị gắn cờ.</li></ul></aside>
      </div>
    </>
  );
}

export default function Admin() {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  if (!user) return null;
  return (
    <div className="admin-shell">
      <aside className={menu ? "admin-sidebar open" : "admin-sidebar"}>
        <div className="admin-brand"><Link to="/">roomly<i>.</i></Link><span>ADMIN</span><button onClick={() => setMenu(false)} aria-label="Đóng menu"><X /></button></div>
        <nav>
          <span>ĐIỀU HÀNH</span>
          {adminNav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon />{label}</NavLink>)}
          <span>LIÊN KẾT</span><Link to="/dashboard"><ExternalLink /> Dashboard cá nhân</Link><Link to="/"><ArrowLeft /> Về website</Link>
        </nav>
        <div className="admin-account"><span className="avatar">{user.name?.[0]?.toUpperCase()}</span><span><strong>{user.name}</strong><small>{adminRoleName(user.adminRole)}</small></span><button onClick={() => void logout()} title="Đăng xuất"><LogOut /></button></div>
      </aside>
      {menu && <button className="admin-menu-overlay" aria-label="Đóng menu" onClick={() => setMenu(false)} />}
      <main className="admin-main">
        <header className="admin-topbar"><button className="admin-menu-button" onClick={() => setMenu(true)}><Menu /></button><div><ShieldCheck /><span>Roomly Admin</span></div><span className="admin-live"><i /> Hệ thống trực tuyến</span></header>
        <div className="admin-content"><Routes><Route index element={<AdminOverview />} /><Route path="rooms" element={<RoomModeration />} /><Route path="kyc" element={<KycModeration />} /><Route path="reviews" element={<ReviewModeration />} /><Route path="*" element={<Navigate to="/admin" replace />} /></Routes></div>
      </main>
    </div>
  );
}
