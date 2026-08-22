"use client";

import { useEffect, useState } from "react";

const PROVIDERS = ["Z.AI", "Claude", "Copilot", "Qoder", "Kimi"];

export default function HeroSection() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % PROVIDERS.length), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="ur-aurora relative pt-28 pb-24 px-6 min-h-[92vh] flex items-center overflow-hidden text-white">
      <div className="absolute top-10 left-[8%] w-[520px] h-[380px] bg-[#14a39a]/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-[10%] w-[420px] h-[320px] bg-[#22D3EE]/12 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto w-full grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
        {/* Left: thesis */}
        <div className="flex flex-col gap-7">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-14 rounded-2xl ur-gradient-bg shadow-[0_18px_50px_-12px_rgba(20,163,154,0.9)]">
              <span className="font-display text-3xl font-bold leading-none">&#8734;</span>
            </div>
            <span className="ur-data text-xs uppercase tracking-[0.22em] text-white/50">Unlimited Router</span>
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            Your AI accounts,<br />
            <span className="ur-gradient-text">one exchange.</span>
          </h1>

          <p className="text-lg text-white/60 max-w-xl leading-relaxed">
            Log in with every Z.AI, Claude, Copilot and Qoder account you own.
            When one hits its limit, the next takes the call — automatically,
            locally, without you watching.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#get-started"
              className="h-12 px-8 rounded-full ur-gradient-bg hover:brightness-110 text-white text-base font-bold transition-all shadow-[0_10px_30px_-8px_rgba(20,163,154,0.7)] flex items-center gap-2"
            >
              <span className="material-symbols-outlined">power_settings_new</span>
              Start routing
            </a>
            <a
              href="https://github.com/yusufsp7/unlimited-router"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-8 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white text-base font-bold transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">code</span>
              Source
            </a>
          </div>
        </div>

        {/* Right: live switchboard (signature) */}
        <div className="relative hidden lg:block">
          <div className="rounded-2xl border border-white/10 bg-[#0b1214]/80 backdrop-blur-sm shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="ur-data ml-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
                route board &#183; live
              </span>
            </div>
            <div className="p-6 font-mono-data">
              <div className="ur-route-strip !border-white/10 !bg-white/[0.04] !text-white/60 mb-5">
                <span className="ur-strip-dot animate-pulse" /> CLIENT <span className="text-white/30">&#9482;&#9472;&#9656;</span> <span className="node">&#8734;</span> <span className="text-white/30">&#9482;&#9472;&#9656;</span> POOL
              </div>
              <ul className="space-y-2.5">
                {PROVIDERS.map((name, i) => (
                  <li
                    key={name}
                    className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 border transition-all duration-500 ${
                      i === active
                        ? "border-brand-400/40 bg-brand-400/10 translate-x-1"
                        : "border-transparent bg-white/[0.03]"
                    }`}
                  >
                    <span className={`ur-data text-sm ${i === active ? "text-brand-300" : "text-white/45"}`}>
                      {String(i + 1).padStart(2, "0")} &#183; {name}
                    </span>
                    <span
                      className={`size-2 rounded-full transition-colors duration-500 ${
                        i === active ? "bg-brand-300 shadow-[0_0_10px_rgba(45,212,191,0.9)]" : "bg-white/15"
                      }`}
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-4 border-t border-white/[0.06] ur-data text-[11px] text-white/35 flex items-center justify-between">
                <span>fallback &lt; 1 tick</span>
                <span className="text-brand-300">&#8734; rotating</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
