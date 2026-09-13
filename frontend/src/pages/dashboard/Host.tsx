import {
  CalendarDays,
  Check,
  ImagePlus,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge, Empty, Field, Loading, Modal } from "../../components/UI";
import { useAuth } from "../../lib/auth";
import { roomlyApi, type CreateRoomRequest } from "../../lib/roomlyApi";
import type { Booking, HostBooking, Room, RoomSummary } from "../../types";
import { date, money } from "../../types";
import { fail, heading, statusTone } from "./shared";

type RoomForm = Omit<
  CreateRoomRequest,
  "pricePerNight" | "maxGuests" | "roomType" | "amenityIds"
> & {
  pricePerNight: string;
  maxGuests: string;
  roomType: string;
  amenityIds: string;
};
const emptyRoom: RoomForm = {
  title: "",
  description: "",
  roomType: "0",
  addressLine: {
    street: "",
    city: "",
    state: "",
    country: "Việt Nam",
    zipCode: "",
    houseNumber: "",
    roomNumber: "",
  },
  pricePerNight: "",
  maxGuests: "2",
  checkInTime: "14:00:00",
  checkOutTime: "15:00:00",
  freeCancellation: true,
  amenityIds: "",
};

export function HostPanel() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [requests, setRequests] = useState<HostBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"create" | "manage" | "calendar">();
  const [selected, setSelected] = useState<Room>();
  const [form, setForm] = useState<RoomForm>(emptyRoom);
  const [photo, setPhoto] = useState({ url: "", description: "" });
  const [range, setRange] = useState({ from: "", to: "" });
  const [calendar, setCalendar] = useState<Booking[]>([]);
  const load = () =>
    Promise.all([
      roomlyApi.rooms.search({ hostId: user?.id, page: 1, pageSize: 100 }),
      roomlyApi.bookings.hostRequests(),
    ])
      .then(([r, b]) => {
        setRooms(Array.isArray(r) ? r : r.items || []);
        setRequests(b);
      })
      .catch(fail)
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, [user?.id]);
  const payload = (): CreateRoomRequest => ({
    ...form,
    roomType: Number(form.roomType),
    pricePerNight: Number(form.pricePerNight),
    maxGuests: Number(form.maxGuests),
    amenityIds: form.amenityIds
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  });
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomlyApi.rooms.create(payload());
      toast.success("Đã tạo phòng nháp");
      setDialog(undefined);
      setForm(emptyRoom);
      load();
    } catch (e) {
      fail(e);
    }
  };
  const openManage = async (id: string) => {
    try {
      const room = await roomlyApi.rooms.get(id);
      setSelected(room);
      setDialog("manage");
    } catch (e) {
      fail(e);
    }
  };
  const action = async (
    kind: "submit" | "activate" | "deactivate" | "delete",
  ) => {
    if (!selected) return;
    try {
      if (kind === "delete") {
        if (!confirm("Xóa phòng này?")) return;
        await roomlyApi.rooms.remove(selected.id);
      } else await roomlyApi.rooms[kind](selected.id);
      toast.success("Đã cập nhật phòng");
      setDialog(undefined);
      load();
    } catch (e) {
      fail(e);
    }
  };
  const addPhoto = async () => {
    if (!selected || !photo.url) return;
    try {
      await roomlyApi.rooms.addPhoto(selected.id, photo.url, photo.description);
      setSelected(await roomlyApi.rooms.get(selected.id));
      setPhoto({ url: "", description: "" });
      toast.success("Đã thêm ảnh");
    } catch (e) {
      fail(e);
    }
  };
  const removePhoto = async (id: string) => {
    if (!selected) return;
    try {
      await roomlyApi.rooms.removePhoto(selected.id, id);
      setSelected(await roomlyApi.rooms.get(selected.id));
    } catch (e) {
      fail(e);
    }
  };
  const block = async (unblock = false) => {
    if (!selected || !range.from || !range.to)
      return toast.error("Chọn đủ khoảng ngày");
    try {
      if (unblock)
        await roomlyApi.rooms.unblock(selected.id, range.from, range.to);
      else await roomlyApi.rooms.block(selected.id, range.from, range.to);
      toast.success(unblock ? "Đã mở lại ngày" : "Đã chặn ngày");
    } catch (e) {
      fail(e);
    }
  };
  const showCalendar = async (id: string) => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
    try {
      setSelected(await roomlyApi.rooms.get(id));
      setCalendar(await roomlyApi.bookings.calendar(id, from, to));
      setDialog("calendar");
    } catch (e) {
      fail(e);
    }
  };
  const decide = async (id: string, approve: boolean) => {
    try {
      if (approve) await roomlyApi.bookings.approve(id);
      else await roomlyApi.bookings.reject(id);
      toast.success(approve ? "Đã duyệt đặt phòng" : "Đã từ chối");
      load();
    } catch (e) {
      fail(e);
    }
  };
  return (
    <>
      {heading(
        "Quản lý phòng",
        "Tạo listing, hình ảnh, lịch trống và xử lý yêu cầu đặt chỗ.",
      )}
      <div className="toolbar">
        <button className="btn" onClick={() => setDialog("create")}>
          <Plus /> Thêm phòng
        </button>
      </div>
      {loading ? (
        <Loading />
      ) : rooms.length ? (
        <div className="room-grid host-room-grid">
          {rooms.map((room) => (
            <article className="panel-card host-room" key={room.id}>
              {room.thumbnailUrl ? (
                <img src={room.thumbnailUrl} alt="" />
              ) : (
                <div className="booking-thumb" />
              )}
              <Badge tone="neutral">Listing</Badge>
              <h3>{room.title}</h3>
              <p>
                {room.city} · {money(room.pricePerNight)}/đêm
              </p>
              <div>
                <button
                  className="outline-btn"
                  onClick={() => openManage(room.id)}
                >
                  <Pencil /> Quản lý
                </button>
                <button
                  className="text-btn"
                  onClick={() => showCalendar(room.id)}
                >
                  <CalendarDays /> Lịch
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Chưa có phòng nào" />
      )}
      <div className="card-head">
        <h2>Yêu cầu đang chờ</h2>
        <Badge tone="orange">{requests.length}</Badge>
      </div>
      {requests.length ? (
        <div className="booking-list">
          {requests.map((r) => (
            <article className="panel-card request-row" key={r.bookingId}>
              <div>
                <h3>Khách #{r.guestId.slice(0, 8)}</h3>
                <p>
                  {date(r.checkInDate)} — {date(r.checkOutDate)}
                </p>
                <strong>{money(r.totalPrice)}</strong>
              </div>
              <div>
                <button
                  className="btn small"
                  onClick={() => decide(r.bookingId, true)}
                >
                  <Check /> Duyệt
                </button>
                <button
                  className="outline-btn"
                  onClick={() => decide(r.bookingId, false)}
                >
                  <X /> Từ chối
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Không có yêu cầu đang chờ" />
      )}
      {dialog === "create" && (
        <Modal title="Đăng phòng mới" onClose={() => setDialog(undefined)}>
          <CreateForm form={form} setForm={setForm} submit={create} />
        </Modal>
      )}
      {dialog === "manage" && selected && (
        <Modal title={selected.title} onClose={() => setDialog(undefined)}>
          <div className="manage-room">
            <div className="room-state">
              <Badge tone={statusTone(selected.status)}>
                {String(selected.status)}
              </Badge>
              <button className="text-btn" onClick={() => action("submit")}>
                Gửi kiểm duyệt
              </button>
              <button className="text-btn" onClick={() => action("activate")}>
                <Power /> Kích hoạt
              </button>
              <button className="text-btn" onClick={() => action("deactivate")}>
                Tạm ẩn
              </button>
              <button
                className="text-btn danger"
                onClick={() => action("delete")}
              >
                <Trash2 /> Xóa
              </button>
            </div>
            <h3>Hình ảnh</h3>
            <div className="photo-admin">
              {selected.photos?.map((p) => (
                <div key={p.id}>
                  <img src={p.url} alt="" />
                  <button onClick={() => removePhoto(p.id)}>
                    <X />
                  </button>
                </div>
              ))}
            </div>
            <div className="inline-form">
              <input
                placeholder="URL ảnh"
                value={photo.url}
                onChange={(e) => setPhoto({ ...photo, url: e.target.value })}
              />
              <input
                placeholder="Mô tả"
                value={photo.description}
                onChange={(e) =>
                  setPhoto({ ...photo, description: e.target.value })
                }
              />
              <button className="btn small" onClick={addPhoto}>
                <ImagePlus /> Thêm
              </button>
            </div>
            <h3>Chặn/mở ngày</h3>
            <div className="date-block">
              <input
                type="date"
                value={range.from}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
              />
              <input
                type="date"
                value={range.to}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
              />
              <button className="outline-btn" onClick={() => block()}>
                Chặn
              </button>
              <button className="text-btn" onClick={() => block(true)}>
                Mở lại
              </button>
            </div>
          </div>
        </Modal>
      )}
      {dialog === "calendar" && (
        <Modal
          title={`Lịch ${selected?.title}`}
          onClose={() => setDialog(undefined)}
        >
          {calendar.length ? (
            <div className="booking-list">
              {calendar.map((b) => (
                <div className="panel-card" key={b.bookingId}>
                  <Badge tone={statusTone(b.status)}>{String(b.status)}</Badge>
                  <p>
                    {date(b.checkInDate)} — {date(b.checkOutDate)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Lịch đang trống" />
          )}
        </Modal>
      )}
    </>
  );
}

function CreateForm({
  form,
  setForm,
  submit,
}: {
  form: RoomForm;
  setForm: (value: RoomForm) => void;
  submit: (e: React.FormEvent) => void;
}) {
  const set = (key: keyof RoomForm, value: string | boolean) =>
    setForm({ ...form, [key]: value });
  const address = (
    key: keyof CreateRoomRequest["addressLine"],
    value: string,
  ) => setForm({ ...form, addressLine: { ...form.addressLine, [key]: value } });
  return (
    <form className="form-grid room-form" onSubmit={submit}>
      <Field label="Tên phòng">
        <input
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </Field>
      <Field label="Loại phòng">
        <select
          value={form.roomType}
          onChange={(e) => set("roomType", e.target.value)}
        >
          <option value="0">Phòng riêng</option>
          <option value="1">Phòng chung</option>
          <option value="2">Căn hộ nguyên căn</option>
          <option value="3">Nhà nguyên căn</option>
        </select>
      </Field>
      <Field label="Mô tả">
        <textarea
          required
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <Field label="Số nhà">
        <input
          required
          value={form.addressLine.houseNumber}
          onChange={(e) => address("houseNumber", e.target.value)}
        />
      </Field>
      <Field label="Tên đường">
        <input
          required
          value={form.addressLine.street}
          onChange={(e) => address("street", e.target.value)}
        />
      </Field>
      <Field label="Số phòng">
        <input
          required
          value={form.addressLine.roomNumber}
          onChange={(e) => address("roomNumber", e.target.value)}
        />
      </Field>
      <Field label="Tỉnh/Thành phố">
        <input
          required
          value={form.addressLine.city}
          onChange={(e) => address("city", e.target.value)}
        />
      </Field>
      <Field label="Bang/Tỉnh">
        <input
          required
          value={form.addressLine.state}
          onChange={(e) => address("state", e.target.value)}
        />
      </Field>
      <Field label="Mã bưu chính">
        <input
          required
          value={form.addressLine.zipCode}
          onChange={(e) => address("zipCode", e.target.value)}
        />
      </Field>
      <Field label="Quốc gia">
        <input
          required
          value={form.addressLine.country}
          onChange={(e) => address("country", e.target.value)}
        />
      </Field>
      <Field label="Giá mỗi đêm">
        <input
          type="number"
          required
          min="1"
          value={form.pricePerNight}
          onChange={(e) => set("pricePerNight", e.target.value)}
        />
      </Field>
      <Field label="Số khách tối đa">
        <input
          type="number"
          min="1"
          required
          value={form.maxGuests}
          onChange={(e) => set("maxGuests", e.target.value)}
        />
      </Field>
      <Field label="Giờ nhận phòng">
        <input
          type="time"
          step="1"
          required
          value={form.checkInTime}
          onChange={(e) => set("checkInTime", e.target.value)}
        />
      </Field>
      <Field label="Giờ trả phòng">
        <input
          type="time"
          step="1"
          required
          value={form.checkOutTime}
          onChange={(e) => set("checkOutTime", e.target.value)}
        />
      </Field>
      <Field label="Amenity UUID (phân cách dấu phẩy)">
        <input
          required
          value={form.amenityIds}
          onChange={(e) => set("amenityIds", e.target.value)}
        />
      </Field>
      <label className="check-row">
        <input
          type="checkbox"
          checked={form.freeCancellation}
          onChange={(e) => set("freeCancellation", e.target.checked)}
        />{" "}
        Hủy miễn phí
      </label>
      <button className="btn">Tạo phòng nháp</button>
    </form>
  );
}
