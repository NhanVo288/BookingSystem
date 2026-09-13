export type Paged<T> = {
  items: T[];
  currentPage?: number;
  page?: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
};
export type Profile = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
  bio?: string;
  emailVerified: boolean;
  kycStatus: number | string;
  kycAttemptCount: number;
  role: number | string;
  adminRole: number | string;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
};
export type RoomPhoto = {
  id: string;
  url: string;
  description?: string;
  displayOrder: number;
};
export type Room = {
  id: string;
  hostId?: string;
  title: string;
  description: string;
  roomType: string | number;
  address: string;
  city: string;
  pricePerNight: number;
  maxGuests: number;
  bookingMode: string | number;
  freeCancellation: boolean;
  status: string | number;
  averageRating?: number;
  photos: RoomPhoto[];
  amenities: string[];
};
export type RoomSummary = Pick<
  Room,
  | "id"
  | "title"
  | "city"
  | "pricePerNight"
  | "averageRating"
  | "freeCancellation"
> & { thumbnailUrl?: string };
export type Booking = {
  bookingId: string;
  guestId: string;
  room: Room;
  checkInDate: string;
  checkOutDate: string;
  createdDate: string;
  totalPrice: number;
  status: string | number;
  paymentMethod: string | number;
  paymentStatus: string | number;
  cancelledAt?: string;
};
export type HostBooking = {
  bookingId: string;
  roomId: string;
  guestId: string;
  checkInDate: string;
  checkOutDate: string;
  createdDate: string;
  totalPrice: number;
  paymentMethod: string | number;
  paymentStatus: string | number;
};
export type Auction = {
  id: string;
  roomId?: string;
  roomTitle: string;
  hostId?: string;
  checkInDate: string;
  checkOutDate: string;
  startingPrice?: number;
  currentHighestBid?: number;
  insuranceDepositAmount: number;
  startTime?: string;
  endTime: string;
  bidCount: number;
  minNextBid?: number;
  status: string;
  createdAt?: string;
};
export type Bid = {
  id: string;
  auctionId: string;
  amount: number;
  isWinning: boolean;
  status: string;
  insuranceLocked: boolean;
  placedAt: string;
};
export type Wallet = {
  id: string;
  balance: number;
  insuranceHeldBalance: number;
};
export type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
};
export type Review = {
  id: string;
  reviewType: string;
  reviewerName: string;
  rating: number;
  created: string;
  comment?: string;
  status: string;
};
export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string | number;
  category: string | number;
  channel: string | number;
  status: string | number;
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
};
export type KycSubmission = {
  id: string;
  status: string | number;
  submittedAt: string;
  userId?: string;
  userName?: string;
  documentType?: string | number;
  frontImageUrl?: string;
  backImageUrl?: string;
  selfieUrl?: string;
};

export const roleName = (role: Profile["role"]) =>
  typeof role === "string"
    ? role
    : (["None", "Guest", "Host", "Both"][role] ?? "Guest");
export const adminRoleName = (role: Profile["adminRole"]) =>
  typeof role === "string"
    ? role
    : (["None", "Super Admin", "Kiểm duyệt viên", "Hỗ trợ", "Kiểm toán viên"][
        role
      ] ?? "Quản trị viên");
export const hasAdminAccess = (role: Profile["adminRole"]) =>
  typeof role === "number"
    ? role > 0
    : !["", "0", "none"].includes(role.trim().toLowerCase());
export const statusName = (value: string | number) =>
  typeof value === "string" ? value : String(value);
export const bookingStatusName = (value: string | number) =>
  typeof value === "string"
    ? value
    : ([
        "Không xác định",
        "Chờ thanh toán",
        "Chờ chủ nhà duyệt",
        "Đã xác nhận",
        "Đã hủy",
        "Chủ nhà từ chối",
        "Đã thay thế",
        "Hoàn tất",
        "Hết hạn",
      ][value] ?? String(value));
export const paymentStatusName = (value: string | number) =>
  typeof value === "string"
    ? value
    : ([
        "Chưa xác định",
        "Đang chờ",
        "Đã thanh toán",
        "Đã hoàn tiền",
        "Hoàn một phần",
        "Thất bại",
      ][value] ?? String(value));
export const kycStatusName = (value: string | number) =>
  typeof value === "string"
    ? value
    : (["Chưa gửi", "Đang chờ duyệt", "Đã xác minh", "Bị từ chối"][value] ??
      String(value));
export const money = (value = 0) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
export const date = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";
