"use client";

import { useEffect, useId, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import type { TourStep } from "@/config/tutorial";

const arrow = "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-white";

export function FieldReference({ fields }: { fields: NonNullable<TourStep["details"]> }) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const slidesId = useId();

  useEffect(() => {
    if (!api) return;
    const update = () => setSelected(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => { api.off("select", update); api.off("reInit", update); };
  }, [api]);

  if (!fields.length) return null;

  return <details className="mt-2 min-w-0 rounded-xl border border-blue-100 bg-blue-50/30 p-2.5 sm:mt-3 sm:p-3">
    <summary className="cursor-pointer text-xs font-semibold text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:text-sm">Field reference ({fields.length})</summary>
    <Carousel setApi={setApi} opts={{ loop: false, duration: 0 }} aria-label="Field reference" className="mt-2 min-w-0 sm:mt-3">
      <CarouselContent id={slidesId} className="touch-pan-y">
        {fields.map((field, index) => <CarouselItem key={`${index}-${field.title}`} aria-label={`${index + 1} of ${fields.length}`} aria-hidden={index !== selected}>
          <div className="min-h-24 min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 [overflow-wrap:anywhere] sm:min-h-32 sm:p-3">
            <h3 className="text-xs font-semibold text-slate-900 sm:text-sm">{field.title}</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-relaxed">{field.description}</p>
          </div>
        </CarouselItem>)}
      </CarouselContent>
      <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3">
        <button type="button" className={arrow} aria-label="Previous field" aria-controls={slidesId} disabled={!api || selected === 0} onClick={() => api?.scrollPrev()}>
          <ArrowLeft aria-hidden="true" className="size-5" />
        </button>
        <p aria-live="polite" aria-atomic="true" className="min-w-0 text-center text-xs font-medium text-slate-600">
          Field {selected + 1} of {fields.length}<span className="sr-only">: {fields[selected]?.title}</span>
        </p>
        <button type="button" className={arrow} aria-label="Next field" aria-controls={slidesId} disabled={!api || selected === fields.length - 1} onClick={() => api?.scrollNext()}>
          <ArrowRight aria-hidden="true" className="size-5" />
        </button>
      </div>
    </Carousel>
  </details>;
}
