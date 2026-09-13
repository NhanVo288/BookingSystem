import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Field } from "../components/UI";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

type Mode = "login" | "register" | "verify" | "forgot" | "reset" | "unlock";
export default function Auth() {
  const { user, login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    email: "",
    password: "",
    name: "",
    role: "1",
    otp: "",
  });
  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else if (mode === "register") {
        await api("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            name: form.name,
            role: Number(form.role),
          }),
        });
        toast.success("Đăng ký thành công. Kiểm tra email để lấy OTP.");
        setMode("verify");
      } else if (mode === "verify") {
        await api("/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, otp: form.otp }),
        });
        toast.success("Email đã được xác minh");
        setMode("login");
      } else if (mode === "forgot") {
        await api("/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });
        toast.success("OTP đã được gửi");
        setMode("reset");
      } else if (mode === "reset") {
        await api("/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            otpCode: form.otp,
            password: form.password,
          }),
        });
        toast.success("Đã đổi mật khẩu");
        setMode("login");
      } else {
        await api("/auth/unlock-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, otpCode: form.otp }),
        });
        toast.success("Tài khoản đã mở khóa");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };
  const title = {
    login: "Chào bạn trở lại.",
    register: "Tạo một tài khoản.",
    verify: "Xác minh email.",
    forgot: "Tìm lại mật khẩu.",
    reset: "Đặt mật khẩu mới.",
    unlock: "Mở khóa tài khoản.",
  }[mode];
  return (
    <main className="auth-page">
      <section className="auth-art">
        <Link className="brand light" to="/">
          roomly<i>.</i>
        </Link>
        <div>
          <span className="kicker">MỘT CHỐN THÂN QUEN</span>
          <blockquote>
            “The journey matters more when you feel at home.”
          </blockquote>
        </div>
        <small>Đà Lạt, Việt Nam · 18°C</small>
      </section>
      <section className="auth-form-wrap">
        <Link className="back" to="/">
          <ArrowLeft /> Về trang chủ
        </Link>
        <form className="auth-form" onSubmit={submit}>
          <span className="eyebrow">ROOMLY MEMBERS</span>
          <h1>{title}</h1>
          <p>
            {mode === "login"
              ? "Đăng nhập để tiếp tục hành trình của riêng bạn."
              : "Chỉ vài bước để bắt đầu hành trình cùng Roomly."}
          </p>
          {mode === "register" && (
            <Field label="Họ và tên">
              <div className="input-icon">
                <UserRound />
                <input
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Nguyễn Minh Anh"
                />
              </div>
            </Field>
          )}
          <Field label="Email">
            <div className="input-icon">
              <Mail />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="ban@email.com"
              />
            </div>
          </Field>
          {["login", "register", "reset"].includes(mode) && (
            <Field label="Mật khẩu">
              <div className="input-icon">
                <KeyRound />
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                />
                <button type="button" onClick={() => setShow(!show)}>
                  {show ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </Field>
          )}
          {["verify", "reset", "unlock"].includes(mode) && (
            <Field label="Mã OTP">
              <input
                required
                value={form.otp}
                onChange={(e) => set("otp", e.target.value)}
                placeholder="Nhập mã từ email"
              />
            </Field>
          )}
          {mode === "register" && (
            <Field label="Bạn muốn">
              <select
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
              >
                <option value="1">Đặt phòng</option>
                <option value="2">Cho thuê phòng</option>
                <option value="3">Cả hai</option>
              </select>
            </Field>
          )}
          {mode === "login" && (
            <button
              type="button"
              className="forgot-link"
              onClick={() => setMode("forgot")}
            >
              Quên mật khẩu?
            </button>
          )}
          <button className="btn full" disabled={busy}>
            {busy
              ? "Đang xử lý…"
              : mode === "login"
                ? "Đăng nhập"
                : mode === "register"
                  ? "Tạo tài khoản"
                  : "Xác nhận"}
          </button>
          <div className="auth-switch">
            {mode === "login" ? (
              <>
                Chưa có tài khoản?{" "}
                <button type="button" onClick={() => setMode("register")}>
                  Đăng ký ngay
                </button>
              </>
            ) : (
              <>
                Đã có tài khoản?{" "}
                <button type="button" onClick={() => setMode("login")}>
                  Đăng nhập
                </button>
              </>
            )}
          </div>
          {mode === "login" && (
            <button
              type="button"
              className="subtle-link"
              onClick={async () => {
                try {
                  await api("/auth/request-unlock", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: form.email }),
                  });
                  setMode("unlock");
                  toast.success("OTP mở khóa đã được gửi");
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Không thể gửi OTP",
                  );
                }
              }}
            >
              Tài khoản bị khóa?
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
