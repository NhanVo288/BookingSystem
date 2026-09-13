import { CalendarDays, Gavel, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge, Empty, Field, Modal } from "../../components/UI";
import { roomlyApi } from "../../lib/roomlyApi";
import type { Auction, Bid, KycSubmission, Room } from "../../types";
import { date, money } from "../../types";
import { fail, heading, statusTone } from "./shared";

export function MyAuctions() {
  const [items, setItems] = useState<Auction[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    roomId: "",
    checkInDate: "",
    checkOutDate: "",
    startingPrice: "",
    minBidIncrementType: "FixedAmount",
    minBidIncrementValue: "",
    duration: "ThreeHours",
  });
  const load = () =>
    Promise.all([roomlyApi.auctions.mine(), roomlyApi.auctions.myBids()])
      .then(([a, b]) => {
        setItems(a);
        setBids(b);
      })
      .catch(fail);
  useEffect(() => {
    void load();
  }, []);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomlyApi.auctions.create({
        ...form,
        startingPrice: Number(form.startingPrice),
        minBidIncrementValue: Number(form.minBidIncrementValue),
      });
      toast.success("Đã tạo phiên đấu giá");
      setShow(false);
      load();
    } catch (e) {
      fail(e);
    }
  };
  const action = async (id: string, kind: "cancel" | "pay") => {
    try {
      if (kind === "cancel") await roomlyApi.auctions.cancel(id);
      else await roomlyApi.auctions.pay(id);
      toast.success("Thao tác thành công");
      load();
    } catch (e) {
      fail(e);
    }
  };
  return (
    <>
      {heading(
        "Đấu giá của tôi",
        "Quản lý phiên đã tạo và các lượt giá đã tham gia.",
      )}
      <div className="toolbar">
        <button className="btn" onClick={() => setShow(true)}>
          <Plus /> Tạo phiên
        </button>
      </div>
      <div className="split-panels">
        <section>
          <h2>Phiên của tôi</h2>
          {items.length ? (
            items.map((a) => (
              <article className="panel-card auction-mini" key={a.id}>
                <div>
                  <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                  <h3>{a.roomTitle}</h3>
                  <p>
                    {date(a.checkInDate)} — {date(a.checkOutDate)}
                  </p>
                </div>
                <div>
                  <strong>
                    {money(a.currentHighestBid || a.startingPrice)}
                  </strong>
                  <small>{a.bidCount} lượt giá</small>
                  <button
                    className="text-btn danger"
                    onClick={() => action(a.id, "cancel")}
                  >
                    Hủy phiên
                  </button>
                </div>
              </article>
            ))
          ) : (
            <Empty title="Chưa tạo phiên nào" />
          )}
        </section>
        <section>
          <h2>Lượt giá của tôi</h2>
          {bids.length ? (
            bids.map((b) => (
              <article className="panel-card bid-mini" key={b.id}>
                <Gavel />
                <div>
                  <Badge tone={b.isWinning ? "green" : "neutral"}>
                    {b.status}
                  </Badge>
                  <h3>{money(b.amount)}</h3>
                  <small>{date(b.placedAt)}</small>
                </div>
                {b.isWinning && (
                  <button
                    className="btn small"
                    onClick={() => action(b.auctionId, "pay")}
                  >
                    Thanh toán
                  </button>
                )}
              </article>
            ))
          ) : (
            <Empty title="Chưa tham gia đấu giá" />
          )}
        </section>
      </div>
      {show && (
        <Modal title="Tạo phiên đấu giá" onClose={() => setShow(false)}>
          <form className="form-grid modal-form" onSubmit={create}>
            <Field label="Room ID">
              <input
                required
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              />
            </Field>
            <Field label="Nhận phòng">
              <input
                type="date"
                required
                value={form.checkInDate}
                onChange={(e) =>
                  setForm({ ...form, checkInDate: e.target.value })
                }
              />
            </Field>
            <Field label="Trả phòng">
              <input
                type="date"
                required
                value={form.checkOutDate}
                onChange={(e) =>
                  setForm({ ...form, checkOutDate: e.target.value })
                }
              />
            </Field>
            <Field label="Giá khởi điểm">
              <input
                type="number"
                required
                value={form.startingPrice}
                onChange={(e) =>
                  setForm({ ...form, startingPrice: e.target.value })
                }
              />
            </Field>
            <Field label="Kiểu bước giá">
              <select
                value={form.minBidIncrementType}
                onChange={(e) =>
                  setForm({ ...form, minBidIncrementType: e.target.value })
                }
              >
                <option>FixedAmount</option>
                <option>Percentage</option>
              </select>
            </Field>
            <Field label="Giá trị bước">
              <input
                type="number"
                required
                value={form.minBidIncrementValue}
                onChange={(e) =>
                  setForm({ ...form, minBidIncrementValue: e.target.value })
                }
              />
            </Field>
            <Field label="Thời lượng">
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              >
                <option>OneHour</option>
                <option>ThreeHours</option>
                <option>SixHours</option>
                <option>TwelveHours</option>
                <option>TwentyFourHours</option>
              </select>
            </Field>
            <button className="btn">Bắt đầu</button>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AdminPanel() {
  const [kyc, setKyc] = useState<KycSubmission[]>([]);
  const [rooms, setRooms] = useState<
    Array<{ id: string; hostId: string; submittedAt: string; room: Room }>
  >([]);
  const [reviewId, setReviewId] = useState("");
  const load = () =>
    Promise.all([roomlyApi.kyc.pending(), roomlyApi.rooms.pending()])
      .then(([k, r]) => {
        setKyc(k);
        setRooms(r);
      })
      .catch(fail);
  useEffect(() => {
    void load();
  }, []);
  const reviewKyc = async (id: string, approved: boolean) => {
    const reason = approved ? undefined : prompt("Lý do từ chối?") || undefined;
    if (!approved && !reason) return;
    try {
      await roomlyApi.kyc.review(id, approved, reason);
      toast.success("Đã xử lý KYC");
      load();
    } catch (e) {
      fail(e);
    }
  };
  const reviewRoom = async (id: string, approved: boolean) => {
    const reason = approved ? undefined : prompt("Lý do từ chối phòng?");
    if (!approved && !reason) return;
    try {
      if (approved) await roomlyApi.rooms.approve(id);
      else await roomlyApi.rooms.reject(id, reason!);
      toast.success("Đã kiểm duyệt phòng");
      load();
    } catch (e) {
      fail(e);
    }
  };
  const remove = async () => {
    if (!reviewId) return;
    try {
      await roomlyApi.reviews.remove(reviewId);
      toast.success("Đã gỡ đánh giá");
      setReviewId("");
    } catch (e) {
      fail(e);
    }
  };
  return (
    <>
      {heading(
        "Trung tâm kiểm duyệt",
        "Xử lý KYC, listing phòng và nội dung cộng đồng.",
      )}
      <div className="admin-stats">
        <article>
          <ShieldCheck />
          <span>
            <strong>{kyc.length}</strong>KYC đang chờ
          </span>
        </article>
        <article>
          <CalendarDays />
          <span>
            <strong>{rooms.length}</strong>Phòng đang chờ
          </span>
        </article>
      </div>
      <div className="split-panels">
        <section>
          <h2>Hồ sơ KYC</h2>
          {kyc.length ? (
            kyc.map((k) => (
              <article className="panel-card moderation-row" key={k.id}>
                <div>
                  <Badge tone="orange">Chờ duyệt</Badge>
                  <h3>Hồ sơ #{k.id.slice(0, 8)}</h3>
                  <p>{date(k.submittedAt)}</p>
                </div>
                <div>
                  <button
                    className="btn small"
                    onClick={() => reviewKyc(k.id, true)}
                  >
                    Duyệt
                  </button>
                  <button
                    className="outline-btn"
                    onClick={() => reviewKyc(k.id, false)}
                  >
                    Từ chối
                  </button>
                </div>
              </article>
            ))
          ) : (
            <Empty title="Đã xử lý hết KYC" />
          )}
        </section>
        <section>
          <h2>Listing phòng</h2>
          {rooms.length ? (
            rooms.map((r) => (
              <article className="panel-card moderation-row" key={r.id}>
                <div>
                  <Badge tone="orange">Chờ duyệt</Badge>
                  <h3>{r.room?.title || `Phòng #${r.id.slice(0, 8)}`}</h3>
                  <p>{date(r.submittedAt)}</p>
                </div>
                <div>
                  <button
                    className="btn small"
                    onClick={() => reviewRoom(r.id, true)}
                  >
                    Duyệt
                  </button>
                  <button
                    className="outline-btn"
                    onClick={() => reviewRoom(r.id, false)}
                  >
                    Từ chối
                  </button>
                </div>
              </article>
            ))
          ) : (
            <Empty title="Đã xử lý hết phòng" />
          )}
        </section>
      </div>
      <section className="panel-card review-moderation">
        <h2>Gỡ đánh giá vi phạm</h2>
        <div>
          <input
            value={reviewId}
            onChange={(e) => setReviewId(e.target.value)}
            placeholder="Review ID"
          />
          <button className="outline-btn danger" onClick={remove}>
            Gỡ đánh giá
          </button>
        </div>
      </section>
    </>
  );
}
