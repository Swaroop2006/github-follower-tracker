"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type GitHubUser = {
  username: string;
  totalFollowers: number;
};

type GitHubFollower = {
  username: string;
  followersCount: number;
  profileUrl: string;
};

type FollowersResponse = {
  username: string;
  page: number;
  limit: number;
  data: GitHubFollower[];
};

type ApiError = {
  message?: string;
  error?: string;
};

const API_BASE_URL = "http://localhost:3000/api/github";
const FOLLOWERS_PER_PAGE = 5;

export default function Home() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAuthentication() {
      try {
        const response = await fetch("http://localhost:3000/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        const data: { authenticated?: boolean } = await response.json();

        if (!response.ok || data.authenticated !== true) {
          router.replace("/sign-in");
          return;
        }

        if (active) {
          setIsAuthenticated(true);
        }
      } catch {
        router.replace("/sign-in");
      } finally {
        if (active) {
          setAuthChecking(false);
        }
      }
    }

    void checkAuthentication();

    return () => {
      active = false;
    };
  }, [router]);

  const [username, setUsername] = useState("");
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [error, setError] = useState("");

  const [searchRequest, setSearchRequest] = useState<{
    username: string;
    id: number;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  // Existing profile query and caching behavior are preserved.
  const profileQuery = useQuery<GitHubUser, Error>({
    queryKey: ["githubProfile", searchRequest?.username],
    enabled: searchRequest !== null,
    queryFn: async () => {
      if (!searchRequest) {
        throw new Error("Please enter a GitHub username.");
      }

      const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(searchRequest.username)}`,
        { credentials: "include" }
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        const apiError = data as ApiError;
        throw new Error(
          apiError.message ||
            apiError.error ||
            "Unable to fetch GitHub user."
        );
      }

      return data as GitHubUser;
    },
  });

  // Existing follower query, pagination, and caching are preserved.
  const followersQuery = useQuery<FollowersResponse, Error>({
    queryKey: [
      "githubFollowers",
      user?.username,
      currentPage,
      FOLLOWERS_PER_PAGE,
    ],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) {
        throw new Error("Please search for a GitHub user first.");
      }

      const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(
          user.username
        )}/followers?page=${currentPage}&limit=${FOLLOWERS_PER_PAGE}`,
        { credentials: "include" }
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        const apiError = data as ApiError;
        throw new Error(
          apiError.message ||
            apiError.error ||
            "Unable to fetch followers."
        );
      }

      return data as FollowersResponse;
    },
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!profileQuery.data) return;

    setUser(profileQuery.data);
    setUsername(profileQuery.data.username);
    setCurrentPage(1);
  }, [profileQuery.data]);

  function handleSearch(): void {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError("Please enter a GitHub username.");
      setUser(null);
      setCurrentPage(1);
      setSearchRequest(null);
      return;
    }

    setError("");
    setUser(null);
    setCurrentPage(1);

    setSearchRequest({
      username: trimmedUsername,
      id: Date.now(),
    });
  }

  function handlePreviousPage(): void {
    if (currentPage > 1 && !followersQuery.isFetching) {
      setCurrentPage((page) => page - 1);
    }
  }

  function handleNextPage(): void {
    const currentFollowers = followersQuery.data?.data ?? [];
    const hasNext = currentFollowers.length === FOLLOWERS_PER_PAGE;

    if (hasNext && !followersQuery.isFetching) {
      setCurrentPage((page) => page + 1);
    }
  }

  const followers = followersQuery.data?.data ?? [];
  const hasNextPage = followers.length === FOLLOWERS_PER_PAGE;

  const isSearching = profileQuery.isFetching;

  if (authChecking || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080B14] text-slate-100">
        <p className="text-sm text-slate-400" role="status">
          Checking authentication...
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080B14] text-slate-100 selection:bg-blue-500/30">
      {/* Ambient background lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute right-[-10rem] top-[35rem] h-80 w-80 rounded-full bg-violet-600/[0.08] blur-[110px]" />
        <div className="absolute bottom-0 left-[-10rem] h-80 w-80 rounded-full bg-cyan-600/[0.06] blur-[110px]" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8">
        {/* Header */}
        <header className="relative mb-10 pt-12 text-center sm:mb-14 sm:pt-0">
          <button
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              setSignOutError("");

              try {
                const response = await fetch(
                  "http://localhost:3000/api/auth/signout",
                  {
                    method: "POST",
                    credentials: "include",
                  }
                );

                if (!response.ok) {
                  throw new Error("Unable to sign out. Please try again.");
                }

                router.push("/");
                router.refresh();
              } catch (err) {
                setSignOutError(
                  err instanceof Error
                    ? err.message
                    : "Something went wrong while signing out."
                );
                setSigningOut(false);
              }
            }}
            className="absolute right-0 top-0 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-red-400/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
          >
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>

          {signOutError && (
            <p className="mb-4 text-sm text-red-400" role="alert">
              {signOutError}
            </p>
          )}

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/[0.07] px-3.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200 sm:text-xs">
              GitHub Explorer
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            GitHub
            <span className="mt-1 block bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent sm:mt-2">
              Follower Tracker
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl px-2 text-sm leading-6 text-slate-400 sm:mt-5 sm:text-base sm:leading-7">
            Explore GitHub profiles, discover their communities, and browse
            follower statistics in one place.
          </p>
        </header>

        {/* Search card */}
        <section className="rounded-2xl border border-white/[0.09] bg-[#101522]/90 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:rounded-3xl sm:p-7 lg:p-8">
          <div className="mb-5 flex items-start gap-3 sm:mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" strokeLinecap="round" />
              </svg>
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white sm:text-lg">
                Find a GitHub profile
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                Enter a public GitHub username to get started.
              </p>
            </div>
          </div>

          <label
            htmlFor="username"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            GitHub username
          </label>

          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch();
            }}
          >
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                @
              </span>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. torvalds"
                autoComplete="off"
                spellCheck={false}
                className="h-12 w-full rounded-xl border border-white/10 bg-[#090D17] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10 sm:h-14 sm:text-base"
              />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition duration-200 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:w-auto sm:min-w-44 sm:text-base"
            >
              {isSearching ? (
                <>
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeOpacity=".25"
                      strokeWidth="3"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  Search GitHub
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M5 12h14m-6-6 6 6-6 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Profile search errors */}
        {(error || profileQuery.error) && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-400/20 bg-red-500/[0.08] p-4 text-sm leading-6 text-red-300"
          >
            <span className="font-semibold">Something went wrong: </span>
            {error || profileQuery.error?.message}
          </div>
        )}

        {/* Profile summary */}
        {user && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101522]/90 shadow-xl shadow-black/10 backdrop-blur-xl sm:mt-8 sm:rounded-3xl">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

            <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-7 lg:p-8">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    GitHub profile
                  </p>
                </div>

                <h2 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {user.username}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Public GitHub account
                </p>

                <a
                  href={`https://github.com/${encodeURIComponent(user.username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
                >
                  View GitHub profile
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M14 4h6v6m-10 4L20 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"
                      strokeLinecap="round"
                    />
                  </svg>
                </a>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-blue-400/15 bg-gradient-to-br from-blue-500/[0.12] to-indigo-500/[0.06] p-5 sm:min-w-52 sm:p-6">
                <div
                  aria-hidden="true"
                  className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl"
                />
                <p className="relative text-sm font-medium text-slate-400">
                  Total followers
                </p>
                <p className="relative mt-2 break-all text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {user.totalFollowers.toLocaleString()}
                </p>
                <p className="relative mt-2 text-xs text-blue-300">
                  GitHub community
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Followers */}
        {user && (
          <section className="mt-6 rounded-2xl border border-white/[0.09] bg-[#101522]/90 p-4 shadow-xl shadow-black/10 backdrop-blur-xl sm:mt-8 sm:rounded-3xl sm:p-7 lg:p-8">
            <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-center sm:justify-between sm:pb-6">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <circle cx="9" cy="8" r="3.5" />
                    <path
                      d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20"
                      strokeLinecap="round"
                    />
                    <path
                      d="M16 5a3.5 3.5 0 0 1 0 6.8M18 14.5a4.5 4.5 0 0 1 3 4.2V20"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Follower explorer
                  </p>
                  <h2 className="mt-1 break-words text-lg font-bold text-white sm:text-xl">
                    Followers of {user.username}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    Browse followers and their follower counts.
                  </p>
                </div>
              </div>

              <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Page {currentPage}
              </span>
            </div>

            {followersQuery.isFetching && (
              <div
                role="status"
                className="mt-5 flex items-center gap-3 rounded-xl border border-blue-400/10 bg-blue-500/[0.05] px-4 py-3 text-sm text-blue-300"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeOpacity=".25"
                    strokeWidth="3"
                  />
                  <path
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Loading followers...
              </div>
            )}

            {followersQuery.error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-400/20 bg-red-500/[0.08] p-4 text-sm leading-6 text-red-300"
              >
                {followersQuery.error.message}
              </div>
            )}

            {!followersQuery.isFetching &&
              !followersQuery.error &&
              followers.length === 0 && (
                <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-300">
                    No followers found on this page.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Try another GitHub profile.
                  </p>
                </div>
              )}

            {followers.length > 0 && (
              <div className="mt-5 space-y-3">
                {followers.map((follower, index) => (
                  <article
                    key={follower.username}
                    className="group flex min-w-0 flex-col gap-3 rounded-xl border border-white/[0.07] bg-[#0B0F1A] p-4 transition duration-200 hover:border-blue-400/25 hover:bg-[#111827] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-slate-300 transition group-hover:border-blue-400/20 group-hover:text-blue-300">
                        {String((currentPage - 1) * FOLLOWERS_PER_PAGE + index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0">
                        <a
                          href={follower.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block break-all text-sm font-semibold text-slate-100 transition hover:text-blue-300 sm:text-base"
                        >
                          {follower.username}
                        </a>

                        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                          {follower.followersCount.toLocaleString()} followers
                        </p>
                      </div>
                    </div>

                    <a
                      href={follower.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-blue-400/25 hover:bg-blue-500/[0.08] hover:text-blue-300 sm:min-h-9 sm:shrink-0 sm:justify-start"
                    >
                      View profile
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-3.5 w-3.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          d="M7 17 17 7M8 7h9v9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  </article>
                ))}
              </div>
            )}

            {/* Responsive pagination */}
            <div className="mt-6 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-5 sm:mt-7 sm:pt-6">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || followersQuery.isFetching}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-11 sm:gap-2 sm:px-5 sm:text-sm"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="m15 18-6-6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Previous
              </button>

              <span
                aria-current="page"
                className="shrink-0 rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-400 sm:px-4 sm:text-sm"
              >
                Page <span className="font-semibold text-white">{currentPage}</span>
              </span>

              <button
                onClick={handleNextPage}
                disabled={!hasNextPage || followersQuery.isFetching}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-11 sm:gap-2 sm:px-5 sm:text-sm"
              >
                Next
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="m9 18 6-6-6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </section>
        )}

        {/* Feature cards */}
        <section className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2">
          <article className="group rounded-2xl border border-white/[0.08] bg-[#101522]/70 p-5 transition duration-200 hover:border-blue-400/20 hover:bg-[#101522] sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/[0.08] text-blue-300">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <circle cx="12" cy="8" r="4" />
                <path
                  d="M4 21a8 8 0 0 1 16 0"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Profile lookup
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              User information
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              View a GitHub user&apos;s profile and total follower count.
            </p>
          </article>

          <article className="group rounded-2xl border border-white/[0.08] bg-[#101522]/70 p-5 transition duration-200 hover:border-violet-400/20 hover:bg-[#101522] sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/[0.08] text-violet-300">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <circle cx="9" cy="8" r="3.5" />
                <path
                  d="M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h4a4.5 4.5 0 0 1 4.5 4.5V20"
                  strokeLinecap="round"
                />
                <path
                  d="M16 5a3.5 3.5 0 0 1 0 6.8M18 14.5a4.5 4.5 0 0 1 3.5 4.5V20"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Follower explorer
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Browse followers
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Explore follower profiles, follower counts, and paginated results.
            </p>
          </article>
        </section>

       {/* Footer */}
<footer className="mt-10 border-t border-white/[0.06] pt-6 text-center sm:mt-12">
  <p className="font-medium text-slate-300">
    Track connections{" "}
    <span className="font-medium text-slate-300">
      Discover developers
    </span>
  </p>

  <p className="mt-2 text-[11px] text-slate-600">
    Explore the community behind every GitHub profile.
  </p>
</footer>
      </div>
    </main>
  );
}
