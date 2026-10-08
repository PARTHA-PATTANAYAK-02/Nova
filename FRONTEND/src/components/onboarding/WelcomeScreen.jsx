import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Home from "@/components/feed/Home";
import MainLayout from "@/components/layout/MainLayout";

const WELCOME_DURATION_MS = 4400;

const WelcomeScreen = ({ greeting }) => {
  const { user } = useSelector((store) => store.auth);
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(
      () => navigate("/", { replace: true }),
      WELCOME_DURATION_MS,
    );
    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <MainLayout>
        <Home />
      </MainLayout>
      <main className="nova-welcome-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#050914] text-center">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at center, rgba(34,64,138,0.38), transparent 62%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center px-5">
          <img
            src="/logo.gif"
            alt="Nova"
            className="nova-welcome-logo h-auto max-h-[62vh] w-[min(82vw,620px)] object-contain"
            style={{
              animation:
                "nova-welcome-zoom 4.4s cubic-bezier(0.2,0.7,0.25,1) forwards",
            }}
          />
          <div className="nova-welcome-message mt-1 text-white">
            <p className="flex items-center justify-center gap-2 text-xs font-medium tracking-[0.18em] text-white/65 sm:text-sm">
              <Sparkles className="h-4 w-4" /> YOUR ORBIT STARTS HERE
            </p>
            <h1
              className="mt-2 text-2xl font-bold sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {greeting ||
                `Welcome back, ${user?.fullName?.trim() || "friend"}`}
            </h1>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WelcomeScreen;
