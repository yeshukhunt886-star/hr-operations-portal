
import request from "supertest";

const BASE_URL = "http://127.0.0.1:3001";

describe("Authentication API", () => {

    let accessToken;
    let refreshToken;

    const testUser = {
        username: `testuser${Date.now()}`,
        email: `test${Date.now()}@gmail.com`,
        password: "123456"
    };


    // REGISTER
    test("Register User", async () => {

        const response =
            await request(BASE_URL)
                .post("/api/auth/register")
                .send(testUser);

        expect(response.statusCode)
            .toBe(201);

        expect(response.body)
            .toHaveProperty("user");

        expect(response.body.user)
            .toHaveProperty("id");

    });


    // LOGIN
    test("Login User", async () => {

        const response =
            await request(BASE_URL)
                .post("/api/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

        console.log(
            "Login Response:",
            response.body
        );

        expect(response.statusCode)
            .toBe(200);

        expect(response.body)
            .toHaveProperty("accessToken");

        expect(response.body)
            .toHaveProperty("refreshToken");

        accessToken =
            response.body.accessToken;

        refreshToken =
            response.body.refreshToken;

    });


    // REFRESH TOKEN
    test("Refresh Access Token", async () => {

        expect(refreshToken)
            .toBeDefined();

        const response =
            await request(BASE_URL)
                .post("/api/auth/refresh")
                .send({
                    refreshToken
                });

        console.log(
            "Refresh Response:",
            response.body
        );

        expect(response.statusCode)
            .toBe(200);

        expect(response.body)
            .toHaveProperty("accessToken");

    });


    // INVALID ACCESS TOKEN
    test("Invalid Access Token", async () => {

        const response =
            await request(BASE_URL)
                .get("/api/auth/me")
                .set(
                    "Authorization",
                    "Bearer invalid-token"
                );

        expect(response.statusCode)
            .toBe(401);

    });

});

