import {
  ArrowLeft,
  CalendarDays,
  Check,
  Heart,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Empty, Loading } from "../components/UI";
import { roomlyApi } from "../lib/roomlyApi";
import { useAuth } from "../lib/auth";
import type { Paged, Review, Room } from "../types";
import { date, money } from "../types";

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [booking, setBooking] = useState({ startDate: "", endDate: "" });
  useEffect(() => {
    if (!id) return;
    Promise.all([roomlyApi.rooms.get(id), roomlyApi.reviews.room(id)])
      .then(([r, v]) => {
        setRoom(r);
        setReviews(Array.isArray(v) ? v : v.items || []);
      })
      .catch((e) => toast.error(e.message));
  }, [id]);
  const nights = useMemo(
    () =>
      booking.startDate && booking.endDate
        ? Math.max(
            0,
            Math.ceil(
              (+new Date(booking.endDate) - +new Date(booking.startDate)) /
                86400000,
            ),
          )
        : 0,
    [booking],
  );
  const book = async () => {
    if (!user) return navigate("/auth");
    if (!id || !booking.startDate || !booking.endDate)
      return toast.error("Hãy chọn ngày nhận và trả phòng");
    setBusy(true);
    try {
      const result = await roomlyApi.bookings.create(
        id,
        new Date(booking.startDate).toISOString(),
        new Date(booking.endDate).toISOString(),
      );
      toast.success("Yêu cầu đặt phòng đã được tạo");
      navigate(`/dashboard/bookings?booking=${result.bookingId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể đặt phòng");
    } finally {
      setBusy(false);
    }
  };
  if (!room) return <Loading />;
  const photos = room.photos || [];
  return (
    <div className="detail-page section">
      <Link className="back" to="/">
        <ArrowLeft /> Quay lại khám phá
      </Link>
      <div className="detail-title">
        <div>
          <span className="eyebrow">{room.roomType}</span>
          <h1>{room.title}</h1>
          <p>
            <MapPin /> {room.address}, {room.city} · <Star />{" "}
            {room.averageRating?.toFixed(1) || "Chưa có đánh giá"}
          </p>
        </div>
        <div>
          <button className="outline-btn">
            <Share2 /> Chia sẻ
          </button>
          <button className="outline-btn">
            <Heart /> Lưu
          </button>
        </div>
      </div>
      <div className={`photo-gallery count-${Math.min(photos.length, 5)}`}>
        {photos.length ? (
          photos
            .slice(0, 5)
            .map((p, i) => (
              <img
                key={p.id || i}
                src={p.url}
                alt={p.description || room.title}
              />
            ))
        ) : (
          <>
            <div />
            <div />
            <div />
          </>
        )}
      </div>
      <div className="detail-columns">
        <article className="room-body">
          <div className="host-line">
            <div>
              <h2>Không gian dành cho tối đa {room.maxGuests} khách</h2>
              <p>Được chăm chút bởi một chủ nhà Roomly</p>
            </div>
            <span className="avatar">R</span>
          </div>
          <hr />
          <p className="description">{room.description}</p>
          <div className="room-highlights">
            <div>
              <ShieldCheck />
              <span>
                <strong>Đặt phòng an tâm</strong>
                <small>
                  {room.freeCancellation
                    ? "Được hủy miễn phí theo chính sách"
                    : "Áp dụng chính sách của chỗ nghỉ"}
                </small>
              </span>
            </div>
            <div>
              <CalendarDays />
              <span>
                <strong>Giờ giấc linh hoạt</strong>
                <small>Trao đổi trực tiếp sau khi xác nhận</small>
              </span>
            </div>
          </div>
          <hr />
          <h2>Tiện nghi tại đây</h2>
          <div className="amenities">
            {room.amenities?.length ? (
              room.amenities.map((a) => (
                <span key={a}>
                  <Check />
                  {a}
                </span>
              ))
            ) : (
              <p>Chủ nhà chưa cập nhật tiện nghi.</p>
            )}
          </div>
          <hr />
          <div className="review-head">
            <h2>Đánh giá từ khách</h2>
            <span>
              <Star /> {room.averageRating?.toFixed(1) || "Mới"} ·{" "}
              {reviews.length} đánh giá
            </span>
          </div>
          {reviews.length ? (
            <div className="reviews">
              {reviews.map((r) => (
                <article key={r.id}>
                  <div className="avatar">{r.reviewerName?.[0]}</div>
                  <div>
                    <strong>{r.reviewerName}</strong>
                    <small>{date(r.created)}</small>
                    <span>
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                    <p>{r.comment}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty title="Hãy là người đầu tiên đánh giá" />
          )}
        </article>
        <aside className="booking-card">
          <div className="price">
            <strong>{money(room.pricePerNight)}</strong>
            <span>/ đêm</span>
          </div>
          <div className="date-pair">
            <label>
              NHẬN PHÒNG
              <input
                type="date"
                min={today}
                value={booking.startDate}
                onChange={(e) =>
                  setBooking({ ...booking, startDate: e.target.value })
                }
              />
            </label>
            <label>
              TRẢ PHÒNG
              <input
                type="date"
                min={booking.startDate || today}
                value={booking.endDate}
                onChange={(e) =>
                  setBooking({ ...booking, endDate: e.target.value })
                }
              />
            </label>
          </div>
          <label className="guests">
            KHÁCH{" "}
            <span>
              <Users /> {room.maxGuests} khách tối đa
            </span>
          </label>
          <button className="btn full" onClick={book} disabled={busy}>
            {busy
              ? "Đang giữ chỗ…"
              : room.bookingMode === "RequestAndApprove"
                ? "Gửi yêu cầu"
                : "Đặt ngay"}
          </button>
          <small className="center">Bạn chưa bị trừ tiền ở bước này</small>
          {nights > 0 && (
            <div className="receipt">
              <span>
                {money(room.pricePerNight)} × {nights} đêm{" "}
                <b>{money(room.pricePerNight * nights)}</b>
              </span>
              <span>
                Phí dịch vụ <b>Đã gồm</b>
              </span>
              <hr />
              <strong>
                Tổng <b>{money(room.pricePerNight * nights)}</b>
              </strong>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
