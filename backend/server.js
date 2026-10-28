
import "dotenv/config";
import express from "express";
import { z } from "zod";
import cors from "cors";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pool from "./db.js";

const app = express();

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(
    cors({
        origin: "http://localhost:3001",
        credentials: true,
    })
);

app.use(express.json({ limit: "10kb" }));

// --------------------------------------------------
// PostgreSQL-backed sessions
// --------------------------------------------------

const PgSession = connectPgSimple(session);

app.use(
    session({
        store: new PgSession({
            pool,
            tableName: "user_sessions",
            createTableIfMissing: true,
        }),
        name: "github_tracker.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false, // Local HTTP development only
            sameSite: "lax",
            path: "/",
            maxAge: 1000 * 60 * 60 * 24 * 7,
        },
    })
);

// --------------------------------------------------
// Existing GitHub cache configuration
// --------------------------------------------------

const cache = new Map();
const inFlightRequests = new Map();

const CACHE_TTL = 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const MAX_CONCURRENT_REQUESTS = 5;

// --------------------------------------------------
// Validation schemas
// --------------------------------------------------

const usernameSchema = z
    .string()
    .min(1, "Username is required")
    .max(39, "Username cannot exceed 39 characters")
    .regex(
        /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
        "Invalid GitHub username"
    )
    .refine(
        (username) => !username.includes("--"),
        "Username cannot contain consecutive hyphens"
    );

const paginationSchema = z.object({
    page: z.coerce
        .number()
        .int("Page must be an integer")
        .min(1, "Page must be at least 1"),

    limit: z.coerce
        .number()
        .int("Limit must be an integer")
        .min(1, "Limit must be at least 1")
        .max(100, "Limit cannot exceed 100"),
});

const signupSchema = z.object({
    fullName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72),
});

const signinSchema = z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(1).max(72),
});

// --------------------------------------------------
// Authentication helpers
// --------------------------------------------------

function publicUser(user) {
    return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
    };
}

function createUserSession(req, userId) {
    return new Promise((resolve, reject) => {
        // Regenerate the session ID to help prevent session fixation.
        req.session.regenerate((error) => {
            if (error) {
                return reject(error);
            }

            req.session.userId = userId;

            req.session.save((saveError) => {
                if (saveError) {
                    return reject(saveError);
                }

                resolve();
            });
        });
    });
}

function destroyUserSession(req) {
    return new Promise((resolve, reject) => {
        req.session.destroy((error) => {
            if (error) {
                return reject(error);
            }

            resolve();
        });
    });
}

// --------------------------------------------------
// Authentication middleware
// --------------------------------------------------

function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            error: "Authentication required. Please sign in.",
        });
    }

    next();
}

// --------------------------------------------------
// Authentication endpoints
// --------------------------------------------------

// Register a new user and sign them in.
app.post("/api/auth/signup", async (req, res) => {
    const validation = signupSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            error: "Invalid signup details",
            details: validation.error.issues.map(
                (issue) => issue.message
            ),
        });
    }

    const fullName = validation.data.fullName;
    const email = validation.data.email.toLowerCase();
    const password = validation.data.password;

    try {
        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (full_name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, full_name, email`,
            [fullName, email, passwordHash]
        );

        const user = result.rows[0];

        await createUserSession(req, user.id);

        return res.status(201).json({
            message: "Account created successfully",
            user: publicUser(user),
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                error: "An account with this email already exists",
            });
        }

        console.error("Signup error:", error.message);

        return res.status(500).json({
            error: "Unable to create account",
        });
    }
});

// Sign in an existing user.
app.post("/api/auth/signin", async (req, res) => {
    const validation = signinSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            error: "Invalid email or password",
        });
    }

    const email = validation.data.email.toLowerCase();
    const password = validation.data.password;

    try {
        const result = await pool.query(
            `SELECT id, full_name, email, password_hash
             FROM users
             WHERE email = $1`,
            [email]
        );

        const user = result.rows[0];

        // Use the same response for an unknown email and wrong password.
        if (
            !user ||
            !(await bcrypt.compare(password, user.password_hash))
        ) {
            return res.status(401).json({
                error: "Invalid email or password",
            });
        }

        await createUserSession(req, user.id);

        return res.json({
            message: "Signed in successfully",
            user: publicUser(user),
        });
    } catch (error) {
        console.error("Signin error:", error.message);

        return res.status(500).json({
            error: "Unable to sign in",
        });
    }
});

// Return the currently signed-in user.
app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
        return res.json({
            authenticated: false,
            user: null,
        });
    }

    try {
        const result = await pool.query(
            `SELECT id, full_name, email
             FROM users
             WHERE id = $1`,
            [req.session.userId]
        );

        const user = result.rows[0];

        if (!user) {
            await destroyUserSession(req);

            res.clearCookie("github_tracker.sid", {
                path: "/",
                sameSite: "lax",
            });

            return res.json({
                authenticated: false,
                user: null,
            });
        }

        return res.json({
            authenticated: true,
            user: publicUser(user),
        });
    } catch (error) {
        console.error("Current user error:", error.message);

        return res.status(500).json({
            error: "Unable to check authentication",
        });
    }
});

// Sign out and invalidate the session.
app.post("/api/auth/signout", async (req, res) => {
    try {
        if (req.session) {
            await destroyUserSession(req);
        }

        res.clearCookie("github_tracker.sid", {
            path: "/",
            sameSite: "lax",
        });

        return res.json({
            message: "Signed out successfully",
        });
    } catch (error) {
        console.error("Signout error:", error.message);

        return res.status(500).json({
            error: "Unable to sign out",
        });
    }
});

// --------------------------------------------------
// Existing cache helpers — preserved
// --------------------------------------------------

function getCache(key) {
    const item = cache.get(key);

    if (!item) {
        return null;
    }

    if (Date.now() >= item.expiresAt) {
        cache.delete(key);
        return null;
    }

    return item.value;
}

function setCache(key, value) {
    const now = Date.now();

    for (const [cacheKey, item] of cache.entries()) {
        if (now >= item.expiresAt) {
            cache.delete(cacheKey);
        }
    }

    if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = cache.keys().next().value;

        if (oldestKey !== undefined) {
            cache.delete(oldestKey);
        }
    }

    cache.set(key, {
        value,
        expiresAt: now + CACHE_TTL,
    });
}

async function getOrFetch(key, fetchFunction) {
    const cachedData = getCache(key);

    if (cachedData !== null) {
        console.log("Cache HIT:", key);
        return cachedData;
    }

    const existingRequest = inFlightRequests.get(key);

    if (existingRequest) {
        console.log("Request IN-FLIGHT:", key);
        return await existingRequest;
    }

    console.log("Cache MISS:", key);

    const requestPromise = (async () => {
        try {
            const data = await fetchFunction();

            setCache(key, data);

            return data;
        } finally {
            inFlightRequests.delete(key);
        }
    })();

    inFlightRequests.set(key, requestPromise);

    return await requestPromise;
}

async function mapWithConcurrency(items, limit, asyncCallback) {
    const results = [];

    for (let i = 0; i < items.length; i += limit) {
        const batch = items.slice(i, i + limit);
        const batchResults = await Promise.all(
            batch.map(asyncCallback)
        );

        results.push(...batchResults);
    }

    return results;
}

async function logGitHubError(response, context) {
    const errorBody = await response.text();

    console.error(`${context} - GitHub status:`, response.status);
    console.error(`${context} - GitHub response:`, errorBody);
    console.error(
        `${context} - Rate limit remaining:`,
        response.headers.get("x-ratelimit-remaining")
    );
    console.error(
        `${context} - Rate limit reset:`,
        response.headers.get("x-ratelimit-reset")
    );
}

// --------------------------------------------------
// Root endpoint — preserved
// --------------------------------------------------

app.get("/", (req, res) => {
    res.send("GitHub Follower Tracker API is running!");
});

// --------------------------------------------------
// GitHub profile endpoint — preserved
// --------------------------------------------------

app.get("/api/github/:username", requireAuth, async (req, res) => {
    try {
        const usernameResult = usernameSchema.safeParse(
            req.params.username
        );

        if (!usernameResult.success) {
            return res.status(400).json({
                error: "Invalid GitHub username",
                details: usernameResult.error.issues.map(
                    (issue) => issue.message
                ),
            });
        }

        const username = usernameResult.data;

        const response = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}`
        );

        if (!response.ok) {
            await logGitHubError(response, "GitHub user request");

            return res.status(response.status).json({
                error: "Failed to fetch GitHub user",
            });
        }

        const data = await response.json();

        return res.json({
            username: data.login,
            totalFollowers: data.followers,
        });
    } catch (error) {
        console.error("GitHub API error:", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

// --------------------------------------------------
// Paginated GitHub followers endpoint — preserved
// --------------------------------------------------

app.get(
    "/api/github/:username/followers",
    requireAuth,
    async (req, res) => {
    try {
        const usernameResult = usernameSchema.safeParse(
            req.params.username
        );

        if (!usernameResult.success) {
            return res.status(400).json({
                error: "Invalid GitHub username",
                details: usernameResult.error.issues.map(
                    (issue) => issue.message
                ),
            });
        }

        const username = usernameResult.data;

        const paginationResult = paginationSchema.safeParse({
            page: req.query.page ?? 1,
            limit: req.query.limit ?? 5,
        });

        if (!paginationResult.success) {
            return res.status(400).json({
                error: "Invalid pagination parameters",
                details: paginationResult.error.issues.map(
                    (issue) => issue.message
                ),
            });
        }

        const { page, limit } = paginationResult.data;

        const cacheKey =
            `followers:${username.toLowerCase()}:page:${page}:limit:${limit}`;

        const result = await getOrFetch(cacheKey, async () => {
            const response = await fetch(
                `https://api.github.com/users/${encodeURIComponent(username)}/followers?page=${page}&per_page=${limit}`
            );

            if (!response.ok) {
                await logGitHubError(
                    response,
                    "GitHub followers-list request"
                );

                const error = new Error(
                    "Failed to fetch GitHub followers"
                );
                error.status = response.status;
                throw error;
            }

            const followers = await response.json();

            const detailedFollowers = await mapWithConcurrency(
                followers,
                MAX_CONCURRENT_REQUESTS,
                async (follower) => {
                    const userResponse = await fetch(
                        `https://api.github.com/users/${encodeURIComponent(follower.login)}`
                    );

                    if (!userResponse.ok) {
                        await logGitHubError(
                            userResponse,
                            `GitHub profile request for ${follower.login}`
                        );

                        const error = new Error(
                            `Failed to fetch profile for ${follower.login}`
                        );
                        error.status = userResponse.status;
                        throw error;
                    }

                    const userData = await userResponse.json();

                    return {
                        username: userData.login,
                        followersCount: userData.followers,
                        profileUrl: userData.html_url,
                    };
                }
            );

            return {
                username,
                page,
                limit,
                data: detailedFollowers,
            };
        });

        return res.json(result);
    } catch (error) {
        console.error("GitHub followers API error:", error);

        if (error.status) {
            return res.status(error.status).json({
                error: error.message,
            });
        }

        return res.status(500).json({
            error: "Failed to fetch follower details",
        });
    }
});

export default app;
