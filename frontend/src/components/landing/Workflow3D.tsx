// Section 3: the pipeline as a scroll-driven CSS 3D scene (perspective + translateZ + rotate, no WebGL).
// Cards come forward as you scroll; a glowing beam rail shows progress. On touch, small screens and reduced motion it
// becomes a plain vertical list of the same cards. The page scroll itself is never intercepted.
import { useEffect, useRef, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useInView, useReveal, useSimpleMode } from "@/components/landing/hooks";

/* ---------- mini visuals: mounted only while their step is active, so the animation restarts each time ---------- */
const MiniPanel = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[7.5rem] rounded-xl p-3 text-sm" style={{ background: "var(--surface-2)" }}>{children}</div>
);
const d = (ms: number) => ({ "--d": `${ms}ms`, animationDelay: `${ms}ms` }) as React.CSSProperties;

function VisReport() {
  return (
    <MiniPanel>
      <p className="mb-1 text-xs font-semibold muted">Citizen report</p>
      <p className="font-medium">&ldquo;<span className="typewriter" style={{ maxWidth: "100%" }}>No drinking water for 5 people since this morning</span>&rdquo;</p>
    </MiniPanel>
  );
}
function VisAi() {
  const rows: Array<[string, string]> = [["Category", "water"], ["Urgency", "high"], ["People", "5"], ["Needs", "drinking water"]];
  return (
    <MiniPanel>
      <p className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold muted">AI suggestion <span className="pill tone-amber">needs human verification</span></p>
      <div className="grid grid-cols-2 gap-1.5">
        {rows.map(([k, v], i) => (
          <div key={k} className="field-pop shimmer-in rounded-md px-2 py-1" style={{ ...d(250 * i + 150), background: "var(--surface)" }}>
            <span className="text-xs muted">{k}: </span><span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
    </MiniPanel>
  );
}
function VisVerify() {
  return (
    <MiniPanel>
      <p className="mb-2 text-xs font-semibold muted">Coordinator checks the AI output, edits it if needed</p>
      <div className="relative h-11">
        <span className="swap-a btn-physical absolute inset-0 grid place-items-center text-sm">Verify incident</span>
        <span className="swap-b absolute inset-0 flex items-center justify-center gap-2 rounded-xl text-sm font-bold" style={{ background: "var(--pill-teal-bg)", color: "var(--pill-teal-fg)" }}>
          <Check className="size-4" aria-hidden /> Verified by coordinator
        </span>
      </div>
    </MiniPanel>
  );
}
function VisMatch() {
  const bars: Array<[string, number]> = [["D", 62], ["K", 100], ["A", 60], ["C", 50]];
  return (
    <MiniPanel>
      <p className="mb-2 text-xs font-semibold muted">Score S = 0.35D + 0.30K + 0.20A + 0.15C</p>
      <div className="space-y-1.5">
        {bars.map(([k, v], i) => (
          <div key={k} className="flex items-center gap-2 text-xs">
            <span className="w-4 font-bold">{k}</span>
            <div className="neu-meter bar-fill flex-1"><i style={{ width: `${v}%`, ...d(i * 160) }} /></div>
            <span className="w-7 text-right">{v}</span>
          </div>
        ))}
      </div>
    </MiniPanel>
  );
}
function VisRoom() {
  const bubbles: Array<[boolean, string]> = [[true, "Truck can reach Lane 4 in 20 min"], [false, "On my way, bringing water"], [true, "Thanks, keep us posted"]];
  return (
    <MiniPanel>
      <div className="space-y-1.5">
        {bubbles.map(([mine, t], i) => (
          <div key={t} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <span className={`bubble ${mine ? "bubble-mine" : "bubble-theirs"} rounded-2xl px-3 py-1 text-xs`} style={d(350 + i * 650)}>{t}</span>
          </div>
        ))}
      </div>
    </MiniPanel>
  );
}
function VisResolved() {
  return (
    <MiniPanel>
      <p className="mb-2 text-xs font-semibold muted">Status</p>
      <div className="relative h-8">
        <span className="swap-a pill tone-amber absolute left-0 top-0"><i className="led" aria-hidden />in progress</span>
        <span className="swap-b pill tone-green absolute left-0 top-0"><i className="led led-glow" aria-hidden /><Check className="size-3.5" aria-hidden />resolved</span>
      </div>
      <p className="mt-2 text-xs muted">Every step above is recorded in the incident timeline.</p>
    </MiniPanel>
  );
}

const STEPS = [
  { title: "Report", who: "Citizen", text: "A citizen writes what is happening and where.", Vis: VisReport },
  { title: "AI analysis", who: "AI suggests only", text: "AI turns the text into structured fields, shown beside the original.", Vis: VisAi },
  { title: "Human verification", who: "Coordinator decides", text: "A coordinator verifies or rejects, and can correct the AI.", Vis: VisVerify },
  { title: "Smart matching", who: "Explainable score", text: "Eligible volunteers are ranked with a visible breakdown.", Vis: VisMatch },
  { title: "Real-time room", who: "Coordinator + volunteer", text: "After the volunteer accepts, an incident room opens.", Vis: VisRoom },
  { title: "Resolved", who: "Coordinator closes", text: "The incident is closed and the timeline keeps the record.", Vis: VisResolved },
];
const N = STEPS.length;

function StepBody({ i, active }: { i: number; active: boolean }) {
  const s = STEPS[i]!;
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full font-display font-bold" style={{ background: "var(--brand-solid)", color: "var(--brand-ink)" }}>{i + 1}</span>
        <div>
          <h3 className="text-xl font-bold leading-tight">{s.title}</h3>
          <p className="text-xs font-semibold text-brand">{s.who}</p>
        </div>
      </div>
      <p className="mt-3 text-sm muted">{s.text}</p>
      <div className="mt-3">{active ? <s.Vis /> : <MiniPanel><span className="muted">&nbsp;</span></MiniPanel>}</div>
    </>
  );
}

function SimpleStep({ i }: { i: number }) {
  const ref = useReveal<HTMLDivElement>(0.25);
  const [vis, inView] = useInView<HTMLDivElement>(0.4);
  return (
    <div ref={ref} className="reveal">
      <div ref={vis} className="rr-card p-5"><StepBody i={i} active={inView} /></div>
    </div>
  );
}

export function Workflow3D() {
  const simple = useSimpleMode();
  const section = useRef<HTMLElement>(null);
  const cards = useRef<Array<HTMLDivElement | null>>([]);
  const beam = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (simple) return;
    let raf = 0;
    const frame = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / span));
      const f = p * (N - 1);
      cards.current.forEach((c, i) => {
        if (!c) return;
        const dz = i - f;
        const z = dz >= 0 ? -dz * 280 : -dz * 320;
        const x = dz * (dz >= 0 ? 120 : 170);
        const op = dz < 0 ? Math.max(0, 1 + dz * 2.3) : Math.max(0, 1 - dz * 0.7);
        c.style.transform = `translate3d(${x.toFixed(0)}px, ${(dz * -12).toFixed(0)}px, ${z.toFixed(0)}px) rotateY(${(dz * -4).toFixed(1)}deg)`;
        c.style.opacity = op.toFixed(2);
        c.style.pointerEvents = Math.abs(dz) < 0.5 ? "auto" : "none";
        c.style.zIndex = String(100 - Math.round(Math.abs(dz) * 10));
      });
      beam.current?.style.setProperty("--p", p.toFixed(3));
      setActive((a) => (a === Math.round(f) ? a : Math.round(f)));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(frame); };
    frame();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [simple]);

  const jump = (i: number) => {
    const el = section.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (i / (N - 1)) * (el.offsetHeight - window.innerHeight) + 2, behavior: "smooth" });
  };

  const header = (
    <div className="mx-auto w-full max-w-6xl px-4">
      <p className="eyebrow">Workflow in 3D</p>
      <h2 className="mt-2 max-w-3xl text-3xl font-bold sm:text-5xl">Six steps, one rule: AI suggests, a human decides.</h2>
      <p className="mt-3 flex max-w-3xl items-start gap-2 rounded-xl px-3 py-2 text-sm font-medium" style={{ background: "var(--pill-teal-bg)", color: "var(--pill-teal-fg)" }}>
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        AI only suggests. A human coordinator verifies every incident and approves every assignment. Nothing is dispatched automatically.
      </p>
    </div>
  );

  if (simple) {
    return (
      <section id="workflow" ref={section} className="land-section mesh">
        <div className="w-full py-16">
          {header}
          <div className="mx-auto mt-8 grid w-full max-w-6xl gap-4 px-4 sm:grid-cols-2">
            {STEPS.map((_, i) => <SimpleStep key={i} i={i} />)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="workflow" ref={section} className="land-section mesh" style={{ height: `${100 + N * 70}vh`, alignItems: "flex-start" }}>
      <div className="sticky top-[4.5rem] flex h-[calc(100vh-4.5rem)] w-full flex-col justify-center gap-6 overflow-hidden">
        {header}
        <div className="pipe-stage relative mx-auto h-[26rem] w-full max-w-6xl">
          <div className="pipe-world absolute inset-0">
            {STEPS.map((_, i) => (
              <div key={i} ref={(el) => { cards.current[i] = el; }} className="pipe-card h-fit w-[min(30rem,88vw)]">
                <div className="rr-card p-5" style={{ boxShadow: "var(--shadow-float)" }}><StepBody i={i} active={active === i} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl px-4">
          <div ref={beam} className="beam" aria-hidden><i /></div>
          <ol className="mt-3 flex justify-between gap-1">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <button type="button" onClick={() => jump(i)} aria-label={`Go to step ${i + 1}: ${s.title}`} aria-current={active === i}
                  className="flex flex-col items-center gap-1 rounded-lg px-1 text-xs font-semibold">
                  <span className={`step-dot ${i <= active ? "done" : ""}`}>{i + 1}</span>
                  <span className={`hidden lg:block ${i === active ? "text-brand" : "muted"}`}>{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
