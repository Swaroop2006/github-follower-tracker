
import {
    describe,
    it,
    expect,
    vi,
    afterEach,
    beforeAll,
    afterAll
} from "vitest";
import request from "supertest";
import app from "./server.js";
import pool from "./db.js";

describe("GitHub Follower Tracker API", () => {
    let authenticatedRequest;
    let testEmail;

    // Create a test account and keep its authenticated session.
    beforeAll(async () => {
        authenticatedRequest = request.agent(app);
        testEmail = `test-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}@example.com`;

        const response = await authenticatedRequest
            .post("/api/auth/signup")
            .send({
                fullName: "Test User",
                email: testEmail,
                password: "TestPassword123"
            });

        expect(response.status).toBe(201);

        const signinResponse = await authenticatedRequest
    .post("/api/auth/signin")
    .send({
        email: testEmail,
        password: "TestPassword123"
    });

expect(signinResponse.status).toBe(200);
    });

    // Sign out and remove the temporary test account.
    afterAll(async () => {
        try {
            if (authenticatedRequest) {
                await authenticatedRequest
                    .post("/api/auth/signout");
            }
        } finally {
            if (testEmail) {
                await pool.query(
                    "DELETE FROM users WHERE email = $1",
                    [testEmail]
                );
            }
        }
    });

    // Clean up mocked globals after each test.
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("should return the API running message", async () => {
        const response = await request(app).get("/");

        expect(response.status).toBe(200);
        expect(response.text).toBe(
            "GitHub Follower Tracker API is running!"
        );
    });

    it("should reject an invalid GitHub username", async () => {
        const response = await authenticatedRequest
            .get("/api/github/invalid--name");

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "Invalid GitHub username"
        );
    });

    it("should reject an invalid page number", async () => {
        const response = await authenticatedRequest
            .get("/api/github/torvalds/followers?page=0&limit=5");

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "Invalid pagination parameters"
        );
    });

    it("should reject a limit greater than 100", async () => {
        const response = await authenticatedRequest
            .get("/api/github/torvalds/followers?page=1&limit=101");

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "Invalid pagination parameters"
        );
    });

    it("should reject a GitHub username longer than 39 characters", async () => {
        const username = "a".repeat(40);

        const response = await authenticatedRequest
            .get(`/api/github/${username}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "Invalid GitHub username"
        );
    });

    it("should reject a non-integer page number", async () => {
        const response = await authenticatedRequest
            .get("/api/github/torvalds/followers?page=abc&limit=5");

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "Invalid pagination parameters"
        );
    });

    // Test a successful GitHub user information response.
    it("should return GitHub user information successfully", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    login: "torvalds",
                    followers: 250
                })
            })
        );

        const response = await authenticatedRequest
            .get("/api/github/torvalds");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            username: "torvalds",
            totalFollowers: 250
        });
    });

    it("should return followers successfully", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [
                        {
                            login: "test-follower",
                            html_url: "https://github.com/test-follower"
                        }
                    ]
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        login: "test-follower",
                        followers: 123,
                        html_url: "https://github.com/test-follower"
                    })
                })
        );

        const response = await authenticatedRequest
            .get("/api/github/torvalds/followers?page=1&limit=1");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            username: "torvalds",
            page: 1,
            limit: 1,
            data: [
                {
                    username: "test-follower",
                    followersCount: 123,
                    profileUrl: "https://github.com/test-follower"
                }
            ]
        });
    });

    it("should handle GitHub API errors when fetching followers", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                text: async () => "API rate limit exceeded",
                headers: {
                    get: () => "0"
                }
            })
        );

        const response = await authenticatedRequest
            .get("/api/github/torvalds/followers?page=2&limit=1");

        expect(response.status).toBe(403);
        expect(response.body).toEqual({
            error: "Failed to fetch GitHub followers"
        });
    });

    it("should handle errors when fetching an individual follower profile", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [
                        { login: "test-follower" }
                    ]
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 404,
                    text: async () => "Not Found",
                    headers: {
                        get: () => null
                    }
                })
        );

        const response = await authenticatedRequest
            .get("/api/github/torvalds/followers?page=3&limit=1");

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            error: "Failed to fetch profile for test-follower"
        });
    });

    it("should reuse cached follower data for repeated requests", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { login: "cache-test-user" }
                ]
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    login: "cache-test-user",
                    followers: 50,
                    html_url: "https://github.com/cache-test-user"
                })
            });

        vi.stubGlobal("fetch", fetchMock);

        const url =
            "/api/github/cache-test-owner/followers?page=1&limit=1";

        const firstResponse = await authenticatedRequest.get(url);
        const secondResponse = await authenticatedRequest.get(url);

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);
        expect(secondResponse.body).toEqual(firstResponse.body);

        // Two GitHub requests on the first call;
        // the second API request should use the cache.
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should fetch fresh follower data after the cache expires", async () => {
        // Fake Date only so the session/database timers keep working.
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        try {
            const fetchMock = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [
                        { login: "expiry-test-user" }
                    ]
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        login: "expiry-test-user",
                        followers: 50,
                        html_url: "https://github.com/expiry-test-user"
                    })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [
                        { login: "expiry-test-user" }
                    ]
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        login: "expiry-test-user",
                        followers: 75,
                        html_url: "https://github.com/expiry-test-user"
                    })
                });

            vi.stubGlobal("fetch", fetchMock);

            const url =
                "/api/github/expiry-test-owner/followers?page=1&limit=1";

            const firstResponse = await authenticatedRequest.get(url);

            expect(firstResponse.status).toBe(200);
            expect(firstResponse.body.data[0].followersCount).toBe(50);
            expect(fetchMock).toHaveBeenCalledTimes(2);

            // Move the clock forward by 61 seconds.
            vi.setSystemTime(
                new Date(Date.now() + 61 * 1000)
            );

            const secondResponse = await authenticatedRequest.get(url);

            expect(secondResponse.status).toBe(200);
            expect(secondResponse.body.data[0].followersCount).toBe(75);
            expect(fetchMock).toHaveBeenCalledTimes(4);
        } finally {
            vi.useRealTimers();
        }
    });
});
