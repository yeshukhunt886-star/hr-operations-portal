import request from "supertest";

const BASE_URL =
    "http://127.0.0.1:3001";


describe("Message API", () => {

    let userId;
    let accessToken;
    let refreshToken;


    // REGISTER AND LOGIN USER

    beforeAll(async () => {
        const timestamp = Date.now();
        const email =`messageuser${timestamp}@gmail.com`;
        const password ="123456";

        
        // REGISTER

        const registerResponse =
            await request(BASE_URL)
                .post("/api/auth/register")
                .send({
                    username:`messageuser${timestamp}`,
                    email:email,
                    password:password
                });


        console.log(
            "Message Test Register:",
            registerResponse.body
        );


        expect(
            registerResponse.statusCode
        ).toBe(201);


        userId =
            registerResponse.body.user.id;

        // LOGIN

        const loginResponse =
            await request(BASE_URL)
                .post("/api/auth/login")
                .send({
                    email:email,
                    password:password
                });


        console.log("Message Test Login:",
            loginResponse.body
        );

        expect(loginResponse.statusCode
        ).toBe(200);


        accessToken =
            loginResponse.body.accessToken;


        refreshToken =
            loginResponse.body.refreshToken;


        expect(
            accessToken
        ).toBeDefined();


        expect(
            refreshToken
        ).toBeDefined();

    });

    // INVALID TOKEN
    test(
        "Invalid token should be rejected",
        async () => {

            const response =
                await request(BASE_URL)
                    .get(`/api/messages/private/${userId}`)
                    .set(
                        "Authorization",
                        "Bearer invalid-token"
                    );


            console.log(
                "Invalid Token Response:",
                response.statusCode,
                response.body
            );


            expect(
                response.statusCode
            ).toBe(401);

        }
    );

    // GET PRIVATE MESSAGE HISTORY

    test(
        "Get private message history",
        async () => {

            const response =
                await request(BASE_URL)
                    .get(
                        `/api/messages/private/${userId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${accessToken}`
                    );

            console.log(
                "Private Message History:",
                response.statusCode,
                response.body
            );

            expect(
                [200, 404]
            ).toContain(
                response.statusCode
            );
        }
    );


});