"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const slides = [
  {
    image: "/images/home/business-consultation.webp",
    eyebrow: "Technology procurement and support",
    title: "Business technology, handled properly.",
    description: "Clear recommendations, carefully sourced products and one accountable team from quotation to ongoing support.",
    action: "Browse products",
    href: "/shop",
  },
  {
    image: "/images/home/technical-installation.webp",
    eyebrow: "Installation and infrastructure",
    title: "Technology that works from day one.",
    description: "Practical planning, professional installation and dependable support for the systems your business relies on.",
    action: "Explore networking",
    href: "/categories/networking",
  },
  {
    image: "/images/home/technology-deployment.webp",
    eyebrow: "Fulfilment you can follow",
    title: "From confirmed stock to dependable delivery.",
    description: "Every item is checked, prepared and coordinated with care before it reaches your team.",
    action: "Shop technology",
    href: "/shop",
  },
] as const;

export function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, []);

  const show = (index: number) => setActive((index + slides.length) % slides.length);

  return (
    <section aria-roledescription="carousel" aria-label="How Innozanzi supports your business" className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="relative min-h-[28rem] overflow-hidden rounded-xl bg-[#071b33] sm:min-h-[30rem]">
          {slides.map((slide, index) => (
            <article aria-hidden={active !== index} className={cn("absolute inset-0 transition-opacity duration-700", active === index ? "z-10 opacity-100" : "pointer-events-none opacity-0")} key={slide.title}>
              <Image className="object-cover object-center" src={slide.image} alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" priority={index === 0} />
              <div className="absolute inset-0 bg-gradient-to-r from-[#06182e]/95 via-[#06182e]/75 to-[#06182e]/5" />
              <div className="relative flex min-h-[28rem] max-w-2xl flex-col justify-center px-6 pb-24 pt-10 text-white sm:min-h-[30rem] sm:px-12 sm:pb-20">
                <p className="text-sm font-semibold tracking-wide text-sky-300">{slide.eyebrow}</p>
                <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">{slide.title}</h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">{slide.description}</p>
                <div className="mt-7">
                  <Link className={cn(buttonVariants({ size: "lg" }), "bg-white text-[#071b33] hover:bg-slate-100")} href={slide.href}>{slide.action}<ArrowRight className="ml-2 size-4" /></Link>
                </div>
              </div>
            </article>
          ))}
          <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 sm:left-12">
            <button aria-label="Previous slide" className="grid size-10 place-items-center rounded-full border border-white/40 bg-[#071b33]/50 text-white backdrop-blur hover:bg-white hover:text-[#071b33]" onClick={() => show(active - 1)}><ArrowLeft className="size-4" /></button>
            <div className="flex gap-2">
              {slides.map((slide, index) => <button aria-label={`Show slide ${index + 1}: ${slide.title}`} aria-current={active === index} className={cn("h-2 rounded-full transition-all", active === index ? "w-7 bg-sky-400" : "w-2 bg-white/60 hover:bg-white")} key={slide.title} onClick={() => show(index)} />)}
            </div>
            <button aria-label="Next slide" className="grid size-10 place-items-center rounded-full border border-white/40 bg-[#071b33]/50 text-white backdrop-blur hover:bg-white hover:text-[#071b33]" onClick={() => show(active + 1)}><ArrowRight className="size-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
