"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Hand, Minus, Plus, X } from "lucide-react";

type CropShape = "circle" | "rectangle";

type ImageCropperProps = {
   file: File;
   aspectRatio: number;
   outputWidth: number;
   outputHeight: number;
   cropShape: CropShape;
   title: string;
   onCancel: () => void;
   onComplete: (blob: Blob) => Promise<void> | void;
};

type Point = { x: number; y: number };

export default function ImageCropper({ file, aspectRatio, outputWidth, outputHeight, cropShape, title, onCancel, onComplete }: ImageCropperProps) {
   const imageRef = useRef<HTMLImageElement | null>(null);
   const previewRef = useRef<HTMLDivElement | null>(null);
   const dragStartRef = useRef<{
      pointer: Point;
      position: Point;
   } | null>(null);

   const [objectUrl, setObjectUrl] = useState("");
   const [zoom, setZoom] = useState(1);
   const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
   const [isDragging, setIsDragging] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
   const [errorMessage, setErrorMessage] = useState("");

   useEffect(() => {
      const nextObjectUrl = URL.createObjectURL(file);

      setObjectUrl(nextObjectUrl);
      setZoom(1);
      setPosition({ x: 0, y: 0 });

      return () => {
         URL.revokeObjectURL(nextObjectUrl);
      };
   }, [file]);

   const previewStyle = useMemo(
      () => ({
         transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom})`,
      }),
      [position, zoom],
   );

   function resetFraming() {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setErrorMessage("");
   }

   function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
      if (!imageRef.current) return;

      event.currentTarget.setPointerCapture(event.pointerId);

      dragStartRef.current = {
         pointer: { x: event.clientX, y: event.clientY },
         position,
      };

      setIsDragging(true);
   }

   function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
      const dragStart = dragStartRef.current;
      if (!dragStart) return;

      setPosition({
         x: dragStart.position.x + (event.clientX - dragStart.pointer.x),
         y: dragStart.position.y + (event.clientY - dragStart.pointer.y),
      });
   }

   function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
         event.currentTarget.releasePointerCapture(event.pointerId);
      }

      dragStartRef.current = null;
      setIsDragging(false);
   }

   function handleWheelZoom(deltaY: number) {
      setZoom((currentZoom) => {
         const nextZoom = deltaY < 0 ? currentZoom + 0.1 : currentZoom - 0.1;

         return Math.min(4, Math.max(0.5, nextZoom));
      });
   }

   async function handleSave() {
      const image = imageRef.current;
      const preview = previewRef.current;

      if (!image || !preview) return;

      setIsSaving(true);
      setErrorMessage("");

      try {
         const canvas = document.createElement("canvas");
         canvas.width = outputWidth;
         canvas.height = outputHeight;

         const context = canvas.getContext("2d");

         if (!context) {
            throw new Error("Could not prepare the image editor.");
         }

         const previewRect = preview.getBoundingClientRect();
         const imageAspect = image.naturalWidth / image.naturalHeight;
         const previewAspect = previewRect.width / previewRect.height;

         let baseRenderedWidth: number;
         let baseRenderedHeight: number;

         if (imageAspect > previewAspect) {
            baseRenderedWidth = previewRect.width;
            baseRenderedHeight = previewRect.width / imageAspect;
         } else {
            baseRenderedHeight = previewRect.height;
            baseRenderedWidth = previewRect.height * imageAspect;
         }

         const renderedWidth = baseRenderedWidth * zoom;
         const renderedHeight = baseRenderedHeight * zoom;

         const renderedLeft = previewRect.width / 2 - renderedWidth / 2 + position.x;

         const renderedTop = previewRect.height / 2 - renderedHeight / 2 + position.y;

         const sourceX = ((0 - renderedLeft) / renderedWidth) * image.naturalWidth;

         const sourceY = ((0 - renderedTop) / renderedHeight) * image.naturalHeight;

         const sourceWidth = (previewRect.width / renderedWidth) * image.naturalWidth;

         const sourceHeight = (previewRect.height / renderedHeight) * image.naturalHeight;

         context.fillStyle = "#FFFFFF";
         context.fillRect(0, 0, outputWidth, outputHeight);

         const scaleX = outputWidth / sourceWidth;
         const scaleY = outputHeight / sourceHeight;

         const destinationX = -sourceX * scaleX;
         const destinationY = -sourceY * scaleY;

         context.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, destinationX, destinationY, image.naturalWidth * scaleX, image.naturalHeight * scaleY);

         const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/jpeg", 0.9);
         });

         if (!blob) {
            throw new Error("Could not prepare the cropped image.");
         }

         await onComplete(blob);
      } catch (error) {
         setErrorMessage(error instanceof Error ? error.message : "Could not save the cropped image.");
      } finally {
         setIsSaving(false);
      }
   }

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="image-cropper-title">
         <div className="w-full max-w-4xl border border-[#111827] bg-white text-[#111827] shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[#111827] bg-[#FFF8EE] px-5 py-4">
               <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2410C]">Image Desk</p>

                  <h2 id="image-cropper-title" className="mt-1 text-2xl font-black uppercase tracking-[-0.025em]">
                     {title}
                  </h2>
               </div>

               <button
                  type="button"
                  onClick={onCancel}
                  className="flex min-h-10 min-w-10 items-center justify-center border border-[#111827] bg-white transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                  aria-label="Close image editor"
               >
                  <X aria-hidden="true" className="h-5 w-5" />
               </button>
            </header>

            <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_280px]">
               <div>
                  <div
                     ref={previewRef}
                     onPointerDown={handlePointerDown}
                     onPointerMove={handlePointerMove}
                     onPointerUp={endDrag}
                     onPointerCancel={endDrag}
                     onWheel={(event) => {
                        event.preventDefault();
                        handleWheelZoom(event.deltaY);
                     }}
                     className={`relative mx-auto touch-none overflow-hidden border border-[#111827] bg-[#E5E7EB] select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${
                        cropShape === "circle" ? "aspect-square max-w-[440px] rounded-full" : "w-full"
                     }`}
                     style={{
                        aspectRatio: cropShape === "circle" ? "1 / 1" : String(aspectRatio),
                     }}
                  >
                     {objectUrl && (
                        <img
                           ref={imageRef}
                           src={objectUrl}
                           alt="Crop preview"
                           draggable={false}
                           className="pointer-events-none absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 select-none object-contain will-change-transform"
                           style={previewStyle}
                        />
                     )}

                     <div className="pointer-events-none absolute inset-0 border-2 border-white/90 shadow-[inset_0_0_0_9999px_rgba(17,24,39,0.08)]" />

                     <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 border border-[#111827] bg-white/95 px-3 py-2 text-xs font-bold text-[#111827] shadow-sm">
                        <Hand aria-hidden="true" className="h-4 w-4" />
                        Drag to move
                     </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[#5B6475]">Drag the image anywhere inside the frame. Use the zoom slider or mouse wheel to zoom in and out. The full image starts visible so you can position it exactly where you want.</p>
               </div>

               <div className="space-y-5">
                  <Control label="Zoom" value={zoom} min={0.5} max={4} step={0.05} onChange={setZoom} minIcon={<Minus className="h-4 w-4" aria-hidden="true" />} maxIcon={<Plus className="h-4 w-4" aria-hidden="true" />} />

                  <Control
                     label="Horizontal position"
                     value={position.x}
                     min={-500}
                     max={500}
                     step={1}
                     onChange={(value) =>
                        setPosition((current) => ({
                           ...current,
                           x: value,
                        }))
                     }
                  />

                  <Control
                     label="Vertical position"
                     value={position.y}
                     min={-500}
                     max={500}
                     step={1}
                     onChange={(value) =>
                        setPosition((current) => ({
                           ...current,
                           y: value,
                        }))
                     }
                  />

                  <button type="button" onClick={resetFraming} className="min-h-10 text-sm font-bold text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                     Reset framing
                  </button>

                  {errorMessage && <p className="border border-[#C2410C] bg-[#FFF1E8] px-3 py-2 text-sm font-bold text-[#C2410C]">{errorMessage}</p>}
               </div>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-[#111827] bg-[#FFF8EE] px-5 py-4 sm:flex-row sm:justify-end">
               <button type="button" onClick={onCancel} className="min-h-11 border border-[#111827] bg-white px-5 text-xs font-black uppercase tracking-[0.1em] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                  Cancel
               </button>

               <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !objectUrl}
                  className="min-h-11 border border-[#1E40AF] bg-[#1E40AF] px-5 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:opacity-60"
               >
                  {isSaving ? "Saving Image..." : "Use This Crop"}
               </button>
            </footer>
         </div>
      </div>
   );
}

function Control({ label, value, min, max, step, onChange, minIcon, maxIcon }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; minIcon?: ReactNode; maxIcon?: ReactNode }) {
   return (
      <label className="block">
         <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5B6475]">{label}</span>

         <div className="mt-2 flex items-center gap-3">
            {minIcon}

            <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#1E40AF]" />

            {maxIcon}
         </div>
      </label>
   );
}
