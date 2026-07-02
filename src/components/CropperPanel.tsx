import { useRef, useState } from "react";
import { Cropper, type ReactCropperElement } from "react-cropper";

export default function CropperPanel({
  src,
  onCancel,
  onSave,
}: {
  src: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const ref = useRef<ReactCropperElement>(null);
  const [busy, setBusy] = useState(false);

  const save = () => {
    const c = ref.current?.cropper;
    if (!c) return;
    setBusy(true);
    const canvas = c.getCroppedCanvas({ maxWidth: 2400, maxHeight: 2400, imageSmoothingQuality: "high" });
    const url = canvas.toDataURL("image/jpeg", 0.9);
    onSave(url);
    setBusy(false);
  };

  const rotate = (deg: number) => ref.current?.cropper?.rotate(deg);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="nb-border nb-shadow bg-[var(--bg)] w-full max-w-3xl max-h-[95vh] overflow-auto">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black uppercase">Crop Document</h3>
            <button onClick={onCancel} className="nb-btn nb-btn-press bg-white text-sm">Cancel</button>
          </div>
          <div className="nb-border bg-black">
            <Cropper
              ref={ref}
              src={src}
              style={{ height: 420, width: "100%" }}
              viewMode={1}
              dragMode="move"
              background={false}
              autoCropArea={1}
              responsive
              checkOrientation
              guides
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => rotate(-90)} className="nb-btn nb-btn-press bg-[var(--c)] text-sm">⟲ Rotate L</button>
            <button onClick={() => rotate(90)} className="nb-btn nb-btn-press bg-[var(--c)] text-sm">⟳ Rotate R</button>
            <button onClick={() => ref.current?.cropper?.reset()} className="nb-btn nb-btn-press bg-[var(--o)] text-sm">Reset</button>
          </div>
          <button onClick={save} disabled={busy} className="w-full nb-btn nb-btn-press bg-[var(--g)] text-lg py-4">
            ✂ Crop & Save to Gallery
          </button>
        </div>
      </div>
    </div>
  );
}
