import React from "react";
import { Link } from "react-router-dom";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { ZapIcon, UsersIcon, HeartIcon } from "@animateicons/react/lucide";

const FloatingCards = () => (
  <div className="nv-stage-cards" aria-hidden>
    {/* Card A — top-right */}
    <div className="nv-card-float nv-card-a">
      <div className="nv-card-float-head">
        <span
          className="nv-card-float-av"
          style={{ background: "linear-gradient(135deg,#ffb16a,#ff7a9c)" }}
        >
          A
        </span>
        <div className="nv-card-float-bars">
          <span />
          <span />
        </div>
      </div>
      <div
        className="nv-card-float-img"
        style={{
          background:
            "linear-gradient(135deg,rgba(92,130,255,0.55),rgba(255,122,156,0.45))",
        }}
      />
      <div className="nv-card-float-foot group">
        <AnimatedIcon icon={HeartIcon} size={15} fill="currentColor" />
        <span>2.4k</span>
      </div>
    </div>

    {/* Card B — mid-right */}
    <div className="nv-card-float nv-card-b">
      <div className="nv-card-float-head">
        <span
          className="nv-card-float-av"
          style={{ background: "linear-gradient(135deg,#5c82ff,#a78bfa)" }}
        >
          N
        </span>
        <div className="nv-card-float-bars">
          <span />
          <span />
        </div>
      </div>
      <div
        className="nv-card-float-img"
        style={{
          background:
            "linear-gradient(135deg,rgba(229,166,99,0.55),rgba(107,165,123,0.45))",
        }}
      />
      <div className="nv-card-float-foot group">
        <AnimatedIcon icon={HeartIcon} size={15} fill="currentColor" />
        <span>890</span>
      </div>
    </div>

    {/* Card C — bottom-right */}
    <div className="nv-card-float nv-card-c">
      <div className="nv-card-float-head">
        <span
          className="nv-card-float-av"
          style={{ background: "linear-gradient(135deg,#6ba57b,#5c82ff)" }}
        >
          R
        </span>
        <div className="nv-card-float-bars">
          <span />
          <span />
        </div>
      </div>
      <div
        className="nv-card-float-img"
        style={{
          background:
            "linear-gradient(135deg,rgba(255,177,106,0.5),rgba(167,139,250,0.4))",
        }}
      />
    </div>
  </div>
);

const AuthStage = ({ variant = "login" }) => {
  const isLogin = variant === "login";

  return (
    <aside className="nv-stage">
      <span className="nv-stage-aurora" aria-hidden />
      <FloatingCards />

      {/* Brand */}
      <div className="nv-stage-top">
        <Link to="/" className="nv-brand">
          <span className="nv-brand-logo">
            <img src="/logo.gif" alt="Nova" draggable={false} />
          </span>
          <span className="nv-brand-name">ᑎOᐯᗩ</span>
        </Link>
      </div>

      {/* Headline */}
      <div className="nv-stage-mid">
        <span className="nv-stage-kicker">
          <span className="nv-stage-kicker-dot" />
          {isLogin ? "Welcome back" : "Begin your journey"}
        </span>
        <h2 className="nv-stage-headline">
          {isLogin ? (
            <>
              A quieter place
              <br />
              to be <em>loud.</em>
            </>
          ) : (
            <>
              Where every moment
              <br />
              finds its <em>people.</em>
            </>
          )}
        </h2>
        <p className="nv-stage-sub">
          {isLogin
            ? "Step back into your orbit — share moments, keep close to the people that matter, no noise in between."
            : "No algorithms fighting for your attention. Just you, your circle, and the moments worth keeping."}
        </p>
      </div>

      {/* Features */}
      <div className="nv-stage-feats">
        <span className="nv-stage-feat group cursor-pointer">
          <AnimatedIcon icon={ZapIcon} size={15} /> Lightning fast
        </span>
        <span className="nv-stage-feat group cursor-pointer">
          <AnimatedIcon icon={UsersIcon} size={15} /> Built for close circles
        </span>
      </div>
    </aside>
  );
};

export default AuthStage;
