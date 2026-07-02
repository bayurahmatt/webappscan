import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import jsPDF from "jspdf";

const CropperPanel = lazy(() => import("@/components/CropperPanel"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Secure Medical Document Scanner" },
      { name: "description", content: "Scan, crop and export medical documents to PDF — 100% in your browser. No uploads. No tracking." },
    ],
  }),
  component: Index,
});

const DEFAULT_TAGS = ["KTP", "KARTU BPJS", "Rekam Medis", "CTG", "USG", "LAKMUS", "SIA", "SIO", "SKOR PUDJI", "EKG", "SURAT PERNYATAAN", "SURAT NAIK/TURUN KELAS", "RUJUKAN", "ANC"];
const TAGS_KEY = "smds.tags.v1";
const SCREENSHOT_KEY = "smds.screenshotName.v1";
const DEFAULT_SCREENSHOT_NAME = "SCREENSHOOT BED";
const TAG_COLORS = ["bg-[var(--y)]", "bg-[var(--p)]", "bg-[var(--c)]", "bg-[var(--g)]", "bg-[var(--o)]", "bg-white"];

type Orient = "auto" | "p" | "l";
type PageItem = { src: string; orient: Orient };
const ORIENT_LABEL: Record<Orient, string> = { auto: "AUTO", p: "PORTRAIT", l: "LANDSCAPE" };
const nextOrient = (o: Orient): Orient => (o === "auto" ? "p" : o === "p" ? "l" : "auto");

function loadTags(): string[] {
  if (typeof window === "undefined") return DEFAULT_TAGS;
  try {
    const raw = localStorage.getItem(TAGS_KEY);
    if (!raw) return DEFAULT_TAGS;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr : DEFAULT_TAGS;
  } catch { return DEFAULT_TAGS; }
}

function loadScreenshotName(): string {
  if (typeof window === "undefined") return DEFAULT_SCREENSHOT_NAME;
  return localStorage.getItem(SCREENSHOT_KEY) || DEFAULT_SCREENSHOT_NAME;
}

function sanitize(name: string) {
  return name.trim().replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "Patient";
}

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [patient, setPatient] = useState("");
  const [nameError, setNameError] = useState("");
  const [tags, setTags] = useState<string[]>(DEFAULT_TAGS);
  const [screenshotName, setScreenshotName] = useState(DEFAULT_SCREENSHOT_NAME);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    setTags(loadTags());
    setScreenshotName(loadScreenshotName());
  }, [mounted]);

  const fileRef = useRef<HTMLInputElement>(null);

  const toggleTag = (t: string) => {
    setSelectedTags(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPendingImage(String(r.result));
    r.readAsDataURL(f);
  };

  const onCropped = (dataUrl: string) => {
    setPages(p => [...p, { src: dataUrl, orient: "auto" }]);
    setPendingImage(null);
  };

  const removePage = (i: number) => setPages(p => p.filter((_, idx) => idx !== i));
  const cycleOrient = (i: number) => setPages(p => p.map((it, idx) => idx === i ? { ...it, orient: nextOrient(it.orient) } : it));

  const validateName = () => {
    if (!patient.trim()) {
      setNameError("Nama pasien wajib diisi!");
      const el = document.getElementById("patient-input");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
      return false;
    }
    setNameError("");
    return true;
  };

  const buildPdf = async (items: PageItem[], filenameBase: string) => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    for (let i = 0; i < items.length; i++) {
      const { src, orient } = items[i];
      const img = await loadImage(src);
      const resolved: "p" | "l" = orient === "auto" ? (img.width > img.height ? "l" : "p") : orient;
      if (i > 0) pdf.addPage("a4", resolved);
      else if (resolved === "l") { pdf.deletePage(1); pdf.addPage("a4", "l"); }
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / img.width, pageH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      pdf.addImage(src, "JPEG", x, y, w, h, undefined, "FAST");
    }
    pdf.save(`${filenameBase}.pdf`);
  };

  const downloadPdf = async () => {
    if (!validateName()) return;
    if (!pages.length) { alert("Add at least one page first."); return; }
    const parts = [sanitize(patient), ...selectedTags.map(sanitize)].filter(Boolean);
    await buildPdf(pages, parts.join("_") || "Scan");
    setPages([]);
    setSelectedTags([]);
  };

  const downloadScreenshotPdf = async (imgs: PageItem[]) => {
    if (!validateName()) return;
    if (!imgs.length) return;
    const filename = `${sanitize(patient)}_${sanitize(screenshotName)}`;
    await buildPdf(imgs, filename);
    setPasteOpen(false);
  };

  return (
    <div className="min-h-screen">
      <header className="nb-border bg-[var(--y)] border-x-0 border-t-0 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="nb-border nb-shadow-sm bg-black text-[var(--y)] px-3 py-2 font-black">RX</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black leading-none">Secure Medical Doc Scanner</h1>
              <p className="text-xs font-bold uppercase tracking-wide">100% Client-Side · No Uploads</p>
            </div>
          </div>
          <button onClick={() => setConfigOpen(true)} className="nb-btn nb-btn-press bg-white text-sm">⚙ Config</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        <section className="nb-border nb-shadow bg-[var(--c)] p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-black uppercase mb-2">
              Patient Name / RM Number <span className="text-red-600">*</span>
            </label>
            <input
              id="patient-input"
              value={patient}
              onChange={e => { setPatient(e.target.value); if (nameError) setNameError(""); }}
              placeholder="e.g. JANE_DOE_RM00123"
              required
              aria-invalid={!!nameError}
              className={`w-full nb-border bg-white px-3 py-3 font-bold text-base focus:outline-none focus:nb-shadow-sm ${nameError ? "bg-[var(--p)]" : ""}`}
            />
            {nameError && <div className="mt-2 nb-border bg-black text-[var(--y)] px-3 py-2 text-sm font-black uppercase">⚠ {nameError}</div>}
          </div>
          <div>
            <label className="block text-sm font-black uppercase mb-2">Document Type · Pick Multiple</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t, i) => {
                const active = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`nb-btn nb-btn-press text-xs sm:text-sm ${active ? "bg-black text-[var(--y)]" : TAG_COLORS[i % TAG_COLORS.length]}`}
                  >
                    {active ? "✓ " : ""}{t}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="nb-border nb-shadow bg-[var(--p)] p-4 sm:p-6">
          <h2 className="text-lg font-black mb-3">Add Page</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setCameraOpen(true)} className="nb-btn nb-btn-press bg-[var(--g)]">📷 Open Camera</button>
            <button onClick={() => fileRef.current?.click()} className="nb-btn nb-btn-press bg-[var(--y)]">🖼 Upload Gallery</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { onFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          </div>
        </section>

        <section className="nb-border nb-shadow bg-[var(--o)] p-4 sm:p-6">
          <h2 className="text-lg font-black mb-1">📋 Paste Screenshot → PDF</h2>
          <p className="text-xs font-bold uppercase mb-3">Tempel hasil Print Screen / Snip · Nama file: <span className="nb-border bg-white px-2 py-0.5">{screenshotName}</span></p>
          <button onClick={() => { if (validateName()) setPasteOpen(true); }} className="nb-btn nb-btn-press bg-white">📋 Open Paste Zone</button>
        </section>

        <section className="nb-border nb-shadow bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black">Scanned Pages ({pages.length})</h2>
            {pages.length > 0 && (
              <button onClick={() => setPages([])} className="nb-btn nb-btn-press bg-[var(--o)] text-xs">Clear All</button>
            )}
          </div>
          {pages.length === 0 ? (
            <div className="nb-border border-dashed p-8 text-center font-bold uppercase text-sm bg-[var(--bg)]">
              No pages yet. Capture or upload to start.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pages.map((pg, i) => (
                <div key={i} className="relative nb-border nb-shadow-sm bg-white">
                  <img src={pg.src} alt={`Page ${i+1}`} className="w-full h-40 object-cover" />
                  <div className="absolute top-1 left-1 nb-border bg-[var(--y)] text-xs font-black px-2 py-0.5">#{i+1}</div>
                  <button
                    onClick={() => cycleOrient(i)}
                    className="absolute bottom-1 left-1 right-1 nb-border bg-[var(--c)] text-[10px] font-black px-2 py-1 hover:bg-black hover:text-[var(--y)]"
                    title="Klik untuk ubah orientasi"
                  >{pg.orient === "l" ? "🖽 " : pg.orient === "p" ? "▯ " : "⟳ "}{ORIENT_LABEL[pg.orient]}</button>
                  <button
                    onClick={() => removePage(i)}
                    className="absolute -top-2 -right-2 nb-border bg-[var(--p)] w-8 h-8 font-black grid place-items-center hover:bg-black hover:text-[var(--y)]"
                    aria-label="Delete"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sticky bottom-4 z-10">
          <button
            onClick={downloadPdf}
            disabled={!pages.length}
            className="w-full nb-btn nb-btn-press bg-[var(--g)] text-lg sm:text-xl py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >⬇ Download PDF ({pages.length})</button>
        </section>

        <footer className="text-center text-xs font-bold uppercase pt-4 pb-8 opacity-70">
          Images never leave your device. · id.ayasora
        </footer>
      </main>

      {pendingImage && mounted && (
        <Suspense fallback={<ModalShell><div className="p-8 font-black">Loading cropper…</div></ModalShell>}>
          <CropperPanel
            src={pendingImage}
            onCancel={() => setPendingImage(null)}
            onSave={onCropped}
          />
        </Suspense>
      )}

      {cameraOpen && mounted && (
        <CameraModal
          onClose={() => setCameraOpen(false)}
          onCapture={(dataUrl) => { setCameraOpen(false); setPendingImage(dataUrl); }}
        />
      )}

      {pasteOpen && mounted && (
        <PasteModal
          screenshotName={screenshotName}
          onClose={() => setPasteOpen(false)}
          onExport={downloadScreenshotPdf}
        />
      )}

      {configOpen && (
        <ConfigModal
          tags={tags}
          screenshotName={screenshotName}
          onClose={() => setConfigOpen(false)}
          onChangeTags={(next) => { setTags(next); localStorage.setItem(TAGS_KEY, JSON.stringify(next)); }}
          onChangeScreenshotName={(name) => { setScreenshotName(name); localStorage.setItem(SCREENSHOT_KEY, name); }}
        />
      )}
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="nb-border nb-shadow bg-[var(--bg)] w-full max-w-3xl max-h-[90vh] overflow-auto">
        {children}
      </div>
    </div>
  );
}

function CameraModal({ onClose, onCapture }: { onClose: () => void; onCapture: (dataUrl: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e: any) {
        setErr(e?.message || "Camera unavailable");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    onCapture(canvas.toDataURL("image/jpeg", 0.92));
  };

  return (
    <ModalShell>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">Camera</h3>
          <button onClick={onClose} className="nb-btn nb-btn-press bg-white text-sm">Close</button>
        </div>
        {err ? (
          <div className="nb-border bg-[var(--p)] p-4 font-bold">{err}</div>
        ) : (
          <video ref={videoRef} playsInline muted className="w-full nb-border bg-black aspect-[4/3] object-cover" />
        )}
        <button onClick={snap} disabled={!!err} className="w-full nb-btn nb-btn-press bg-[var(--g)] text-lg py-4">📸 Capture</button>
      </div>
    </ModalShell>
  );
}

function PasteModal({ screenshotName, onClose, onExport }: { screenshotName: string; onClose: () => void; onExport: (imgs: PageItem[]) => void }) {
  const [imgs, setImgs] = useState<PageItem[]>([]);
  const [hint, setHint] = useState("Klik area di bawah lalu tekan Ctrl+V / Cmd+V untuk menempel screenshot.");
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => { zoneRef.current?.focus(); }, []);

  const handlePaste = async (e: React.ClipboardEvent | ClipboardEvent) => {
    const items = (e as any).clipboardData?.items as DataTransferItemList | undefined;
    if (!items) return;
    let added = 0;
    for (const it of Array.from(items)) {
      if (it.type.startsWith("image/")) {
        const file = it.getAsFile();
        if (!file) continue;
        const url = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result));
          r.readAsDataURL(file);
        });
        setImgs(prev => [...prev, { src: url, orient: "auto" }]);
        added++;
      }
    }
    if (added) setHint(`${added} gambar ditempel. Anda dapat menempel lebih banyak.`);
    else setHint("Clipboard tidak berisi gambar. Coba screenshot dulu.");
  };

  useEffect(() => {
    const onDocPaste = (e: ClipboardEvent) => handlePaste(e);
    document.addEventListener("paste", onDocPaste);
    return () => document.removeEventListener("paste", onDocPaste);
  }, []);

  const remove = (i: number) => setImgs(a => a.filter((_, idx) => idx !== i));
  const cycle = (i: number) => setImgs(a => a.map((it, idx) => idx === i ? { ...it, orient: nextOrient(it.orient) } : it));

  return (
    <ModalShell>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">📋 Paste Screenshot</h3>
          <button onClick={onClose} className="nb-btn nb-btn-press bg-white text-sm">Close</button>
        </div>
        <div className="nb-border bg-[var(--y)] px-3 py-2 text-xs font-black uppercase">Nama file: {screenshotName}.pdf</div>
        <div
          ref={zoneRef}
          tabIndex={0}
          onPaste={handlePaste}
          className="nb-border border-dashed bg-white p-8 text-center font-black uppercase min-h-[160px] flex items-center justify-center focus:outline-none focus:bg-[var(--c)]"
        >
          {hint}
        </div>
        {imgs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {imgs.map((pg, i) => (
              <div key={i} className="relative nb-border nb-shadow-sm bg-white">
                <img src={pg.src} alt={`Paste ${i+1}`} className="w-full h-40 object-contain bg-black/5" />
                <div className="absolute top-1 left-1 nb-border bg-[var(--y)] text-xs font-black px-2 py-0.5">#{i+1}</div>
                <button
                  onClick={() => cycle(i)}
                  className="absolute bottom-1 left-1 right-1 nb-border bg-[var(--c)] text-[10px] font-black px-2 py-1 hover:bg-black hover:text-[var(--y)]"
                >{pg.orient === "l" ? "🖽 " : pg.orient === "p" ? "▯ " : "⟳ "}{ORIENT_LABEL[pg.orient]}</button>
                <button
                  onClick={() => remove(i)}
                  className="absolute -top-2 -right-2 nb-border bg-[var(--p)] w-8 h-8 font-black grid place-items-center hover:bg-black hover:text-[var(--y)]"
                >✕</button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => onExport(imgs)}
          disabled={!imgs.length}
          className="w-full nb-btn nb-btn-press bg-[var(--g)] text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >⬇ Download {screenshotName}.pdf ({imgs.length})</button>
      </div>
    </ModalShell>
  );
}

function ConfigModal({ tags, screenshotName, onClose, onChangeTags, onChangeScreenshotName }: {
  tags: string[];
  screenshotName: string;
  onClose: () => void;
  onChangeTags: (t: string[]) => void;
  onChangeScreenshotName: (n: string) => void;
}) {
  const [authed, setAuthed] = useState(false);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [newTag, setNewTag] = useState("");
  const [ssName, setSsName] = useState(screenshotName);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (u === "ayasora" && p === "ayasora") { setAuthed(true); setErr(""); }
    else setErr("Invalid credentials");
  };

  const add = () => {
    const t = newTag.trim();
    if (!t) return;
    if (tags.includes(t)) { setNewTag(""); return; }
    onChangeTags([...tags, t]);
    setNewTag("");
  };
  const del = (t: string) => onChangeTags(tags.filter(x => x !== t));
  const reset = () => onChangeTags(DEFAULT_TAGS);

  const saveSs = () => {
    const v = ssName.trim() || DEFAULT_SCREENSHOT_NAME;
    onChangeScreenshotName(v);
    setSsName(v);
  };

  return (
    <ModalShell>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">{authed ? "Admin Dashboard" : "Admin Login"}</h3>
          <button onClick={onClose} className="nb-btn nb-btn-press bg-white text-sm">Close</button>
        </div>
        {!authed ? (
          <form onSubmit={login} className="space-y-3 nb-border bg-[var(--c)] p-4">
            <input value={u} onChange={e => setU(e.target.value)} placeholder="Username" className="w-full nb-border bg-white px-3 py-2 font-bold" />
            <input value={p} onChange={e => setP(e.target.value)} type="password" placeholder="Password" className="w-full nb-border bg-white px-3 py-2 font-bold" />
            {err && <div className="nb-border bg-[var(--p)] px-3 py-2 text-sm font-bold">{err}</div>}
            <button className="w-full nb-btn nb-btn-press bg-[var(--y)]">Log In</button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="nb-border bg-[var(--o)] p-4 space-y-2">
              <label className="block text-sm font-black uppercase">Screenshot PDF Name</label>
              <div className="flex gap-2">
                <input value={ssName} onChange={e => setSsName(e.target.value)} className="flex-1 nb-border bg-white px-3 py-2 font-bold" />
                <button onClick={saveSs} className="nb-btn nb-btn-press bg-[var(--g)]">Save</button>
              </div>
              <p className="text-xs font-bold uppercase opacity-80">Digunakan pada menu Paste Screenshot.</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-black uppercase">Document Type Tags</label>
              <div className="flex gap-2">
                <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} placeholder="New tag name" className="flex-1 nb-border bg-white px-3 py-2 font-bold" />
                <button onClick={add} className="nb-btn nb-btn-press bg-[var(--g)]">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <div key={t} className="nb-border bg-white pl-3 pr-1 py-1 flex items-center gap-2 font-bold text-sm">
                    {t}
                    <button onClick={() => del(t)} className="nb-border bg-[var(--p)] w-6 h-6 font-black grid place-items-center hover:bg-black hover:text-[var(--y)]">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={reset} className="nb-btn nb-btn-press bg-[var(--o)] text-sm">Reset Tags to Defaults</button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
