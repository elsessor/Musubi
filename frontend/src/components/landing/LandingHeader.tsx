"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import styles from "./LandingPage.module.css";

type NavigationItem = { href: string; label: string };

export function LandingHeader({ brand, navigation }: { brand: ReactNode; navigation: NavigationItem[] }) {
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    const sections = navigation.flatMap(({ href }) => {
      const element = document.getElementById(href.slice(1));
      return element ? [{ href, element }] : [];
    });
    let frame = 0;
    const update = () => {
      frame = 0;
      // Match the section's scroll margin, just below the sticky navigation.
      const boundary = (headerRef.current?.getBoundingClientRect().bottom ?? 0) + 32;
      let current: string | null = null;
      for (const { href, element } of sections) {
        if (element.getBoundingClientRect().top <= boundary) current = href;
      }
      setActiveSection(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    if (headerRef.current) observer.observe(headerRef.current);
    sections.forEach(({ element }) => observer.observe(element));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    window.addEventListener("pageshow", schedule);
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      window.removeEventListener("pageshow", schedule);
    };
  }, [navigation]);

  const links = navigation.map(({ href, label }) => <a
    key={href}
    href={href}
    aria-current={activeSection === href ? "location" : undefined}
  >{label}</a>);

  return <header ref={headerRef} className={styles.header}>
    <div className={`${styles.shell} ${styles.navbar}`}>
      {brand}
      <nav className={styles.desktopNav} aria-label="Main navigation">{links}</nav>
      <div className={styles.navActions}><Link href="/sign-in" className={styles.signIn}>Sign in</Link><Link href="/sign-up" className={styles.navCta}>Get started <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      <button ref={menuButtonRef} type="button" className={styles.menuButton} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="landing-mobile-menu" onClick={() => setMenuOpen((open) => !open)}>
        {menuOpen ? <X size={27} aria-hidden="true" /> : <Menu size={29} aria-hidden="true" />}
      </button>
    </div>
    <nav id="landing-mobile-menu" className={styles.mobileNav} aria-label="Mobile navigation" hidden={!menuOpen}>
      {navigation.map(({ href, label }) => <a key={href} href={href} aria-current={activeSection === href ? "location" : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}
      <div className={styles.mobileAuth}>
        <Link href="/sign-in" className={styles.signIn} onClick={() => setMenuOpen(false)}>Sign in</Link>
        <Link href="/sign-up" className={styles.navCta} onClick={() => setMenuOpen(false)}>Get started <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </div>
    </nav>
  </header>;
}
