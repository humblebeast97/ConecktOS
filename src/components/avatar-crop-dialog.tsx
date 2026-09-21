import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Loader2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OUT_PX = 256;

/** Render the chosen crop region to a small square JPEG data URL. */
async function getCroppedDataUrl(imageSrc: string, area: Area): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Couldn't read that photo"));
    i.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = OUT_PX;
  canvas.height = OUT_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, OUT_PX, OUT_PX);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * LinkedIn/Instagram-style avatar cropper: shows the full picked photo with a
 * round crop window the user drags + zooms to frame their face, then saves the
 * cropped circle as a small JPEG.
 */
export function AvatarCropDialog({
  file,
  onCancel,
  onCropped,
}: {
  file: File | null;
  onCancel: () => void;
  onCropped: (dataUrl: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onComplete = useCallback((_area: Area, pixels: Area) => setArea(pixels), []);

  const save = async () => {
    if (!src || !area) return;
    setBusy(true);
    try {
      const dataUrl = await getCroppedDataUrl(src, area);
      onCropped(dataUrl);
    } catch {
      toast.error("Couldn't process that photo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(file)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-4 rounded-none border-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:h-auto sm:max-w-md sm:rounded-lg sm:border sm:p-6">
        <DialogHeader>
          <DialogTitle>Adjust your photo</DialogTitle>
          <DialogDescription>
            Drag to reposition, and zoom to frame it in the circle.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full flex-1 overflow-hidden rounded-xl bg-muted sm:h-72 sm:flex-none">
          {src ? (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Slider
            value={[zoom]}
            min={1}
            max={4}
            step={0.01}
            onValueChange={(v) => setZoom(v[0])}
            aria-label="Zoom"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={busy || !area}
            className="font-semibold"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Save photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
