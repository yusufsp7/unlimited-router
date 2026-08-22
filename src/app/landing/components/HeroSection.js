"use client";

export default function HeroSection() {
  return (
    <section className="ur-aurora relative pt-32 pb-24 px-6 min-h-[92vh] flex flex-col items-center justify-center overflow-hidden text-white">
      {/* Glow accents */}
      <div className="absolute top-0 left-1/4 w-[560px] h-[420px] bg-[#6D5AE6]/25 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[460px] h-[360px] bg-[#22D3EE]/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl w-full text-center flex flex-col items-center gap-8">
        {/* Brand mark */}
        <div className="flex items-center justify-center size-16 rounded-3xl ur-gradient-bg shadow-[0_18px_50px_-12px_rgba(109,90,230,0.9)]">
          <span className="font-display text-4xl font-bold leading-none">&#8734;</span>
        </div>

        {/* Version badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80">
          <span className="flex h-2 w-2 rounded-full bg-[#22D3EE] animate-pulse"></span>
          Free &amp; open source &#8226; multi-account AI gateway
        </div>

        {/* Main heading */}
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.06] tracking-tight">
          Every AI model.<br />
          <span className="ur-gradient-text">One endpoint.</span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-light leading-relaxed">
          Log in with multiple Z.AI, Claude, GitHub Copilot, Qoder and Freebuff accounts —
          Unlimited Router rotates them automatically and speaks every AI protocol,
          so your tools never run out of quota.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 w-full">
          <a
            href="#get-started"
            className="h-12 px-8 rounded-full ur-gradient-bg hover:brightness-110 text-white text-base font-bold transition-all shadow-[0_10px_30px_-8px_rgba(109,90,230,0.7)] flex items-center gap-2"
          >
            <span className="material-symbols-outlined">rocket_launch</span>
            Get Started
          </a>
          <a
            href="https://github.com/yusufsp7/unlimited-router"
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 px-8 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white text-base font-bold transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">code</span>
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
