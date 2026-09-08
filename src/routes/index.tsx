import { createFileRoute } from "@tanstack/react-router";
import { RouteError } from "@/components/route-error";

// Marketing landing page. The design is a self-contained, approved static
// layout that already uses the app's Sora/Manrope + Nova tokens, so it ships
// as raw HTML + a co-located style block rather than a re-derived JSX port
// (avoids visual drift from a design that was signed off pixel by pixel).
// Its CTAs use plain anchors: a full navigation to /signup or /login is the
// right behaviour crossing from marketing into the app. The style tag is
// scoped in time to this route; it unmounts on navigation to a portal.

const LANDING_CSS = `*, *::before, *::after{ box-sizing: border-box; }

  /* Tokens lifted verbatim from the ConecktOS app design system
     (src/styles.css). Same palette, same glass, same type stack. */
  :root{
    --bg: oklch(0.85 0.07 305);
    --bg-2: oklch(0.88 0.06 305);
    --surface: oklch(1 0 0);
    --surface-2: oklch(0.955 0.025 305);
    --ink: oklch(0.2 0.03 285);
    --ink-fg: oklch(0.97 0.005 285);
    --ink-70: oklch(0.2 0.03 285 / .72);
    --muted: oklch(0.48 0.04 285);
    --primary: oklch(0.55 0.24 285);
    --primary-hover: oklch(0.50 0.24 285);
    --primary-deep: oklch(0.32 0.18 285);
    --primary-soft: oklch(0.55 0.24 285 / .10);
    --lime: oklch(0.94 0.19 118);
    --lime-fg: oklch(0.2 0.03 285);
    --edge: oklch(0.9 0.03 300);
    --edge-strong: oklch(0.82 0.04 300);
    --glow-peach: oklch(0.85 0.11 40);
    --glow-mint: oklch(0.85 0.14 155);
    --glow-magenta: oklch(0.80 0.15 335);
    --success: oklch(0.72 0.18 148);
    --warning: oklch(0.75 0.14 55);
    --danger: oklch(0.62 0.21 22);
    /* App glass utility, exact values */
    --glass-bg: rgba(255, 255, 255, 0.55);
    --glass-border: rgba(255, 255, 255, 0.65);
    --glass-blur: blur(24px) saturate(180%);
    --glass-shadow: 0 10px 32px -12px rgba(94, 62, 232, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.8);
    --radius: 20px;
    --radius-lg: 32px;
    --sans: 'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    --display: 'Sora', ui-sans-serif, system-ui, sans-serif;
    --mono: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  }

  html{ color-scheme: light; }
  body{
    background:
      radial-gradient(1200px 700px at 12% -5%, oklch(0.92 0.08 320 / .55), transparent 60%),
      radial-gradient(1000px 600px at 90% 5%, oklch(0.88 0.10 260 / .35), transparent 60%),
      linear-gradient(180deg, var(--bg-2), var(--bg) 30%, var(--bg));
    color: var(--ink);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    padding-top: env(safe-area-inset-top);
    overflow-x: hidden;
    min-height: 100dvh;
  }

  a{ color: inherit; text-decoration: none; }

  .container{
    width: 100%;
    max-width: 1200px;
    margin-inline: auto;
    padding-inline: 24px;
  }

  /* ============ NAV ============ */
  .nav{
    position: sticky;
    top: env(safe-area-inset-top);
    z-index: 40;
    padding-block: 14px;
  }
  .nav-shell{
    display: flex; align-items: center; justify-content: space-between;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: 999px;
    padding: 8px 8px 8px 20px;
    box-shadow:
      0 8px 32px -12px rgba(30,20,60,.18),
      inset 0 1px 0 rgba(255,255,255,.5);
  }
  .brand{
    display: inline-flex; align-items: center; gap: 10px;
    font-family: var(--display); font-weight: 700; font-size: 18px;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .brand-mark{
    width: 28px; height: 28px; border-radius: 8px;
    background: linear-gradient(135deg, var(--primary), oklch(0.65 0.22 320));
    display: grid; place-items: center;
    box-shadow: 0 4px 12px -4px oklch(0.55 0.24 285 / .5);
  }
  .brand-mark svg{ width: 14px; height: 14px; color: #fff; }
  .nav-links{
    display: none;
    gap: 28px;
    font-size: 14px; font-weight: 500;
    color: var(--muted);
  }
  .nav-links a{ transition: color .15s ease; }
  .nav-links a:hover{ color: var(--ink); }
  .nav-right{ display: flex; align-items: center; gap: 8px; }
  .nav-login{
    display: none;
    padding: 8px 14px; border-radius: 999px;
    font-size: 14px; font-weight: 500;
    color: var(--muted);
    transition: color .15s ease, background .15s ease;
  }
  .nav-login:hover{ color: var(--ink); background: var(--surface-2); }
  .nav-cta{
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--ink); color: var(--surface);
    padding: 9px 16px; border-radius: 999px;
    font-weight: 600; font-size: 13.5px;
    transition: transform .15s ease, background .15s ease;
  }
  .nav-cta:hover{ background: var(--primary); transform: translateY(-1px); }

  @media (min-width: 900px){
    .nav-links{ display: flex; }
    .nav-login{ display: inline-flex; }
  }

  /* ============ HERO ============ */
  .hero{
    padding-block: clamp(56px, 8vw, 96px) clamp(64px, 10vw, 120px);
    position: relative;
    isolation: isolate;
  }
  .hero-inner{
    text-align: center;
    max-width: 860px; margin-inline: auto;
    position: relative;
  }
  .hero-eyebrow{
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 14px 6px 8px; border-radius: 999px;
    background: var(--surface); border: 1px solid var(--edge);
    font-family: var(--mono); font-size: 11px;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--ink-70);
  }
  .hero-eyebrow-dot{
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-soft);
  }
  h1.hero-h{
    font-family: var(--display);
    font-weight: 700;
    font-size: clamp(44px, 6.5vw, 76px);
    line-height: 1.02;
    letter-spacing: -0.03em;
    text-wrap: balance;
    margin: 22px 0 0;
    color: var(--ink);
  }
  h1.hero-h span{
    color: var(--primary);
  }
  .hero-sub{
    margin: 22px auto 0;
    font-size: 17px;
    line-height: 1.55;
    color: var(--muted);
    max-width: 52ch;
  }
  /* Own row: the two CTAs sit side by side and nothing else joins them. */
  .hero-actions{
    margin-top: 32px;
    display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;
  }
  .btn-primary{
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--ink); color: var(--surface);
    padding: 14px 24px; border-radius: 999px;
    font-weight: 600; font-size: 15px;
    transition: transform .15s ease, background .15s ease;
    box-shadow: 0 8px 22px -10px rgba(30,20,60,.5);
  }
  .btn-primary:hover{
    background: var(--primary);
    transform: translateY(-1px);
  }
  .btn-secondary{
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--surface); color: var(--ink);
    padding: 14px 24px; border-radius: 999px;
    font-weight: 500; font-size: 15px;
    border: 1px solid var(--edge);
    transition: border-color .15s ease, transform .15s ease;
  }
  .btn-secondary:hover{
    border-color: var(--edge-strong);
    transform: translateY(-1px);
  }

  /* Own row below the CTAs: the verified reassurance strip. */
  .hero-perks{
    margin-top: 20px;
    display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 24px;
    font-size: 13px; color: var(--muted);
  }
  .hero-perks span{
    display: inline-flex; align-items: center; gap: 6px;
    font-weight: 500;
  }
  .hero-perks svg{ color: var(--success); flex: 0 0 auto; }

  /* ============ STATS BAND ============ */
  .stats{
    padding-block: 20px 0;
  }
  .stats-inner{
    display: grid; gap: 0;
    grid-template-columns: 1fr;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 28px 20px;
    box-shadow:
      0 20px 40px -20px rgba(30,20,60,.14),
      inset 0 1px 0 rgba(255,255,255,.5);
  }
  @media (min-width: 700px){
    .stats-inner{ grid-template-columns: repeat(4, 1fr); }
  }
  .stat{
    text-align: center; padding: 12px 8px;
    border-bottom: 1px solid var(--edge);
  }
  .stat:last-child{ border-bottom: none; }
  @media (min-width: 700px){
    .stat{ border-bottom: none; border-right: 1px solid var(--edge); }
    .stat:last-child{ border-right: none; }
  }
  .stat-num{
    font-family: var(--display); font-weight: 700;
    font-size: clamp(28px, 3.5vw, 40px);
    letter-spacing: -0.03em; line-height: 1;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .stat-num span{ color: var(--primary); }
  .stat-lbl{
    margin-top: 8px;
    font-family: var(--mono); font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--muted);
  }

  /* ============ USE CASE PILLS ============ */
  .use-cases{
    padding-block: clamp(48px, 6vw, 72px);
    text-align: center;
  }
  .use-cases-label{
    font-family: var(--mono); font-size: 11px;
    letter-spacing: 0.15em; text-transform: uppercase;
    color: var(--muted);
  }
  .use-row{
    margin-top: 20px;
    display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 10px;
  }
  .use-pill{
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 18px; border-radius: 999px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    box-shadow:
      0 8px 20px -12px rgba(30,20,60,.16),
      inset 0 1px 0 rgba(255,255,255,.55);
    font-family: var(--display); font-weight: 600; font-size: 14px;
    color: var(--ink);
    letter-spacing: -0.01em;
    transition: transform .15s ease;
  }
  .use-pill:hover{ transform: translateY(-2px); }
  .use-pill svg{ color: var(--primary); }

  /* ============ TESTIMONIAL RAIL (mid-page) ============ */
  .testimonial-rail{
    padding-block: clamp(60px, 8vw, 96px);
  }
  .testi-card{
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    padding: clamp(32px, 5vw, 56px);
    box-shadow:
      0 30px 60px -22px rgba(30,20,60,.2),
      inset 0 1px 0 rgba(255,255,255,.55);
    display: grid; gap: 32px;
    grid-template-columns: 1fr;
    align-items: center;
    position: relative;
    isolation: isolate;
    overflow: hidden;
  }
  .testi-card::before{
    content: '';
    position: absolute; inset: -30% -20% auto -20%;
    height: 240px;
    background: radial-gradient(closest-side, oklch(0.80 0.15 335 / .35), transparent 70%);
    filter: blur(60px);
    z-index: -1;
  }
  @media (min-width: 800px){
    .testi-card{ grid-template-columns: 1fr 1.4fr; gap: 48px; }
  }
  /* Results card: the quote says it, these numbers prove it. Solid surface
     so it reads as a distinct object against the glass testimonial panel. */
  .testi-facts{
    background: var(--surface);
    border-radius: 22px;
    padding: 24px 22px;
    box-shadow: 0 20px 44px -22px rgba(30,20,60,.28);
  }
  .testi-facts-head{
    display: flex; align-items: center; gap: 12px;
    padding-bottom: 18px; margin-bottom: 4px;
    border-bottom: 1px solid var(--edge);
  }
  .testi-logo{
    width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
    background: linear-gradient(140deg, var(--primary), oklch(0.42 0.20 300));
    display: grid; place-items: center;
    font-family: var(--display); font-weight: 800; font-size: 14px;
    letter-spacing: -0.02em; color: #fff;
    box-shadow: 0 8px 18px -8px oklch(0.55 0.24 285 / .55);
  }
  .testi-facts-head strong{
    display: block;
    font-family: var(--display); font-weight: 700; font-size: 16px;
    letter-spacing: -0.02em; color: var(--ink);
  }
  /* Scoped to the text column only. A bare \`span\` here also matched
     .testi-logo and clobbered its grid centering. */
  .testi-facts-head > div > span{
    display: block; font-size: 12px; color: var(--muted); margin-top: 2px;
  }
  .testi-stats{ margin: 0; }
  .testi-stats > div{
    padding: 16px 0;
    border-bottom: 1px solid var(--edge);
  }
  .testi-stats > div:last-child{ border-bottom: none; padding-bottom: 2px; }
  .testi-stats dt{
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--muted);
  }
  .testi-stats dd{
    margin: 5px 0 0;
    display: flex; align-items: baseline; gap: 9px;
    font-family: var(--display); font-weight: 800; font-size: 27px;
    letter-spacing: -0.03em; color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .testi-stats dd em{
    font-family: var(--sans); font-style: normal;
    font-size: 12px; font-weight: 500; letter-spacing: 0;
    color: var(--muted);
  }
  .testi-stats dd.good{ color: var(--success); }
  /* Small monogram beside the name, where an avatar actually belongs. */
  .testi-avatar{
    width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(140deg, var(--primary), oklch(0.62 0.22 340));
    display: grid; place-items: center;
    font-family: var(--display); font-weight: 700; font-size: 14px;
    color: #fff; letter-spacing: -0.01em;
  }
  .testi-quote{
    font-family: var(--display); font-weight: 500;
    font-size: clamp(20px, 2.6vw, 28px);
    letter-spacing: -0.015em; line-height: 1.35;
    color: var(--ink);
    text-wrap: balance;
  }
  .testi-quote span{ color: var(--primary); font-weight: 700; }
  .testi-attrib{
    margin-top: 24px;
    display: flex; align-items: center; gap: 14px;
    padding-top: 20px; border-top: 1px solid var(--edge);
    font-size: 14px;
  }
  .testi-attrib strong{
    display: block; color: var(--ink); font-weight: 700;
    font-family: var(--display);
  }
  /* Scoped to the text column only, so it cannot clobber .testi-avatar. */
  .testi-attrib > div > span{
    display: block; color: var(--muted); font-size: 12px;
    font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.08em;
    margin-top: 2px;
  }
  .stars{
    display: inline-flex; gap: 2px;
    color: oklch(0.75 0.18 65);
    margin-left: auto;
  }

  /* ============ BEFORE / AFTER ============ */
  .compare{
    padding-block: clamp(60px, 9vw, 112px);
  }
  .compare-head{ text-align: center; margin-bottom: 40px; }
  .compare-head .eyebrow{ justify-content: center; }
  .compare-head h2{
    font-family: var(--display); font-weight: 700;
    font-size: clamp(30px, 4.2vw, 44px);
    letter-spacing: -0.025em; line-height: 1.1;
    text-wrap: balance;
    margin: 14px auto 0;
    color: var(--ink);
    max-width: 22ch;
  }
  .compare-head h2 span{ color: var(--primary); }
  .compare-grid{
    display: grid; gap: 20px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 800px){
    .compare-grid{ grid-template-columns: 1fr 1fr; }
  }
  .compare-card{
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 32px 28px;
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    box-shadow:
      0 20px 40px -20px rgba(30,20,60,.16),
      inset 0 1px 0 rgba(255,255,255,.5);
  }
  .compare-tag{
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px; border-radius: 999px;
    font-family: var(--mono); font-size: 10.5px;
    letter-spacing: 0.14em; text-transform: uppercase;
    margin-bottom: 16px;
  }
  .compare-tag.before{ background: oklch(0.70 0.20 25 / .12); color: var(--danger); }
  .compare-tag.after{ background: oklch(0.55 0.24 285 / .12); color: var(--primary); }
  .compare-h{
    font-family: var(--display); font-weight: 700;
    font-size: 22px; letter-spacing: -0.02em; line-height: 1.15;
    color: var(--ink);
    margin-bottom: 20px;
    max-width: 22ch;
  }
  .compare-list{
    display: flex; flex-direction: column; gap: 14px;
    list-style: none; padding: 0;
    font-size: 14.5px; color: var(--ink-70);
  }
  .compare-list li{
    display: flex; align-items: flex-start; gap: 10px;
    padding-bottom: 14px; border-bottom: 1px dashed var(--edge);
  }
  .compare-list li:last-child{ border-bottom: none; padding-bottom: 0; }
  .compare-list svg{ flex: 0 0 auto; margin-top: 3px; }
  .compare-card.before .compare-list svg{ color: var(--danger); }
  .compare-card.after .compare-list svg{ color: var(--success); }

  /* ============ FAQ ============ */
  .faq{
    padding-block: clamp(60px, 8vw, 96px);
  }
  .faq-head{ text-align: center; margin-bottom: 40px; }
  .faq-head .eyebrow{ justify-content: center; }
  .faq-head h2{
    font-family: var(--display); font-weight: 700;
    font-size: clamp(30px, 4.2vw, 44px);
    letter-spacing: -0.025em; line-height: 1.1;
    text-wrap: balance;
    margin: 14px auto 0;
    color: var(--ink);
    max-width: 22ch;
  }
  .faq-list{
    max-width: 780px; margin-inline: auto;
    display: flex; flex-direction: column; gap: 10px;
  }
  .faq-item{
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 18px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.5);
    overflow: hidden;
  }
  .faq-item summary{
    list-style: none;
    cursor: pointer;
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 24px;
    font-family: var(--display); font-weight: 600; font-size: 16px;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .faq-item summary::-webkit-details-marker{ display: none; }
  .faq-item .plus{
    font-family: var(--display); font-weight: 400; font-size: 24px;
    color: var(--primary); transition: transform .3s ease;
  }
  .faq-item[open] .plus{ transform: rotate(45deg); }
  .faq-answer{
    padding: 0 24px 22px;
    font-size: 14.5px; color: var(--ink-70); line-height: 1.6;
    max-width: 62ch;
  }

  /* Hero visual: photo silhouette + floating UI chips */
  .hero-visual{
    margin-top: 56px;
    position: relative;
    height: 600px;
    max-width: 780px;
    margin-inline: auto;
  }
  /* On desktop the deck is invisible so its children position absolutely. */
  .chip-deck{ display: contents; }

  /* Floating glass chips around the phone */
  .chip-card{
    position: absolute;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-radius: 18px;
    padding: 12px 14px;
    box-shadow: var(--glass-shadow);
    width: 208px;
    text-align: left;
    z-index: 2;
  }
  .chip-card small{
    display: block;
    font-size: 9px; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 5px;
  }
  .chip-card strong{
    display: block;
    font-family: var(--display); font-weight: 700; font-size: 13px;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .chip-card .num{
    font-family: var(--display); font-weight: 800; font-size: 19px;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: var(--ink);
  }
  .chip-card.a{ top: 6%;  left: 0;      animation: float-a 7s ease-in-out infinite; }
  .chip-card.b{ top: 22%; right: 0;     animation: float-b 8s ease-in-out infinite; }
  .chip-card.c{ bottom: 22%; left: 2%;  animation: float-c 9s ease-in-out infinite; }
  .chip-card.d{ bottom: 8%;  right: 2%; animation: float-a 7.5s ease-in-out infinite; }
  @keyframes float-a{ 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-8px); } }
  @keyframes float-b{ 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-12px); } }
  @keyframes float-c{ 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-6px); } }

  .chip-inline{
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 999px;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase;
  }
  .chip-inline.ok{ background: oklch(0.72 0.18 148 / .18); color: oklch(0.42 0.14 148); }
  .chip-inline.warn{ background: oklch(0.75 0.14 55 / .22); color: oklch(0.45 0.12 55); }

  .mini-qr{
    width: 32px; height: 32px; border-radius: 7px;
    background:
      linear-gradient(90deg, var(--ink) 50%, transparent 50%),
      linear-gradient(0deg, var(--ink) 50%, transparent 50%);
    background-size: 4px 4px;
    background-position: 0 0, 2px 2px;
    background-color: var(--surface);
    flex-shrink: 0;
  }

  /* Below 760px the floating chips would collide with the phone, so they
     become a swipeable deck underneath it instead. */
  @media (max-width: 760px){
    .hero-visual{
      height: auto; max-width: 100%;
      display: flex; flex-direction: column; align-items: center; gap: 20px;
    }
    /* .visual-phone is un-positioned lower down, after its base rule.
       Overriding it here would lose on source order at equal specificity. */
    /* Full-bleed by cancelling the .container padding, not with 100vw:
       100vw includes the scrollbar and overflows the page by its width. */
    .chip-deck{
      display: flex; gap: 10px;
      /* stretch + min-width:0 stop the flex item sizing to its content,
         then negative margins cancel the .container padding for full bleed.
         100vw is avoided on purpose: it counts the scrollbar. */
      align-self: stretch; min-width: 0;
      margin-inline: -24px;
      overflow-x: auto; scroll-snap-type: x mandatory;
      padding: 4px 24px 12px;
      scrollbar-width: none;
    }
    .chip-deck::-webkit-scrollbar{ display: none; }
    .chip-card{
      position: static; animation: none !important;
      max-width: none; width: 235px; flex: 0 0 auto;
      scroll-snap-align: center;
      text-align: left;
    }
  }
  .visual-blob{
    position: absolute; inset: -10% 5%;
    background:
      radial-gradient(closest-side, oklch(0.85 0.11 40 / .55), transparent 70%),
      radial-gradient(closest-side at 70% 60%, oklch(0.80 0.15 335 / .35), transparent 70%);
    filter: blur(50px);
    z-index: -1;
    border-radius: 40%;
  }
  /* ===== Central product phone: faithful ConecktOS Owner dashboard ===== */
  .visual-phone{
    position: absolute; bottom: 0; left: 50%;
    transform: translateX(-50%);
    width: 264px; height: 572px;
    border-radius: 44px;
    background: #0d0b14;
    border: 1px solid rgba(255,255,255,.14);
    box-shadow:
      0 40px 90px -30px oklch(0.35 0.24 285 / .45),
      0 20px 50px -20px rgba(30,20,60,.35),
      inset 0 1px 0 rgba(255,255,255,.10);
    padding: 7px;
    animation: phone-float 8s ease-in-out infinite;
    z-index: 1;
  }
  @keyframes phone-float{
    0%,100%{ transform: translateX(-50%) translateY(0); }
    50%   { transform: translateX(-50%) translateY(-10px); }
  }
  .visual-phone::before{
    content: ''; position: absolute; top: 14px; left: 50%;
    transform: translateX(-50%);
    width: 78px; height: 22px; border-radius: 14px;
    background: #000; z-index: 3;
  }
  /* The screen renders the app's own light theme, not a dark invention */
  .phone-screen{
    width: 100%; height: 100%;
    border-radius: 38px;
    background: var(--bg);
    padding: 34px 0 0;
    display: flex; flex-direction: column;
    overflow: hidden;
    position: relative;
    font-family: var(--sans);
  }

  /* --- app header --- */
  .ps-header{
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px; padding: 8px 12px 10px;
  }
  .ps-brand{ display: flex; align-items: center; gap: 7px; min-width: 0; }
  .ps-logo{
    width: 26px; height: 26px; border-radius: 9px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary), oklch(0.65 0.22 305));
    display: grid; place-items: center;
    box-shadow: 0 12px 40px -14px oklch(0.65 0.22 285 / .5);
  }
  .ps-logo svg{ width: 13px; height: 13px; color: #fff; }
  .ps-brand-name{
    display: block;
    font-family: var(--display); font-weight: 700; font-size: 11.5px;
    letter-spacing: -0.02em; color: var(--ink); line-height: 1.15;
    white-space: nowrap;
  }
  .ps-brand-sub{
    display: block;
    font-size: 7.5px; color: var(--muted); line-height: 1.2;
    white-space: nowrap;
  }
  .ps-header-right{ display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .ps-bell{
    width: 24px; height: 24px; border-radius: 50%;
    background: var(--surface); border: 1px solid var(--edge);
    display: grid; place-items: center; position: relative;
  }
  .ps-bell svg{ width: 12px; height: 12px; color: var(--ink); }
  .ps-bell b{
    position: absolute; top: -3px; right: -3px;
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--danger); color: #fff;
    font-size: 7px; font-weight: 700;
    display: grid; place-items: center;
  }
  .ps-avatar-chip{
    display: flex; align-items: center; gap: 3px;
    background: var(--surface); border: 1px solid var(--edge);
    border-radius: 999px; padding: 2px 6px 2px 2px;
  }
  .ps-avatar{
    width: 19px; height: 19px; border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), oklch(0.65 0.22 320));
    display: grid; place-items: center;
    font-size: 8px; font-weight: 700; color: #fff;
    font-family: var(--display);
  }
  .ps-avatar-chip svg{ width: 9px; height: 9px; color: var(--muted); }

  .ps-body{
    flex: 1; min-height: 0;
    padding: 0 12px; display: flex; flex-direction: column; gap: 8px;
    overflow: hidden;
  }

  /* --- Start new period pill (real Owner action) --- */
  .ps-period{
    align-self: flex-end;
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--surface); border: 1px solid var(--edge);
    border-radius: 999px; padding: 4px 10px;
    font-size: 8.5px; font-weight: 600; color: var(--ink);
  }
  .ps-period svg{ width: 9px; height: 9px; }

  /* --- HeroCard: rounded-3xl bg-ink p-5 + violet corner glow --- */
  .ps-hero{
    position: relative; overflow: hidden;
    border-radius: 22px;
    background: var(--ink);
    color: var(--ink-fg);
    padding: 13px;
  }
  .ps-hero::before{
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 85% 0%, rgba(143,114,255,.35), transparent 55%);
    pointer-events: none;
  }
  .ps-hero > *{ position: relative; }
  .ps-hero-top{
    display: flex; align-items: center; justify-content: space-between;
  }
  .ps-hero-eyebrow{
    font-size: 8.5px; font-weight: 500;
    color: oklch(0.97 0.005 285 / .7);
  }
  .ps-hero-badge{
    border-radius: 999px; background: rgba(255,255,255,.1);
    padding: 2px 7px; font-size: 7.5px; font-weight: 500;
    color: oklch(0.97 0.005 285 / .85);
  }
  .ps-hero-amount{
    margin-top: 7px;
    font-family: var(--display); font-size: 25px; font-weight: 700;
    line-height: 1; letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }
  .ps-hero-caption{
    margin-top: 4px; font-size: 8px;
    color: oklch(0.97 0.005 285 / .6);
  }
  .ps-hero-foot{
    margin-top: 11px; padding-top: 9px;
    border-top: 1px solid rgba(255,255,255,.1);
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
  }
  .ps-stat-label{
    font-size: 7px; font-weight: 500; text-transform: uppercase;
    letter-spacing: 0.1em; color: oklch(0.97 0.005 285 / .55);
  }
  .ps-stat-value{
    margin-top: 1px;
    font-family: var(--display); font-size: 10.5px; font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .ps-stat-value.lime{ color: var(--lime); }

  /* --- Setup ribbon --- */
  .ps-ribbon{
    display: flex; align-items: center; gap: 6px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 999px; padding: 6px 10px;
    font-size: 8px; color: var(--ink);
  }
  .ps-ribbon svg{ width: 11px; height: 11px; flex-shrink: 0; color: var(--success); }
  .ps-ribbon span{ flex: 1; }
  .ps-ribbon b{ color: var(--muted); font-weight: 400; font-size: 10px; }

  /* --- MetricScroller row --- */
  .ps-metrics{ display: flex; gap: 7px; }
  .ps-metric{
    flex: 1; min-width: 0;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 14px; padding: 9px 10px;
  }
  .ps-metric-top{ display: flex; align-items: center; justify-content: space-between; }
  .ps-metric-lbl{
    font-size: 6.5px; font-weight: 500; text-transform: uppercase;
    letter-spacing: 0.12em; color: var(--muted);
  }
  .ps-metric-top svg{ width: 9px; height: 9px; color: var(--muted); }
  .ps-metric-val{
    margin-top: 3px;
    font-family: var(--display); font-size: 13px; font-weight: 700;
    letter-spacing: -0.02em; color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .ps-metric-val.success{ color: var(--success); }
  .ps-metric-hint{ font-size: 6.5px; color: var(--muted); margin-top: 1px; }

  /* --- Revenue by method card --- */
  .ps-revenue{
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 16px; padding: 10px 11px;
  }
  .ps-revenue-head{
    display: flex; align-items: baseline; justify-content: space-between;
    margin-bottom: 8px;
  }
  .ps-revenue-title{
    font-family: var(--display); font-size: 10.5px; font-weight: 700;
    letter-spacing: -0.02em; color: var(--ink);
  }
  .ps-revenue-total{ font-size: 8px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .ps-pay-row{ margin-bottom: 7px; }
  .ps-pay-row:last-child{ margin-bottom: 0; }
  .ps-pay-top{
    display: flex; align-items: baseline; justify-content: space-between;
    font-size: 8px; color: var(--ink); margin-bottom: 3px;
  }
  .ps-pay-top em{ font-style: normal; color: var(--muted); font-size: 7.5px; }
  .ps-pay-bar{
    height: 4px; border-radius: 2px; background: var(--surface-2); overflow: hidden;
  }
  .ps-pay-bar i{ display: block; height: 100%; background: var(--primary); border-radius: 2px; }

  /* --- BottomNav: glass rounded-3xl with lime FAB --- */
  .ps-nav-wrap{ padding: 0 10px 10px; margin-top: auto; }
  .ps-nav{
    display: flex; align-items: center; justify-content: space-around; gap: 3px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 22px; padding: 5px;
    box-shadow: var(--glass-shadow);
  }
  .ps-nav-btn{
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px;
    border-radius: 14px; padding: 5px 2px;
    font-size: 6.5px; font-weight: 500; color: var(--muted);
  }
  .ps-nav-btn svg{ width: 12px; height: 12px; }
  .ps-nav-btn.active{
    background: var(--ink); color: var(--ink-fg); font-weight: 600;
  }
  .ps-fab{
    margin: -12px 0; flex-shrink: 0;
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--lime); color: var(--lime-fg);
    display: grid; place-items: center;
    box-shadow: 0 8px 20px -6px oklch(0.55 0.24 285 / .3);
  }
  .ps-fab svg{ width: 15px; height: 15px; }

  /* ============ TRUST BAR ============ */
  .trust{
    padding-block: 32px 48px;
    text-align: center;
  }
  .trust-label{
    font-family: var(--mono); font-size: 11px;
    letter-spacing: 0.15em; text-transform: uppercase;
    color: var(--muted);
  }
  .trust-row{
    margin-top: 20px;
    display: flex; flex-wrap: wrap; justify-content: center;
    gap: 16px 40px;
    font-family: var(--display); font-weight: 600; font-size: 18px;
    color: var(--ink-70);
    letter-spacing: -0.01em;
    opacity: 0.75;
  }

  /* ============ FEATURE INTRO GRID (3 cards + pastel orbs) ============ */
  .feature-intro{
    padding-block: clamp(60px, 8vw, 96px);
  }
  .intro-h{
    text-align: center;
    font-family: var(--display); font-weight: 700;
    font-size: clamp(30px, 4vw, 44px);
    letter-spacing: -0.025em; line-height: 1.1;
    text-wrap: balance;
    max-width: 24ch; margin-inline: auto;
    color: var(--ink);
  }
  .intro-sub{
    text-align: center;
    margin: 18px auto 0;
    font-size: 16px; color: var(--muted);
    max-width: 52ch;
  }
  .intro-grid{
    margin-top: 56px;
    display: grid; gap: 20px;
    grid-template-columns: 1fr;
    position: relative;
  }
  @media (min-width: 800px){
    .intro-grid{ grid-template-columns: repeat(3, 1fr); }
  }
  .feat-card{
    position: relative;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 28px 24px 32px;
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    box-shadow:
      0 20px 40px -20px rgba(30,20,60,.16),
      inset 0 1px 0 rgba(255,255,255,.55);
    isolation: isolate;
    overflow: hidden;
    transition: transform .3s ease, box-shadow .3s ease;
  }
  .feat-card:hover{
    transform: translateY(-4px);
    box-shadow:
      0 30px 60px -22px rgba(30,20,60,.24),
      inset 0 1px 0 rgba(255,255,255,.7);
  }
  .feat-glow{
    position: absolute;
    inset: auto 20% -40% 20%;
    height: 160px;
    border-radius: 50%;
    filter: blur(40px);
    z-index: -1;
  }
  .feat-card.peach .feat-glow{ background: radial-gradient(closest-side, var(--glow-peach), transparent 70%); }
  .feat-card.mint  .feat-glow{ background: radial-gradient(closest-side, var(--glow-mint),  transparent 70%); }
  .feat-card.magenta .feat-glow{ background: radial-gradient(closest-side, var(--glow-magenta), transparent 70%); }
  .feat-icon{
    width: 40px; height: 40px; border-radius: 12px;
    display: grid; place-items: center;
    background: var(--ink); color: var(--surface);
    margin-bottom: 20px;
  }
  .feat-card.peach .feat-icon{ background: oklch(0.55 0.20 40); }
  .feat-card.mint  .feat-icon{ background: oklch(0.45 0.20 155); }
  .feat-card.magenta .feat-icon{ background: oklch(0.50 0.24 335); }
  .feat-icon svg{ width: 20px; height: 20px; }
  .feat-h{
    font-family: var(--display); font-weight: 700; font-size: 20px;
    letter-spacing: -0.015em;
    color: var(--ink);
  }
  .feat-body{
    margin-top: 8px;
    font-size: 14.5px; line-height: 1.55;
    color: var(--muted);
  }

  /* ============ DEEP SECTIONS ============ */
  section.section{
    padding-block: clamp(60px, 9vw, 112px);
  }
  .section-inner{
    display: grid; gap: 40px;
    grid-template-columns: 1fr;
    align-items: center;
  }
  @media (min-width: 900px){
    .section-inner{ grid-template-columns: 1fr 1.05fr; gap: 64px; }
    .section.flip .section-inner{ direction: rtl; }
    .section.flip .section-inner > *{ direction: ltr; }
  }
  .eyebrow{
    display: inline-flex; align-items: center; gap: 10px;
    font-family: var(--mono); font-size: 11px;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--primary);
  }
  .eyebrow::before{
    content: ''; width: 24px; height: 1px;
    background: var(--primary); opacity: .6;
  }
  h2.section-h{
    font-family: var(--display); font-weight: 700;
    font-size: clamp(30px, 4.2vw, 46px);
    letter-spacing: -0.025em; line-height: 1.08;
    text-wrap: balance;
    margin: 14px 0 0;
    color: var(--ink);
    max-width: 20ch;
  }
  h2.section-h span{ color: var(--primary); }
  .section-body{
    margin-top: 18px;
    font-size: 16px; line-height: 1.6;
    color: var(--muted);
    max-width: 46ch;
  }
  .section-list{
    margin-top: 24px;
    display: flex; flex-direction: column; gap: 12px;
    list-style: none; padding: 0;
    font-size: 15px; color: var(--ink-70);
  }
  .section-list li{
    display: flex; align-items: flex-start; gap: 10px;
  }
  .section-list svg{
    color: var(--primary); flex: 0 0 auto; margin-top: 3px;
  }

  /* ============ PROOF PANELS (product mockups) ============ */
  .proof{
    position: relative;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 22px;
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    box-shadow:
      0 30px 60px -22px rgba(30,20,60,.22),
      inset 0 1px 0 rgba(255,255,255,.55);
  }
  .proof-head{
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--edge);
  }
  .proof-title{
    font-family: var(--display); font-weight: 600; font-size: 15px;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .proof-meta{
    font-family: var(--mono); font-size: 10.5px;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--muted);
  }

  /* Split table (Section 1) */
  .split-table{ margin-top: 14px; }
  .st-row{
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr 0.9fr;
    padding: 12px 4px;
    align-items: center;
    font-size: 13.5px;
    border-bottom: 1px solid var(--edge);
  }
  .st-row:last-child{ border-bottom: none; }
  .st-head{
    font-family: var(--mono); font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--muted);
    padding-bottom: 8px;
    padding-top: 0;
  }
  .st-client{ color: var(--ink); font-weight: 500; }
  .st-client small{
    display: block; font-size: 11px; color: var(--muted);
    font-weight: 400; margin-top: 1px;
  }
  .st-num{
    font-variant-numeric: tabular-nums;
    font-family: var(--display); font-weight: 600;
    color: var(--ink);
  }
  .st-num.accent{ color: var(--primary); }
  .st-status{
    text-align: right;
  }

  /* Staff table (Section 2) */
  .staff-cards{ margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
  .sc-row{
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px; align-items: center;
    padding: 12px; border-radius: 14px;
    background: var(--surface-2);
    border: 1px solid var(--edge);
  }
  .sc-av{
    width: 34px; height: 34px; border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), oklch(0.65 0.22 340));
    display: grid; place-items: center;
    font-family: var(--display); font-weight: 600; font-size: 12.5px;
    color: #fff;
  }
  .sc-info{ min-width: 0; }
  .sc-name{
    font-family: var(--display); font-weight: 600; font-size: 14.5px;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .sc-title{ font-size: 12px; color: var(--muted); margin-top: 1px; }
  .sc-num{
    text-align: right;
    font-family: var(--display); font-weight: 700; font-size: 17px;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.015em;
  }
  .sc-num small{
    display: block; font-size: 10px; font-weight: 500;
    color: var(--muted); font-family: var(--mono);
    letter-spacing: 0.08em; text-transform: uppercase;
    margin-top: 2px;
  }

  /* Chart panel (Section 3) */
  .chart-panel{ margin-top: 16px; }
  .chart-summary{
    display: flex; align-items: baseline; gap: 8px;
    margin-bottom: 4px;
  }
  .chart-summary b{
    font-family: var(--display); font-weight: 800; font-size: 26px;
    letter-spacing: -0.03em; color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .chart-summary span{ font-size: 13px; color: var(--muted); }
  .chart-legend{
    display: flex; flex-wrap: wrap; gap: 8px 16px;
    font-size: 12px; color: var(--muted);
    margin: 14px 0 6px;
  }
  .chart-legend span{ display: inline-flex; align-items: center; gap: 6px; }
  .chart-legend .swatch{ width: 9px; height: 9px; border-radius: 2px; }
  .chart-legend .on-time{ background: var(--success); }
  .chart-legend .late   { background: var(--warning); }
  .chart-legend .offsite{ background: var(--danger); }
  .chart-svg{ width: 100%; height: auto; display: block; overflow: visible; }
  .chart-grid line{ stroke: var(--edge); stroke-width: 1; }
  .chart-grid line.base{ stroke: var(--edge-strong); }
  .chart-tick{
    font-family: var(--sans); font-size: 9px; font-weight: 600;
    fill: var(--muted);
  }
  .chart-day{
    font-family: var(--sans); font-size: 9.5px; font-weight: 600;
    letter-spacing: 0.08em; fill: var(--muted);
  }
  .chart-day.peak{ fill: var(--ink); }
  .chart-note{
    margin-top: 12px; padding-top: 12px;
    border-top: 1px solid var(--edge);
    font-size: 12px; color: var(--muted);
    display: flex; align-items: center; gap: 7px;
  }
  .chart-note svg{ color: var(--danger); flex: 0 0 auto; }
  .chart-note b{ color: var(--ink); font-weight: 600; }

  /* ============ SETUP STEPS ============ */
  .steps{ padding-block: clamp(60px, 9vw, 104px); }
  .steps-head{ text-align: center; margin-bottom: 44px; }
  .steps-head .eyebrow{ justify-content: center; }
  .steps-head h2{
    font-family: var(--display); font-weight: 700;
    font-size: clamp(30px, 4.2vw, 44px);
    letter-spacing: -0.025em; line-height: 1.1;
    text-wrap: balance;
    margin: 14px auto 0; color: var(--ink);
    max-width: 20ch;
  }
  .steps-head h2 span{ color: var(--primary); }
  .steps-grid{
    display: grid; gap: 18px;
    grid-template-columns: 1fr;
    position: relative;
  }
  @media (min-width: 860px){
    .steps-grid{ grid-template-columns: repeat(3, 1fr); }
    /* connector rail behind the numbered markers */
    .steps-grid::before{
      content: '';
      position: absolute; top: 54px; left: 16%; right: 16%;
      height: 2px; z-index: 0;
      background: repeating-linear-gradient(90deg,
        var(--edge-strong) 0 6px, transparent 6px 12px);
    }
  }
  .step-card{
    position: relative; z-index: 1;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-radius: var(--radius-lg);
    padding: 30px 26px 32px;
    box-shadow: var(--glass-shadow);
  }
  .step-num{
    width: 44px; height: 44px; border-radius: 14px;
    background: var(--ink); color: var(--ink-fg);
    display: grid; place-items: center;
    font-family: var(--display); font-weight: 800; font-size: 17px;
    letter-spacing: -0.02em;
    margin-bottom: 20px;
  }
  .step-card:last-child .step-num{
    background: var(--primary); color: #fff;
  }
  .step-h{
    font-family: var(--display); font-weight: 700; font-size: 19px;
    letter-spacing: -0.02em; color: var(--ink);
  }
  .step-body{
    margin-top: 8px;
    font-size: 14.5px; line-height: 1.55; color: var(--muted);
  }
  .step-time{
    margin-top: 16px;
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--primary);
  }
  .step-time svg{ width: 12px; height: 12px; }

  /* ============ PRICING ============ */
  .pricing{
    padding-block: clamp(72px, 10vw, 128px);
  }
  .pricing-head{
    text-align: center;
    margin-bottom: 48px;
  }
  .pricing-head .eyebrow{ justify-content: center; }
  .pricing-head h2{
    font-family: var(--display); font-weight: 700;
    font-size: clamp(32px, 4.2vw, 46px);
    letter-spacing: -0.025em; line-height: 1.08;
    text-wrap: balance;
    margin: 14px auto 0;
    color: var(--ink);
    max-width: 22ch;
  }
  .pricing-head h2 span{ color: var(--primary); }
  .pricing-head p{
    margin: 16px auto 0;
    font-size: 15px; color: var(--muted);
    max-width: 48ch;
  }

  .pricing-grid{
    display: grid; gap: 16px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 800px){
    .pricing-grid{ grid-template-columns: repeat(3, 1fr); align-items: stretch; }
  }
  .plan{
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 32px 28px;
    display: flex; flex-direction: column;
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    box-shadow:
      0 20px 40px -20px rgba(30,20,60,.14),
      inset 0 1px 0 rgba(255,255,255,.5);
    transition: transform .25s ease;
  }
  .plan:hover{ transform: translateY(-4px); }
  .plan-name{
    font-family: var(--mono); font-size: 11px;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--muted);
  }
  .plan-price{
    margin-top: 12px;
    font-family: var(--display); font-weight: 700;
    font-size: 48px; letter-spacing: -0.03em; line-height: 1;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .plan-price small{
    font-size: 15px; color: var(--muted);
    font-family: var(--sans); font-weight: 500;
    margin-left: 4px;
  }
  .plan-annual{
    margin-top: 6px;
    font-size: 12.5px; font-weight: 600;
    color: var(--primary);
  }
  .plan.featured .plan-annual{ color: oklch(0.85 0.11 40); }
  .plan-sub{
    margin-top: 12px;
    font-size: 13.5px; color: var(--muted);
    line-height: 1.55;
    max-width: 30ch;
  }
  .plan-list{
    margin-top: 24px;
    display: flex; flex-direction: column; gap: 10px;
    list-style: none; padding: 0;
    font-size: 13.5px; color: var(--ink-70);
    flex: 1;
  }
  .plan-list li{ display: flex; gap: 10px; align-items: flex-start; }
  .plan-list svg{ color: var(--primary); flex: 0 0 auto; margin-top: 3px; }
  .plan-cta{
    margin-top: 24px;
    display: inline-flex; justify-content: center; align-items: center; gap: 6px;
    background: var(--ink); color: var(--surface);
    padding: 12px 20px; border-radius: 999px;
    font-weight: 600; font-size: 14px;
    transition: background .15s ease, transform .15s ease;
  }
  .plan-cta:hover{ background: var(--primary); transform: translateY(-1px); }
  .plan.featured{
    background: linear-gradient(155deg, var(--primary-deep), oklch(0.28 0.16 285));
    border-color: transparent;
    color: var(--surface);
    position: relative;
    box-shadow: 0 20px 50px -20px oklch(0.35 0.24 285 / .55);
  }
  .plan.featured .plan-name{ color: oklch(0.85 0.11 285 / .8); }
  .plan.featured .plan-price{ color: var(--surface); }
  .plan.featured .plan-price small{ color: oklch(0.85 0.11 285 / .8); }
  .plan.featured .plan-sub{ color: oklch(0.90 0.08 285 / .85); }
  .plan.featured .plan-list{ color: oklch(0.94 0.05 285 / .95); }
  .plan.featured .plan-list svg{ color: var(--glow-mint); }
  .plan.featured .plan-cta{
    background: var(--surface); color: var(--ink);
  }
  .plan.featured .plan-cta:hover{ background: oklch(0.85 0.11 40); color: var(--ink); }
  .plan-badge{
    position: absolute; top: -14px; right: 24px;
    background: oklch(0.85 0.11 40); color: var(--ink);
    font-family: var(--mono); font-size: 10px; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    padding: 5px 12px; border-radius: 999px;
    box-shadow: 0 4px 12px -4px rgba(30,20,60,.3);
  }

  /* ============ CTA BAND ============ */
  .cta-band{
    padding-block: clamp(60px, 9vw, 100px);
  }
  .cta-card{
    background: linear-gradient(135deg, oklch(0.30 0.16 285), oklch(0.20 0.10 285));
    border-radius: var(--radius-lg);
    padding: clamp(40px, 7vw, 72px);
    text-align: center;
    position: relative;
    isolation: isolate;
    overflow: hidden;
    color: var(--surface);
    box-shadow: 0 30px 60px -30px oklch(0.35 0.24 285 / .5);
  }
  .cta-card::before{
    content: '';
    position: absolute; inset: -20% -10% auto -10%;
    height: 180px;
    background: radial-gradient(closest-side, oklch(0.85 0.11 40 / .35), transparent 70%);
    filter: blur(60px);
    z-index: -1;
  }
  .cta-card h2{
    font-family: var(--display); font-weight: 700;
    font-size: clamp(30px, 4.2vw, 46px);
    letter-spacing: -0.025em; line-height: 1.1;
    text-wrap: balance;
    max-width: 22ch; margin: 0 auto;
    color: var(--surface);
  }
  .cta-card h2 span{ color: oklch(0.85 0.11 40); }
  .cta-card p{
    margin: 18px auto 0;
    font-size: 15.5px; color: oklch(0.90 0.08 285 / .8);
    max-width: 50ch;
  }
  .cta-card .btn-primary{
    margin-top: 28px;
    background: var(--surface); color: var(--ink);
  }
  .cta-card .btn-primary:hover{
    background: oklch(0.85 0.11 40); color: var(--ink);
  }

  /* ============ FOOTER ============ */
  footer{
    border-top: 1px solid var(--edge);
    padding-block: 48px 32px;
    color: var(--muted);
    font-size: 13px;
    margin-top: 40px;
  }
  .foot-top{
    display: grid; gap: 40px;
    grid-template-columns: 1fr;
    padding-bottom: 36px;
  }
  @media (min-width: 760px){
    .foot-top{ grid-template-columns: minmax(0,1.4fr) repeat(2, minmax(0,1fr)); gap: 48px; }
  }
  .foot-brand{
    display: inline-flex; align-items: center; gap: 10px;
    font-family: var(--display); font-weight: 700; font-size: 19px;
    letter-spacing: -0.02em; color: var(--ink);
  }
  .foot-tag{
    margin-top: 16px; max-width: 34ch;
    font-size: 14px; line-height: 1.55; color: var(--muted);
  }
  .socials{ margin-top: 20px; display: flex; gap: 10px; }
  .soc{
    width: 38px; height: 38px; border-radius: 50%;
    display: grid; place-items: center;
    background: var(--glass-bg); border: 1px solid var(--glass-border);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    color: var(--ink-70);
    box-shadow: 0 6px 16px -10px rgba(30,20,60,.2), inset 0 1px 0 rgba(255,255,255,.6);
    transition: transform .15s ease, color .15s ease, box-shadow .15s ease;
  }
  .soc:hover{
    transform: translateY(-2px); color: #fff;
    background: linear-gradient(135deg, var(--primary), oklch(0.62 0.22 320));
    border-color: transparent;
    box-shadow: 0 10px 22px -8px oklch(0.55 0.24 285 / .5);
  }
  .soc svg{ width: 17px; height: 17px; }
  .foot-col h4{
    margin: 0 0 14px;
    font-family: var(--mono); font-size: 11px; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
  }
  .foot-col ul{ list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .foot-col a{ color: var(--ink-70); font-size: 14px; transition: color .15s ease; }
  .foot-col a:hover{ color: var(--ink); }
  .foot-bar{
    border-top: 1px solid var(--edge); padding-top: 24px;
    display: flex; flex-wrap: wrap; gap: 14px;
    align-items: center; justify-content: space-between;
  }
  .foot-copy{
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--muted);
  }
  .foot-legal{ display: flex; gap: 20px; }
  .foot-legal a{ color: var(--muted); font-size: 12px; }
  .foot-legal a:hover{ color: var(--ink); }

  /* ============ PM APPENDIX ============ */
  .pm{
    border-top: 1px dashed var(--edge-strong);
    padding-block: 40px;
    background: color-mix(in oklab, var(--surface) 60%, transparent);
  }
  .pm details{ max-width: 860px; margin-inline: auto; }
  .pm summary{
    list-style: none; cursor: pointer;
    display: flex; justify-content: space-between; align-items: center;
    padding: 18px 24px;
    background: var(--surface);
    border: 1px solid var(--edge);
    border-radius: 16px;
    font-family: var(--mono); font-size: 12px;
    text-transform: uppercase; letter-spacing: 0.14em;
    color: var(--ink-70);
    transition: box-shadow .15s ease, transform .15s ease;
  }
  .pm summary::-webkit-details-marker{ display: none; }
  .pm summary:hover{ box-shadow: 0 6px 16px -8px rgba(30,20,60,.16); transform: translateY(-1px); }
  .pm summary .plus{
    font-family: var(--display); font-size: 22px; font-weight: 500;
    color: var(--primary); transition: transform .3s ease;
  }
  .pm details[open] summary .plus{ transform: rotate(45deg); }
  .pm-body{ padding: 28px 4px; }
  .pm-body h3{
    font-family: var(--display); font-size: 20px; font-weight: 700;
    letter-spacing: -0.015em; margin: 22px 0 8px;
    color: var(--ink);
  }
  .pm-body h3:first-child{ margin-top: 0; }
  .pm-body p, .pm-body li{
    font-size: 14.5px; color: var(--ink-70); line-height: 1.6;
  }
  .pm-body ul{ padding-left: 20px; }
  .pm-body ul li + li{ margin-top: 6px; }
  .pm-body strong{ color: var(--ink); font-weight: 600; }
  .pm-body em{ color: var(--primary); font-style: italic; }
  .pm-grid{
    margin-top: 12px;
    display: grid; gap: 14px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 700px){ .pm-grid{ grid-template-columns: 1fr 1fr; } }
  .pm-tile{
    background: var(--surface);
    border: 1px solid var(--edge);
    border-radius: 14px; padding: 16px;
  }
  .pm-tile strong{
    display: block; font-family: var(--mono); font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--primary); margin-bottom: 8px;
  }
  .pm-tile p{ font-size: 13.5px; margin: 0; }

  /* ============ MOBILE ============ */
  /* Placed after the phone's base rules so these win on source order. */
  @media (max-width: 760px){
    .visual-phone{
      position: relative; left: auto; bottom: auto; top: auto;
      transform: none; animation: none;
      margin-inline: auto;
      width: 264px; height: 572px;
    }
  }

  @media (max-width: 560px){
    /* The two hero CTAs must stay on one line. At 296px of usable width the
       24px pills need 310px and wrap, so trim the horizontal padding. */
    .btn-primary, .btn-secondary{
      padding-inline: 18px;
    }
    /* 39px fails the 44px minimum touch target. */
    .nav-cta{ min-height: 44px; padding-block: 10px; }
    .nav-shell{ padding: 6px 6px 6px 16px; }
    /* Long headline at 44px runs to five lines; 38px holds it to four
       without losing the hero's weight. Selector must match the base rule's
       \`h1.hero-h\` specificity or it is ignored. */
    h1.hero-h{ font-size: 38px; letter-spacing: -0.028em; }
    .hero-sub{ font-size: 15.5px; }
  }

  @media (prefers-reduced-motion: reduce){
    .chip-card{ animation: none !important; }
    *{ transition: none !important; }
  }`;

const LANDING_HTML = `<!-- NAV -->
<nav class="nav">
  <div class="container">
    <div class="nav-shell">
      <a class="brand" href="/">
        <span class="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>
        </span>
        ConecktOS
      </a>
      <div class="nav-links">
        <a href="#how">How it works</a>
        <a href="#features">For your business</a>
        <a href="#pricing">Pricing</a>
      </div>
      <div class="nav-right">
        <a class="nav-login" href="/login">Log in</a>
        <a class="nav-cta" href="/signup">Get started
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </a>
      </div>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero" id="main-content">
  <div class="container hero-inner">
    <h1 class="hero-h" style="margin-top:0">Run your business like <span>one shop,</span> not ten notebooks.</h1>
    <p class="hero-sub">The operating system for any business that runs on shifts, tickets and commissions. GPS attendance, instant commission splits, tips your team actually receives, and a signed audit at close. Set up in five minutes.</p>
    <div class="hero-actions">
      <a class="btn-primary" href="/signup">Start free
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </a>
      <a class="btn-secondary" href="#how">Watch demo
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 4 20 12 6 20 6 4"/></svg>
      </a>
    </div>
    <div class="hero-perks">
      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> No card required</span>
      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Works offline</span>
      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Nigerian banks built in</span>
    </div>

    <div class="hero-visual" aria-hidden="true">
      <div class="visual-blob"></div>
      <div class="visual-phone">
        <div class="phone-screen">

          <!-- App header, as in AppShell -->
          <div class="ps-header">
            <div class="ps-brand">
              <span class="ps-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>
              </span>
              <span>
                <span class="ps-brand-name">ConecktOS</span>
                <span class="ps-brand-sub">Service Business OS</span>
              </span>
            </div>
            <div class="ps-header-right">
              <span class="ps-bell">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
                <b>1</b>
              </span>
              <span class="ps-avatar-chip">
                <span class="ps-avatar">AO</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </span>
            </div>
          </div>

          <div class="ps-body">
            <span class="ps-period">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
              Start new period
            </span>

            <!-- HeroCard -->
            <div class="ps-hero">
              <div class="ps-hero-top">
                <span class="ps-hero-eyebrow">Today's revenue</span>
                <span class="ps-hero-badge">Sun, 6 Sept</span>
              </div>
              <div class="ps-hero-amount">₦184,500</div>
              <div class="ps-hero-caption">7 billed service jobs · ₦24,000 pending</div>
              <div class="ps-hero-foot">
                <div>
                  <div class="ps-stat-label">Commissions</div>
                  <div class="ps-stat-value">₦92,250</div>
                </div>
                <div style="text-align:right">
                  <div class="ps-stat-label">Net</div>
                  <div class="ps-stat-value lime">₦84,050</div>
                </div>
              </div>
            </div>

            <!-- Setup ribbon -->
            <div class="ps-ribbon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Owner setup complete. All four steps done.</span>
              <b>&times;</b>
            </div>

            <!-- MetricScroller -->
            <div class="ps-metrics">
              <div class="ps-metric">
                <div class="ps-metric-top">
                  <span class="ps-metric-lbl">Power &amp; fuel</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18"/><path d="M13 10h3a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2"/></svg>
                </div>
                <div class="ps-metric-val">₦8,200</div>
                <div class="ps-metric-hint">6h run</div>
              </div>
              <div class="ps-metric">
                <div class="ps-metric-top">
                  <span class="ps-metric-lbl">Commissions</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                </div>
                <div class="ps-metric-val success">₦92,250</div>
                <div class="ps-metric-hint">7 jobs</div>
              </div>
            </div>

            <!-- Revenue by method -->
            <div class="ps-revenue">
              <div class="ps-revenue-head">
                <span class="ps-revenue-title">Revenue by method</span>
                <span class="ps-revenue-total">₦184,500 total</span>
              </div>
              <div class="ps-pay-row">
                <div class="ps-pay-top"><span>POS</span><em>62%</em></div>
                <div class="ps-pay-bar"><i style="width:62%"></i></div>
              </div>
              <div class="ps-pay-row">
                <div class="ps-pay-top"><span>Bank transfer</span><em>27%</em></div>
                <div class="ps-pay-bar"><i style="width:27%"></i></div>
              </div>
              <div class="ps-pay-row">
                <div class="ps-pay-top"><span>Cash</span><em>11%</em></div>
                <div class="ps-pay-bar"><i style="width:11%"></i></div>
              </div>
            </div>
          </div>

          <!-- BottomNav -->
          <div class="ps-nav-wrap">
            <div class="ps-nav">
              <span class="ps-nav-btn active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
                Home
              </span>
              <span class="ps-nav-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/></svg>
                Team
              </span>
              <span class="ps-fab">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
              </span>
              <span class="ps-nav-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                Reports
              </span>
              <span class="ps-nav-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
                Settings
              </span>
            </div>
          </div>

        </div>
      </div>

      <!-- floating UI chips: absolute on desktop, swipeable deck on mobile -->
      <div class="chip-deck">
      <div class="chip-card a">
        <small>Attendance</small>
        <strong>Tunde clocked in · 08:57</strong>
        <div style="margin-top:6px"><span class="chip-inline ok">On time</span></div>
      </div>

      <div class="chip-card b">
        <small>Ticket · Just billed</small>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
          <strong>Ada · Silk press</strong>
          <span class="num">₦25k</span>
        </div>
        <div style="margin-top:8px;height:5px;border-radius:3px;overflow:hidden;background:var(--surface-2);display:flex">
          <span style="height:100%;width:50%;background:var(--primary)"></span>
          <span style="height:100%;width:50%;background:oklch(0.85 0.11 40)"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9.5px;color:var(--muted);margin-top:6px;letter-spacing:0.05em;text-transform:uppercase">
          <span>Staff ₦12,500</span><span>House ₦12,500</span>
        </div>
      </div>

      <div class="chip-card c">
        <small>Tip QR</small>
        <div style="display:flex;align-items:center;gap:10px;margin-top:2px">
          <div class="mini-qr"></div>
          <div>
            <strong style="font-size:13px">Tunde Bakare</strong>
            <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:2px;letter-spacing:0.04em">GTBank · 0123 456 789</div>
          </div>
        </div>
      </div>

      <div class="chip-card d">
        <small>Close-day audit</small>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
          <strong>Signed</strong>
          <span class="num">₦291k</span>
        </div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:4px;letter-spacing:0.05em">6 Sept · 20:14</div>
      </div>
      </div>
    </div>
  </div>
</section>

<!-- TRUST BAR -->
<div class="trust">
  <div class="container">
    <div class="trust-label">Now running daily at</div>
    <div class="trust-row">
      <span>Zaron Studio</span>
      <span>The Groomsmen</span>
      <span>Ivy Spa Lekki</span>
      <span>DriftWash Auto</span>
      <span>Kenta Tailors</span>
    </div>
  </div>
</div>

<!-- STATS BAND -->
<section class="stats">
  <div class="container">
    <div class="stats-inner">
      <div class="stat">
        <div class="stat-num">₦2.4<span>B</span></div>
        <div class="stat-lbl">Tracked at close</div>
      </div>
      <div class="stat">
        <div class="stat-num">1,200<span>+</span></div>
        <div class="stat-lbl">Staff paid on time</div>
      </div>
      <div class="stat">
        <div class="stat-num">98<span>%</span></div>
        <div class="stat-lbl">GPS-verified clock-ins</div>
      </div>
      <div class="stat">
        <div class="stat-num">&lt;24<span>h</span></div>
        <div class="stat-lbl">From signup to first ticket</div>
      </div>
    </div>
  </div>
</section>


<!-- FEATURE INTRO (3 cards with pastel glows) -->
<section class="feature-intro" id="how">
  <div class="container">
    <h2 class="intro-h">Everything your service business needs to run at scale.</h2>
    <p class="intro-sub">Owners wait weeks to catch a leaking naira. Staff chase their own commissions. Customers wonder if the tip actually landed. ConecktOS closes each of those gaps.</p>
    <div class="intro-grid">
      <div class="feat-card peach">
        <div class="feat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>
        </div>
        <div class="feat-h">Unified business ops</div>
        <p class="feat-body">Attendance, billing, inventory and payroll in one workspace. Nothing lives in a WhatsApp thread.</p>
        <div class="feat-glow"></div>
      </div>
      <div class="feat-card mint">
        <div class="feat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div class="feat-h">End-to-end visibility</div>
        <p class="feat-body">Every ticket, every clock-in, every consumable used. The owner sees the day as it happens, not at close.</p>
        <div class="feat-glow"></div>
      </div>
      <div class="feat-card magenta">
        <div class="feat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="feat-h">GPS-verified attendance</div>
        <p class="feat-body">Clock-ins land only from inside your geofence. Late marks itself late. Off-site flags itself in real time.</p>
        <div class="feat-glow"></div>
      </div>
    </div>
  </div>
</section>

<!-- BEFORE / AFTER -->
<section class="compare">
  <div class="container">
    <div class="compare-head">
      <span class="eyebrow">The change</span>
      <h2>What a week in your business looks like <span>before and after.</span></h2>
    </div>
    <div class="compare-grid">
      <div class="compare-card before">
        <span class="compare-tag before"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Before ConecktOS</span>
        <div class="compare-h">Paper timesheets, Friday arguments, guesswork at close.</div>
        <ul class="compare-list">
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Staff arrive whenever. No one checks.</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Commission split fought over every Friday.</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Tips vanish into a house account.</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Consumables leak. Owner finds out at reorder.</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Close-day is a spreadsheet at 11pm.</li>
        </ul>
      </div>
      <div class="compare-card after">
        <span class="compare-tag after"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> With ConecktOS</span>
        <div class="compare-h">One dashboard. One truth. Everyone knows where the naira is.</div>
        <ul class="compare-list">
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> GPS clock-in. Late marks itself late.</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Split lands on their phone the moment you bill.</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Tip QR sends the money straight to their bank.</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Every service auto-decrements what it uses.</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Sign the audit on-screen and go home.</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- SECTION 1: COMMISSION -->
<section class="section" id="features">
  <div class="container section-inner">
    <div>
      <span class="eyebrow">01 · Commissions</span>
      <h2 class="section-h">Your commissions, <span>on the second.</span></h2>
      <p class="section-body">Bill the ticket. The split lands on the phone of whoever did the work, before they lift the payment slip. No spreadsheet, no month-end argument, no missing figures.</p>
      <ul class="section-list">
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Per-person rate set once, applied to every ticket.</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Multi-service tickets split per line item.</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Rolls straight into payroll at close.</li>
      </ul>
    </div>
    <div class="proof">
      <div class="proof-head">
        <div class="proof-title">Today's commissions</div>
        <div class="proof-meta">Sun · 6 Sept</div>
      </div>
      <div class="split-table">
        <div class="st-row st-head">
          <span>Client / Service</span>
          <span>Ticket</span>
          <span>Staff split</span>
          <span class="st-status">Status</span>
        </div>
        <div class="st-row">
          <div class="st-client">Ada Okafor <small>Silk press · Tunde</small></div>
          <div class="st-num">₦25,000</div>
          <div class="st-num accent">₦12,500</div>
          <div class="st-status"><span class="chip-inline ok">Paid</span></div>
        </div>
        <div class="st-row">
          <div class="st-client">Bello J. <small>Beard trim · Musa</small></div>
          <div class="st-num">₦4,500</div>
          <div class="st-num accent">₦2,250</div>
          <div class="st-status"><span class="chip-inline ok">Paid</span></div>
        </div>
        <div class="st-row">
          <div class="st-client">Ify N. <small>Deluxe manicure · Chidinma</small></div>
          <div class="st-num">₦18,000</div>
          <div class="st-num accent">₦9,000</div>
          <div class="st-status"><span class="chip-inline warn">Pending</span></div>
        </div>
        <div class="st-row">
          <div class="st-client">Ola R. <small>Wash + set · Sade</small></div>
          <div class="st-num">₦15,000</div>
          <div class="st-num accent">₦7,500</div>
          <div class="st-status"><span class="chip-inline ok">Paid</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SECTION 2: STAFF INSIGHT -->
<section class="section flip">
  <div class="container section-inner">
    <div>
      <span class="eyebrow">02 · Staff insight</span>
      <h2 class="section-h">Understand every team member <span>in context.</span></h2>
      <p class="section-body">Who moved product this week. Whose repeat clients are climbing. Who is idle after 2pm. All of it in one glance, no reports to run.</p>
      <ul class="section-list">
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Per-person revenue, tips, and repeat clients.</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Payroll rolls up automatically.</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Onboarding, banking and role gates in one place.</li>
      </ul>
    </div>
    <div class="proof">
      <div class="proof-head">
        <div class="proof-title">This week's earnings</div>
        <div class="proof-meta">Wk 36</div>
      </div>
      <div class="staff-cards">
        <div class="sc-row">
          <div class="sc-av">TB</div>
          <div class="sc-info">
            <div class="sc-name">Tunde Bakare</div>
            <div class="sc-title">Senior stylist · 34h</div>
          </div>
          <div class="sc-num">₦86,400 <small>Split</small></div>
        </div>
        <div class="sc-row">
          <div class="sc-av">CN</div>
          <div class="sc-info">
            <div class="sc-name">Chidinma Nwosu</div>
            <div class="sc-title">Nails · 28h</div>
          </div>
          <div class="sc-num">₦64,750 <small>Split</small></div>
        </div>
        <div class="sc-row">
          <div class="sc-av">MI</div>
          <div class="sc-info">
            <div class="sc-name">Musa Ibrahim</div>
            <div class="sc-title">Barber · 31h</div>
          </div>
          <div class="sc-num">₦52,300 <small>Split</small></div>
        </div>
        <div class="sc-row">
          <div class="sc-av">SB</div>
          <div class="sc-info">
            <div class="sc-name">Sade Bello</div>
            <div class="sc-title">Colour · 26h</div>
          </div>
          <div class="sc-num">₦48,100 <small>Split</small></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SECTION 3: ATTENDANCE -->
<section class="section" id="attendance">
  <div class="container section-inner">
    <div>
      <span class="eyebrow">03 · Attendance</span>
      <h2 class="section-h">Monitor every clock-in <span>from one place.</span></h2>
      <p class="section-body">GPS verified. Late marks itself late. Off-site clock-ins raise a flag on your dashboard before the client walks in.</p>
      <ul class="section-list">
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Geofence radius you set. Default 100m.</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Late-status derived from your opening time.</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Weekly breakdown per person and per shift.</li>
      </ul>
    </div>
    <div class="proof">
      <div class="proof-head">
        <div class="proof-title">Clock-ins this week</div>
        <div class="proof-meta">Aug 31 - Sept 6</div>
      </div>
      <div class="chart-panel">
        <div class="chart-summary">
          <b>22 of 27</b><span>shifts started on time this week</span>
        </div>
        <div class="chart-legend">
          <span><span class="swatch on-time"></span>On time</span>
          <span><span class="swatch late"></span>Late</span>
          <span><span class="swatch offsite"></span>Off-site</span>
        </div>
        <svg class="chart-svg" viewBox="0 0 350 196" role="img"
             aria-label="Stacked bar chart of daily clock-ins for the week of 31 August. Four staff on the roster. Monday, Wednesday and Friday were fully on time; Tuesday had one late and one off-site clock-in.">
          <g class="chart-grid">
        <line class="base" x1="34" y1="168" x2="336" y2="168"/>
        <text class="chart-tick" x="26" y="171" text-anchor="end">0</text>
        <line x1="34" y1="131" x2="336" y2="131"/>
        <text class="chart-tick" x="26" y="134" text-anchor="end">1</text>
        <line x1="34" y1="94" x2="336" y2="94"/>
        <text class="chart-tick" x="26" y="97" text-anchor="end">2</text>
        <line x1="34" y1="57" x2="336" y2="57"/>
        <text class="chart-tick" x="26" y="60" text-anchor="end">3</text>
        <line x1="34" y1="20" x2="336" y2="20"/>
        <text class="chart-tick" x="26" y="23" text-anchor="end">4</text>
          </g>
        <rect x="42" y="57" width="26" height="108" rx="3" fill="var(--success)"/>
        <rect x="42" y="20" width="26" height="34" rx="3" fill="var(--warning)"/>
        <text class="chart-day" x="56" y="186" text-anchor="middle">SUN</text>
        <rect x="86" y="20" width="26" height="145" rx="3" fill="var(--success)"/>
        <text class="chart-day peak" x="98" y="186" text-anchor="middle">MON</text>
        <rect x="128" y="94" width="26" height="71" rx="3" fill="var(--success)"/>
        <rect x="128" y="57" width="26" height="34" rx="3" fill="var(--warning)"/>
        <rect x="128" y="20" width="26" height="34" rx="3" fill="var(--danger)"/>
        <text class="chart-day" x="142" y="186" text-anchor="middle">TUE</text>
        <rect x="172" y="20" width="26" height="145" rx="3" fill="var(--success)"/>
        <text class="chart-day peak" x="184" y="186" text-anchor="middle">WED</text>
        <rect x="214" y="57" width="26" height="108" rx="3" fill="var(--success)"/>
        <rect x="214" y="20" width="26" height="34" rx="3" fill="var(--warning)"/>
        <text class="chart-day" x="228" y="186" text-anchor="middle">THU</text>
        <rect x="258" y="20" width="26" height="145" rx="3" fill="var(--success)"/>
        <text class="chart-day peak" x="270" y="186" text-anchor="middle">FRI</text>
        <rect x="300" y="94" width="26" height="71" rx="3" fill="var(--success)"/>
        <rect x="300" y="57" width="26" height="34" rx="3" fill="var(--warning)"/>
        <text class="chart-day" x="314" y="186" text-anchor="middle">SAT</text>
        </svg>
        <div class="chart-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>One <b>off-site clock-in</b> on Tuesday flagged the owner at 09:08.</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- TESTIMONIAL RAIL (mid-page social proof) -->
<section class="testimonial-rail">
  <div class="container">
    <div class="testi-card">
      <div class="testi-facts">
        <div class="testi-facts-head">
          <span class="testi-logo">ZS</span>
          <div>
            <strong>Zaron Studio</strong>
            <span>Lekki, Lagos · 4 stylists</span>
          </div>
        </div>
        <dl class="testi-stats">
          <div>
            <dt>Payroll disputes</dt>
            <dd class="good">0 <em>since March</em></dd>
          </div>
          <div>
            <dt>Time to close the day</dt>
            <dd>4 min <em>was around 40</em></dd>
          </div>
          <div>
            <dt>On-time clock-ins</dt>
            <dd>94% <em>up from 61%</em></dd>
          </div>
        </dl>
      </div>
      <div>
        <div class="stars" aria-label="5 stars">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .8-5.3 4.9L18 22l-6-3.6L6 22l1.3-7.3L2 9.8 9 9z"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .8-5.3 4.9L18 22l-6-3.6L6 22l1.3-7.3L2 9.8 9 9z"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .8-5.3 4.9L18 22l-6-3.6L6 22l1.3-7.3L2 9.8 9 9z"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .8-5.3 4.9L18 22l-6-3.6L6 22l1.3-7.3L2 9.8 9 9z"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .8-5.3 4.9L18 22l-6-3.6L6 22l1.3-7.3L2 9.8 9 9z"/></svg>
        </div>
        <p class="testi-quote">Before ConecktOS, my stylists and I argued at close every Friday. Now the split lands on their phones the moment I bill. <span>Payday is quiet.</span></p>
        <div class="testi-attrib">
          <span class="testi-avatar">AC</span>
          <div>
            <strong>Amaka Chukwu</strong>
            <span>Owner · Zaron Studio, Lagos</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SETUP STEPS -->
<section class="steps" id="setup">
  <div class="container">
    <div class="steps-head">
      <span class="eyebrow">Setup</span>
      <h2>Live in three steps. <span>About five minutes.</span></h2>
    </div>
    <div class="steps-grid">
      <div class="step-card">
        <div class="step-num">1</div>
        <div class="step-h">Create your account</div>
        <p class="step-body">Sign up with email, Google or Apple. Name the business, drop a pin on your location, and set how far the geofence reaches.</p>
        <span class="step-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          About 90 seconds
        </span>
      </div>
      <div class="step-card">
        <div class="step-num">2</div>
        <div class="step-h">Invite your team</div>
        <p class="step-body">Send one link. Each person picks their role, sets a password and adds payout details. Their commission rate is live from the next ticket.</p>
        <span class="step-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          About 2 minutes
        </span>
      </div>
      <div class="step-card">
        <div class="step-num">3</div>
        <div class="step-h">Bill your first ticket</div>
        <p class="step-body">Pick the service, pick who did the work, take payment. The split lands on their phone before the client is out the door.</p>
        <span class="step-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          Under a minute
        </span>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="pricing" id="pricing">
  <div class="container">
    <div class="pricing-head">
      <span class="eyebrow">04 · Pricing</span>
      <h2>Simple pricing that <span>grows with your business.</span></h2>
      <p>Billing and tips are free for good. Pay only when you need attendance verified, commissions split automatically and the day signed off.</p>
    </div>
    <div class="pricing-grid">
      <div class="plan">
        <div class="plan-name">Starter</div>
        <div class="plan-price">₦0<small>/month</small></div>
        <div class="plan-sub">Bill tickets and collect tips. Free for as long as you want it.</div>
        <ul class="plan-list">
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Up to 3 staff</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Ticket billing and daily revenue</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Client history and repeat lookup</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Tip QRs, bank to bank</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Works offline on any phone</li>
        </ul>
        <a class="plan-cta" href="/signup">Start free</a>
      </div>

      <div class="plan featured">
        <span class="plan-badge">Most popular</span>
        <div class="plan-name">Studio</div>
        <div class="plan-price">₦15,000<small>/month</small></div>
        <div class="plan-annual">₦150k/yr · 2 months free</div>
        <div class="plan-sub">For businesses paying commissions and running a real roster.</div>
        <ul class="plan-list">
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Up to 12 staff</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Everything in Starter</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> GPS-verified attendance</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Automatic commission splits</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Signed close-day audit</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Inventory alerts and payroll roll-up</li>
        </ul>
        <a class="plan-cta" href="/signup">Start free trial</a>
      </div>

      <div class="plan">
        <div class="plan-name">Chain</div>
        <div class="plan-price">₦75,000<small>/month</small></div>
        <div class="plan-sub">For multi-branch operators consolidating locations.</div>
        <ul class="plan-list">
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Unlimited staff</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Everything in Studio</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Cross-branch reports</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Dedicated onboarding and SLA</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Accountant export API</li>
        </ul>
        <a class="plan-cta" href="/signup">Start free trial</a>
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="faq" id="faq">
  <div class="container">
    <div class="faq-head">
      <span class="eyebrow">Questions we hear from owners</span>
      <h2>Straight answers, no fine print.</h2>
    </div>
    <div class="faq-list">
      <details class="faq-item">
        <summary>Do my clients need to install anything to tip? <span class="plus">+</span></summary>
        <div class="faq-answer">No. The tip QR opens their existing banking app with the account and name already filled in. They tap the amount and confirm. Bank-to-bank, no middle wallet, no processor fee.</div>
      </details>
      <details class="faq-item">
        <summary>What happens if the internet drops during a shift? <span class="plus">+</span></summary>
        <div class="faq-answer">ConecktOS is a PWA. Tickets, clock-ins and inventory changes queue offline and sync the moment you're back on. You never lose a bill.</div>
      </details>
      <details class="faq-item">
        <summary>How do I bring my existing staff over? <span class="plus">+</span></summary>
        <div class="faq-answer">Send them the invite link from the owner dashboard. They pick their role, set a password, add their bank details, and their commission split starts from the very next ticket you bill.</div>
      </details>
      <details class="faq-item">
        <summary>Can I try it with a fake business first? <span class="plus">+</span></summary>
        <div class="faq-answer">Yes. Sign up as any role and every screen is preloaded with sample data so you can bill a fake ticket, split a fake commission, and close a fake day before you commit real numbers.</div>
      </details>
      <details class="faq-item">
        <summary>What happens if I stop paying? <span class="plus">+</span></summary>
        <div class="faq-answer">You drop back to Starter, not out. Your data stays, you keep billing tickets and collecting tips, and every past audit is still exportable. Only the paid features pause until you are back on a plan.</div>
      </details>
      <details class="faq-item">
        <summary>Do you support other currencies or countries? <span class="plus">+</span></summary>
        <div class="faq-answer">Naira first. Ghana, Kenya and South Africa are next on the roadmap. Multi-currency lands with the Chain tier.</div>
      </details>
    </div>
  </div>
</section>

<!-- CTA BAND -->
<section class="cta-band">
  <div class="container">
    <div class="cta-card">
      <h2>Ready to run your business like <span>one shop</span> instead of ten notebooks?</h2>
      <p>Open ConecktOS on the front desk phone. Onboard your staff in five minutes. Bill your first ticket today.</p>
      <a class="btn-primary" href="/signup">Get started
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="container">
    <div class="foot-top">
      <div>
        <span class="foot-brand">
          <span class="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>
          </span>
          ConecktOS
        </span>
        <p class="foot-tag">The operating system for any business that runs on shifts, tickets and commissions.</p>
        <div class="socials">
          <a class="soc" href="#" aria-label="ConecktOS on Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
          </a>
          <a class="soc" href="#" aria-label="ConecktOS on TikTok">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9V9.4c-1.3.1-2.5-.3-3.5-.9v6.2a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.6a3.1 3.1 0 1 0 2.2 3V3h2.6z"/></svg>
          </a>
          <a class="soc" href="#" aria-label="ConecktOS on X">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2h3.3l-7.2 8.3L23.5 22h-6.6l-5.2-6.8L5.7 22H2.4l7.7-8.8L1.5 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.1 3.9H5.2L17.7 20z"/></svg>
          </a>
          <a class="soc" href="#" aria-label="ConecktOS on LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4 0 4.75 2.65 4.75 6.1V21H17.5v-5.5c0-1.3 0-3-1.83-3s-2.1 1.43-2.1 2.9V21H9z"/></svg>
          </a>
          <a class="soc" href="#" aria-label="ConecktOS on WhatsApp">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.7 14.2c-.24.67-1.4 1.28-1.93 1.33-.5.05-1.13.07-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.26-4.8-4.2-4.94-4.4-.15-.2-1.2-1.6-1.2-3.05s.76-2.16 1.03-2.46a1.08 1.08 0 0 1 .78-.36c.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.6.83 2.05.9 2.2.07.15.12.32.02.52-.09.2-.14.32-.28.5-.14.16-.3.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.18 1.54 1.9 1.06.95 1.95 1.24 2.23 1.38.28.14.44.12.6-.07.17-.2.7-.8.88-1.08.18-.28.36-.23.6-.14.25.09 1.57.74 1.84.88.27.14.45.2.51.31.07.12.07.68-.17 1.35z"/></svg>
          </a>
        </div>
      </div>

      <div class="foot-col">
        <h4>Product</h4>
        <ul>
          <li><a href="#how">How it works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="/signup">Get started</a></li>
          <li><a href="/login">Log in</a></li>
        </ul>
      </div>

      <div class="foot-col">
        <h4>Company</h4>
        <ul>
          <li><a href="mailto:hello@conecktos.com">Contact</a></li>
          <li><a href="/privacy">Privacy</a></li>
          <li><a href="/terms">Terms</a></li>
        </ul>
      </div>
    </div>

    <div class="foot-bar">
      <div class="foot-copy">© 2026 ConecktOS</div>
      <div class="foot-legal">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </div>
    </div>
  </div>
</footer>

<!-- PM APPENDIX -->`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ConecktOS. Service Business Operating System" },
      {
        name: "description",
        content:
          "The operating system for any business that runs on shifts, tickets and commissions. GPS attendance, instant commission splits, tips your team actually receives, and a signed audit at close.",
      },
      { property: "og:title", content: "ConecktOS. One app for your business, staff and revenue." },
      {
        property: "og:description",
        content:
          "Run your business like one shop, not ten notebooks. GPS attendance, instant commission splits, bank-to-bank tips and a signed close-day audit.",
      },
    ],
  }),
  component: Landing,
  errorComponent: RouteError,
});

function Landing() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
    </>
  );
}
