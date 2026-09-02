import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Home from "@/pages/home";
import Register from "@/pages/register";
import RegisterStatus from "@/pages/register-status";
import Login from "@/pages/login";
import ChangePassword from "@/pages/change-password";
import Dash from "@/pages/dash";
import Admin from "@/pages/admin";
import AdminReview from "@/pages/admin-review";
import UserBio from "@/pages/user-bio";

function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <p className="text-sm text-muted-foreground animate-fade-up">
        This page does not exist.
      </p>
      <a
        href="/"
        className="mt-4 border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors animate-fade-up"
      >
        Back to LinkTroo
      </a>
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/status/:requestId" element={<RegisterStatus />} />
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/dash" element={<Dash />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/:requestId" element={<AdminReview />} />
          {/* Public bio pages: /@username */}
          <Route path="/*" element={<UserBio />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
