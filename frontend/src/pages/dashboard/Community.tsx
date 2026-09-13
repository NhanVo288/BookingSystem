import { Bell, Check, ExternalLink, ImagePlus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge, Empty, Field } from "../../components/UI";
import { useAuth } from "../../lib/auth";
import { roomlyApi } from "../../lib/roomlyApi";
import type { Notification, Review } from "../../types";
import { date, kycStatusName } from "../../types";
import { fail, heading } from "./shared";

export function NotificationPanel() {
  const [items, setItems] = useState<Notification[]>([]);
  const load = () =>
    roomlyApi.notifications.unread().then(setItems).catch(fail);
  useEffect(() => {
    void load();
  }, []);
  const readAll = async () => {
    try {
      await roomlyApi.notifications.readAll();
      setItems([]);
      toast.success("Đã đọc tất cả");
    } catch (e) {
      fail(e);
    }
  };
  return (
    <>
      {heading(
        "Thông báo",
        "Các cập nhật quan trọng về tài khoản và chuyến đi.",
      )}
      <div className="toolbar">
        <span>{items.length} chưa đọc</span>
        {items.length > 0 && (
          <button className="outline-btn" onClick={readAll}>
            <Check /> Đánh dấu đã đọc
          </button>
        )}
      </div>
      {items.length ? (
        <div className="notification-list">
          {items.map((n) => (
            <article className="panel-card" key={n.id}>
              <span className="notice-icon">
                <Bell />
              </span>
              <div>
                <div>
                  <Badge>{String(n.category)}</Badge>
                  <small>{date(n.createdAt)}</small>
                </div>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                {n.actionUrl && (
                  <a href={n.actionUrl}>
                    Xem chi tiết <ExternalLink />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Bạn đã xem hết thông báo" />
      )}
      <Preferences />
    </>
  );
}
function Preferences() {
  const [value, setValue] = useState({
    category: 0,
    channel: 0,
    isEnabled: true,
  });
  const save = async () => {
    try {
      await roomlyApi.notifications.preference(
        value.category,
        value.channel,
        value.isEnabled,
      );
      toast.success("Đã lưu tùy chọn");
    } catch (e) {
      fail(e);
    }
  };
  return (
    <section className="panel-card preference">
      <h2>Tùy chọn nhận tin</h2>
      <div>
        <select
          value={value.category}
          onChange={(e) =>
            setValue({ ...value, category: Number(e.target.value) })
          }
        >
          <option value="0">Đặt phòng</option>
          <option value="1">Thanh toán</option>
          <option value="2">Đánh giá</option>
          <option value="3">Hệ thống</option>
          <option value="4">Tài khoản</option>
        </select>
        <select
          value={value.channel}
          onChange={(e) =>
            setValue({ ...value, channel: Number(e.target.value) })
          }
        >
          <option value="0">Trong ứng dụng</option>
          <option value="1">Email</option>
          <option value="2">Push</option>
        </select>
        <label className="switch">
          <input
            type="checkbox"
            checked={value.isEnabled}
            onChange={(e) =>
              setValue({ ...value, isEnabled: e.target.checked })
            }
          />
          <span />
        </label>
        <button className="btn small" onClick={save}>
          Lưu
        </button>
      </div>
    </section>
  );
}

export function ReviewPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Review[]>([]);
  const [form, setForm] = useState({
    bookingId: "",
    reviewType: "GuestToRoom",
    subjectId: "",
    subjectRoomId: "",
    rating: 5,
    comment: "",
  });
  const load = () =>
    user
      ? roomlyApi.reviews
          .user(user.id)
          .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
          .catch(fail)
      : Promise.resolve();
  useEffect(() => {
    void load();
  }, [user?.id]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomlyApi.reviews.submit({
        ...form,
        subjectId: form.subjectId || null,
        subjectRoomId: form.subjectRoomId || null,
      });
      toast.success("Đã gửi đánh giá");
      setForm({ ...form, comment: "" });
      load();
    } catch (e) {
      fail(e);
    }
  };
  const flag = async (id: string) => {
    const reason = prompt("Lý do báo cáo đánh giá?");
    if (!reason) return;
    try {
      await roomlyApi.reviews.flag(id, reason);
      toast.success("Đã báo cáo đánh giá");
    } catch (e) {
      fail(e);
    }
  };
  return (
    <>
      {heading("Đánh giá", "Chia sẻ trải nghiệm và xem phản hồi về bạn.")}
      <div className="review-panel-grid">
        <form className="panel-card form-grid" onSubmit={submit}>
          <h2>Viết đánh giá</h2>
          <Field label="Mã đặt phòng">
            <input
              required
              value={form.bookingId}
              onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
            />
          </Field>
          <Field label="Loại">
            <select
              value={form.reviewType}
              onChange={(e) => setForm({ ...form, reviewType: e.target.value })}
            >
              <option>GuestToRoom</option>
              <option>GuestToHost</option>
              <option>HostToGuest</option>
              <option>RoommateToGuest</option>
            </select>
          </Field>
          <Field label="Room ID">
            <input
              value={form.subjectRoomId}
              onChange={(e) =>
                setForm({ ...form, subjectRoomId: e.target.value })
              }
            />
          </Field>
          <Field label="User ID">
            <input
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
            />
          </Field>
          <Field label="Điểm">
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={n <= form.rating ? "active" : ""}
                  onClick={() => setForm({ ...form, rating: n })}
                >
                  <Star />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Nội dung">
            <textarea
              rows={4}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </Field>
          <button className="btn">Gửi đánh giá</button>
        </form>
        <section className="panel-card">
          <h2>Đánh giá về bạn</h2>
          {items.length ? (
            <div className="mini-reviews">
              {items.map((r) => (
                <article key={r.id}>
                  <div>
                    <strong>{r.reviewerName}</strong>
                    <small>{date(r.created)}</small>
                  </div>
                  <span>{"★".repeat(r.rating)}</span>
                  <p>{r.comment}</p>
                  <button
                    className="text-btn danger"
                    onClick={() => flag(r.id)}
                  >
                    Báo cáo
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <Empty title="Chưa có đánh giá" />
          )}
        </section>
      </div>
    </>
  );
}

export function KycPanel() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    documentType: 0,
    frontImageUrl: "",
    backImageUrl: "",
    selfieUrl: "",
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomlyApi.kyc.submit(form);
      toast.success("Đã gửi hồ sơ xác minh");
      await refresh();
    } catch (e) {
      fail(e);
    }
  };
  return (
    <>
      {heading(
        "Xác minh danh tính",
        "Hoàn tất KYC để xây dựng cộng đồng đáng tin cậy.",
      )}
      <div className="kyc-banner">
        <ImagePlus />
        <div>
          <h2>{kycStatusName(user?.kycStatus || 0)}</h2>
          <p>Bạn có tối đa 3 lần gửi hồ sơ.</p>
        </div>
        <Badge tone={Number(user?.kycStatus) === 2 ? "green" : "orange"}>
          {user?.kycAttemptCount || 0}/3
        </Badge>
      </div>
      <form className="panel-card form-grid kyc-form" onSubmit={submit}>
        <Field label="Loại giấy tờ">
          <select
            value={form.documentType}
            onChange={(e) =>
              setForm({ ...form, documentType: Number(e.target.value) })
            }
          >
            <option value="0">CCCD / CMND</option>
            <option value="1">Hộ chiếu</option>
          </select>
        </Field>
        <Field label="Ảnh mặt trước (URL)">
          <input
            type="url"
            required
            value={form.frontImageUrl}
            onChange={(e) =>
              setForm({ ...form, frontImageUrl: e.target.value })
            }
          />
        </Field>
        <Field label="Ảnh mặt sau (URL)">
          <input
            type="url"
            value={form.backImageUrl}
            onChange={(e) => setForm({ ...form, backImageUrl: e.target.value })}
          />
        </Field>
        <Field label="Ảnh selfie (URL)">
          <input
            type="url"
            required
            value={form.selfieUrl}
            onChange={(e) => setForm({ ...form, selfieUrl: e.target.value })}
          />
        </Field>
        <button className="btn">Gửi hồ sơ</button>
      </form>
    </>
  );
}
