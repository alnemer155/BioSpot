import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Home from "@/pages/home";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Dash from "@/pages/dash";
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
        Back to BioSpot
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
          <Route path="/login" element={<Login />} />
          <Route path="/dash" element={<Dash />} />
          {/* Public bio pages: /@username */}
          <Route path="/*" element={<UserBio />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
