import { ArrowRight, Clock3, Gavel, ShieldCheck, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Empty, Loading, Modal } from "../components/UI";
import { roomlyApi } from "../lib/roomlyApi";
import { useAuth } from "../lib/auth";
import type { Auction } from "../types";
import { date, money } from "../types";

export default function Auctions() {
  const { user } = useAuth();
  const [items, setItems] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Auction>();
  const [amount, setAmount] = useState("");
  const load = () =>
    roomlyApi.auctions
      .active()
      .then((x) => setItems(Array.isArray(x) ? x : x.items || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);
  const bid = async () => {
    if (!user) return toast.error("Đăng nhập để tham gia đấu giá");
    if (!selected) return;
    try {
      await roomlyApi.auctions.bid(selected.id, Number(amount));
      toast.success("Giá của bạn đã được ghi nhận");
      setSelected(undefined);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể đặt giá");
    }
  };
  return (
    <div className="auction-page">
      <section className="auction-hero">
        <div>
          <span className="kicker">ROOMLY AUCTIONS</span>
          <h1>
            Một mức giá.
            <br />
            <em>Một kỳ nghỉ.</em>
          </h1>
          <p>
            Đặt giá cho những căn phòng đặc biệt và để khoảnh khắc quyết định
            hành trình tiếp theo.
          </p>
        </div>
        <div className="auction-orbit">
          <span>ROOMLY · BID · STAY</span>
          <Gavel />
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">ĐANG DIỄN RA</span>
            <h2>Phiên đấu giá hôm nay</h2>
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : items.length ? (
          <div className="auction-grid">
            {items.map((a) => (
              <article className="auction-card" key={a.id}>
                <div className="auction-cover">
                  <span>
                    <Clock3 /> Kết thúc {date(a.endTime)}
                  </span>
                  <div className="auction-number">
                    {a.bidCount}
                    <small> lượt giá</small>
                  </div>
                </div>
                <div className="auction-info">
                  <small>
                    {date(a.checkInDate)} — {date(a.checkOutDate)}
                  </small>
                  <h3>{a.roomTitle}</h3>
                  <div>
                    <span>
                      Giá hiện tại<strong>{money(a.currentHighestBid)}</strong>
                    </span>
                    <span>
                      Giá tiếp theo<strong>{money(a.minNextBid)}</strong>
                    </span>
                  </div>
                  <button
                    className="btn full"
                    onClick={() => {
                      setSelected(a);
                      setAmount(String(a.minNextBid || 0));
                    }}
                  >
                    Đặt giá <ArrowRight />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Hiện chưa có phiên đấu giá"
            text="Quay lại sau để khám phá những chỗ nghỉ mới."
          />
        )}
      </section>
      <section className="auction-how">
        <div>
          <Trophy />
          <span>
            <h3>Giá cao nhất thắng</h3>
            <p>Theo dõi trực tiếp và nâng giá bất cứ lúc nào.</p>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <h3>Khoản giữ an toàn</h3>
            <p>Tiền bảo chứng được hoàn khi bạn không thắng.</p>
          </span>
        </div>
        <div>
          <Clock3 />
          <span>
            <h3>Thanh toán đúng hạn</h3>
            <p>Hoàn tất thanh toán ngay khi chiến thắng.</p>
          </span>
        </div>
      </section>
      {selected && (
        <Modal title="Đặt giá của bạn" onClose={() => setSelected(undefined)}>
          <div className="modal-form">
            <p>
              Giá tối thiểu: <b>{money(selected.minNextBid)}</b>
            </p>
            <label>
              Số tiền
              <input
                type="number"
                min={selected.minNextBid}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <p className="note">
              <ShieldCheck /> Tiền bảo chứng{" "}
              {money(selected.insuranceDepositAmount)} sẽ được giữ trong ví.
            </p>
            <button className="btn full" onClick={bid}>
              Xác nhận đặt giá
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
