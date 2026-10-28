
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:3000/api/auth/signin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to sign in.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080B14] px-4 py-10 text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-violet-600/10 blur-[110px]" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          <span className="text-lg text-blue-400">←</span>
          Back to GitHub Explorer
        </Link>

        <div className="rounded-3xl border border-white/[0.09] bg-[#101522]/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-9">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-bold text-blue-300">
              G
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
              Welcome back
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Sign in
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Sign in to continue exploring the GitHub community.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full rounded-xl border border-white/10 bg-[#090D17] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  disabled
                  title="Password recovery will be available when implemented"
                  className="text-xs text-blue-400 opacity-60"
                >
                  Forgot password?
                </button>
              </div>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="h-12 w-full rounded-xl border border-white/10 bg-[#090D17] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && (
                <span className="ml-2" aria-hidden="true">
                  →
                </span>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-xs text-slate-500">New here?</span>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <Link
            href="/sign-up"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-200 transition hover:border-blue-400/30 hover:bg-blue-500/[0.06]"
          >
            Create an account
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Track connections. Discover developers.
        </p>
      </div>
    </main>
  );
}
