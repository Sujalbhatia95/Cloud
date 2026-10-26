"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconArrowLeft, IconArrowRight, IconClose } from "@/components/ui/icons";
import { NoPhoto, canOptimise } from "./PropertyImage";

export function Gallery({ images, title, isDemo }: { images: string[]; title: string; isDemo: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;
  const alt = (i: number) => `${title} — photo ${i + 1} of ${count}${isDemo ? " (computer-generated demo image)" : ""}`;

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onKey = (e: KeyboardEvent) => {
      if (!dlg.open) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Close the lightbox if the page is hidden by a navigation (state is preserved across routes).
  useEffect(() => () => dialogRef.current?.close(), []);

  if (count === 0)
    return (
      <div className="relative aspect-[16/9] w-full">
        <NoPhoto />
      </div>
    );

  return (
    <>
      {/* Mobile: swipeable carousel */}
      <div className="relative md:hidden">
        <ul className="flex snap-x snap-mandatory overflow-x-auto" aria-label="Photos">
          {images.map((src, i) => (
            <li key={src} className="relative aspect-[4/3] w-full shrink-0 snap-center">
              <button type="button" className="absolute inset-0" onClick={() => open(i)} aria-label={`Open photo ${i + 1} of ${count}`}>
                <Image src={src} alt={alt(i)} fill sizes="100vw" priority={i === 0} unoptimized={!canOptimise(src)} className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
        <span className="badge badge-dark absolute bottom-3 right-3">{count} photos</span>
      </div>

      {/* Desktop: editorial grid */}
      <div className="hidden h-[560px] gap-2 md:grid md:grid-cols-4 md:grid-rows-2">
        {images.slice(0, 5).map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => open(i)}
            className={`group relative overflow-hidden bg-sand ${i === 0 ? "col-span-2 row-span-2" : count < 5 && i === count - 1 ? "col-span-2" : ""}`}
            aria-label={`Open photo ${i + 1} of ${count}`}
          >
            <span className="img-zoom absolute inset-0">
              <Image
                src={src}
                alt={alt(i)}
                fill
                sizes={i === 0 ? "50vw" : "25vw"}
                priority={i === 0}
                unoptimized={!canOptimise(src)}
                className="object-cover"
              />
            </span>
            {i === 4 && count > 5 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-navy-900/55 text-sm font-semibold text-white">
                +{count - 5} more
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="mt-3 hidden justify-end md:flex">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => open(0)}>
          View all {count} photos
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`${title} photos`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-navy-900/97 p-0 text-white backdrop:bg-navy-900/80"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm" aria-live="polite">
              {index + 1} / {count}
              {isDemo ? <span className="badge badge-demo ml-3">Demo image</span> : null}
            </p>
            <button type="button" className="inline-flex h-11 w-11 items-center justify-center" onClick={() => dialogRef.current?.close()} aria-label="Close photos" autoFocus>
              <IconClose size={26} />
            </button>
          </div>
          <div className="relative flex-1">
            <Image
              key={images[index]}
              src={images[index]}
              alt={alt(index)}
              fill
              sizes="100vw"
              unoptimized={!canOptimise(images[index])}
              className="object-contain"
            />
            {count > 1 ? (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 p-3 hover:bg-white/20" aria-label="Previous photo">
                  <IconArrowLeft size={24} />
                </button>
                <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 p-3 hover:bg-white/20" aria-label="Next photo">
                  <IconArrowRight size={24} />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}
