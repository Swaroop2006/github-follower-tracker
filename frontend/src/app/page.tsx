"use client";

import { useState } from "react";
import Link from "next/link";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main
      id="home"
      className="relative min-h-screen overflow-hidden bg-black text-white"
    >
      {/* Full-screen background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Dark overlays keep text readable */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/20 to-black/80" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
        {/* Navigation */}
        <header className="flex items-center justify-between gap-4 py-6 sm:py-8">
          <Link
            href="/"
            aria-label="GitHub Follower Tracker home"
            className="flex shrink-0 items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white">
              <span className="h-4 w-4 rounded-full bg-white" />
            </span>

            <span className="text-lg font-semibold tracking-tight sm:text-xl">
              GitHub<span className="text-white/60">Tracker</span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 rounded-full border border-gray-700/80 bg-black/30 p-1.5 backdrop-blur-md lg:flex"
          >
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}

            <a
              href="#contact"
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Contact
              <span aria-hidden="true">↗</span>
            </a>
          </nav>

          {/* Desktop authentication links */}
          <div className="hidden items-center gap-4 lg:flex">
            <Link
              href="/sign-in"
              className="text-sm text-white/80 transition hover:text-white"
            >
              Sign in
            </Link>

            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Get started
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? (
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </header>

        {/* Mobile navigation */}
        {menuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="mb-5 rounded-2xl border border-white/15 bg-black/85 p-3 shadow-xl backdrop-blur-xl lg:hidden"
          >
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}

            <a
              href="#contact"
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Contact
            </a>

            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
              <Link
                href="/sign-in"
                className="rounded-full border border-white/20 px-4 py-3 text-center text-sm transition hover:bg-white/10"
              >
                Sign in
              </Link>

              <Link
                href="/sign-up"
                className="rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-gray-200"
              >
                Get started →
              </Link>
            </div>
          </nav>
        )}

     {/* Centered introductory text */}
<section className="flex justify-center py-8 text-center sm:py-10">
  <div className="mx-auto max-w-2xl">
    <p className="text-sm leading-7 text-white/80 sm:text-base sm:leading-8">
      Discover the people behind GitHub profiles. Explore developer
      communities, understand follower statistics, and find interesting
      connections — all in one place.
    </p>

    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
      Your next discovery
    </h2>

    <p className="mt-1 text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
      Thousands of developer profiles to explore.
    </p>
  </div>
</section>

        {/* Hero content */}
        <section className="flex flex-col items-center justify-center py-8 text-center sm:py-10 lg:py-12">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-4 py-2 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(100,206,251,0.8)]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/80 sm:text-xs sm:tracking-[0.2em]">
              Explore the world of GitHub
            </span>
          </div>

          <h1 className="text-5xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-6xl md:text-7xl lg:text-8xl xl:text-8xl">
            <span className="block text-white">Discover</span>
            <span className="shiny-heading mt-2 block pb-2">
              Developer
              <br />
              Connections.
            </span>
          </h1>

          <p className="mt-7 max-w-xl px-2 text-sm leading-7 text-white/75 sm:mt-9 sm:text-base sm:leading-8">
            Search any public GitHub username, explore their followers, and
            discover the developers building your favorite communities.
          </p>

          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:mt-10 sm:w-auto sm:flex-row">
            <Link
              href="/sign-up"
              className="group inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition duration-200 hover:bg-gray-200 sm:w-auto sm:px-8 sm:py-4"
            >
              Start exploring GitHub
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M5 12h14m-6-6 6 6-6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <Link
              href="/sign-in"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/30 bg-black/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto sm:px-8 sm:py-4"
            >
              Sign in to your account
            </Link>
          </div>

          <p className="mt-5 text-xs text-white/55">
            Simple. Fast. Built for discovering developers.
          </p>
        </section>

        {/* Features */}
        <section
          id="features"
          className="grid gap-4 border-t border-white/15 py-8 sm:grid-cols-3 sm:py-10"
        >
          <article className="rounded-2xl border border-white/15 bg-black/25 p-5 backdrop-blur-md transition hover:bg-black/40">
            <p className="text-xs uppercase tracking-[0.16em] text-sky-200">
              01 / Search
            </p>
            <h2 className="mt-3 text-lg font-semibold">Find any profile</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Look up public GitHub accounts by username.
            </p>
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5 backdrop-blur-md transition hover:bg-black/40">
            <p className="text-xs uppercase tracking-[0.16em] text-sky-200">
              02 / Discover
            </p>
            <h2 className="mt-3 text-lg font-semibold">Explore followers</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Browse follower usernames and their follower counts.
            </p>
          </article>

          <article
            id="how-it-works"
            className="rounded-2xl border border-white/15 bg-black/25 p-5 backdrop-blur-md transition hover:bg-black/40"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-sky-200">
              03 / Navigate
            </p>
            <h2 className="mt-3 text-lg font-semibold">Browse page by page</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Explore results with pagination and revisit cached data faster.
            </p>
          </article>
        </section>

        {/* Footer */}
        <footer
          id="contact"
          className="flex flex-col items-center justify-between gap-3 border-t border-white/15 py-6 text-center text-xs text-white/55 sm:flex-row sm:text-left"
        >
          <p>© {new Date().getFullYear()} GitHub Follower Tracker</p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-white"
          >
            Explore GitHub ↗
          </a>
        </footer>
      </div>
    </main>
  );
}
