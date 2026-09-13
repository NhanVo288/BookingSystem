import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { roomlyApi } from "../lib/roomlyApi";
import type { Paged, RoomSummary } from "../types";
import { Empty, Loading, RoomCard } from "../components/UI";

export default function Home() {
  const [params] = useSearchParams();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchQuery: params.get("q") || "",
    checkIn: "",
    checkOut: "",
    guests: "2",
  });
  const load = async (extra = filters) => {
    setLoading(true);
    try {
      const data = await roomlyApi.rooms.search({
        searchQuery: extra.searchQuery || null,
        checkIn: extra.checkIn ? new Date(extra.checkIn).toISOString() : null,
        checkOut: extra.checkOut
          ? new Date(extra.checkOut).toISOString()
          : null,
        page: 1,
        pageSize: 12,
      });
      setRooms(Array.isArray(data) ? data : data.items || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load({ ...filters, searchQuery: params.get("q") || "" });
  }, [params.get("q")]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };
  return (
    <>
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-copy">
          <span className="kicker">
            <Sparkles size={14} /> Kỳ nghỉ bắt đầu từ cảm giác
          </span>
          <h1>
            Ở đâu cũng
            <br />
            thấy <em>thân quen.</em>
          </h1>
          <p>
            Những căn phòng có gu, những chủ nhà có tâm, và trải nghiệm được
            thiết kế để bạn thực sự thuộc về.
          </p>
        </div>
        <form className="search-panel" onSubmit={submit}>
          <label>
            <MapPin />
            <span>
              <small>Địa điểm</small>
              <input
                value={filters.searchQuery}
                onChange={(e) =>
                  setFilters({ ...filters, searchQuery: e.target.value })
                }
                placeholder="Thành phố bạn yêu"
              />
            </span>
          </label>
          <label>
            <CalendarDays />
            <span>
              <small>Nhận phòng</small>
              <input
                type="date"
                value={filters.checkIn}
                onChange={(e) =>
                  setFilters({ ...filters, checkIn: e.target.value })
                }
              />
            </span>
          </label>
          <label>
            <CalendarDays />
            <span>
              <small>Trả phòng</small>
              <input
                type="date"
                value={filters.checkOut}
                onChange={(e) =>
                  setFilters({ ...filters, checkOut: e.target.value })
                }
              />
            </span>
          </label>
          <label>
            <Users />
            <span>
              <small>Khách</small>
              <select
                value={filters.guests}
                onChange={(e) =>
                  setFilters({ ...filters, guests: e.target.value })
                }
              >
                {[1, 2, 3, 4, 5, 6].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </span>
          </label>
          <button aria-label="Tìm kiếm">
            <Search />
          </button>
        </form>
        <div className="hero-art">
          <div className="arch arch-one" />
          <div className="arch arch-two" />
          <div className="sun" />
          <div className="plant">⌇</div>
        </div>
      </section>
      <section className="section rooms-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Chọn lọc cho bạn</span>
            <h2>Chốn nghỉ được yêu thích</h2>
          </div>
          <button className="text-btn" onClick={() => load()}>
            Xem tất cả <ArrowRight />
          </button>
        </div>
        {loading ? (
          <Loading />
        ) : rooms.length ? (
          <div className="room-grid">
            {rooms.map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        ) : (
          <Empty
            title="Chưa tìm thấy căn phòng phù hợp"
            text="Thử một địa điểm hoặc ngày khác nhé."
          />
        )}
      </section>
      <section className="manifesto">
        <div>
          <span className="eyebrow">Vì sao là Roomly?</span>
          <h2>
            Không chỉ là nơi ngủ.
            <br />
            Là nơi để sống.
          </h2>
        </div>
        <div className="benefits">
          <article>
            <span>01</span>
            <ShieldCheck />
            <h3>An tâm từng bước</h3>
            <p>KYC, thanh toán bảo mật và chính sách rõ ràng.</p>
          </article>
          <article>
            <span>02</span>
            <Sparkles />
            <h3>Có gu riêng</h3>
            <p>Mỗi không gian được kiểm duyệt trước khi đón khách.</p>
          </article>
          <article>
            <span>03</span>
            <Users />
            <h3>Kết nối thật</h3>
            <p>Đánh giá hai chiều xây dựng cộng đồng đáng tin cậy.</p>
          </article>
        </div>
      </section>
      <section className="auction-callout">
        <div>
          <span>TRẢI NGHIỆM MỚI</span>
          <h2>
            Đấu giá kỳ nghỉ
            <br />
            theo cách của bạn.
          </h2>
          <p>
            Chọn mức giá, giữ chỗ bằng ví Roomly và chờ khoảnh khắc chiến thắng.
          </p>
          <Link className="btn light-btn" to="/auctions">
            Khám phá phiên đấu giá <ArrowRight />
          </Link>
        </div>
        <div className="auction-number">
          24<small>h</small>
        </div>
      </section>
    </>
  );
}
