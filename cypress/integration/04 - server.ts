describe("Server", () => {
    const { serverUrl } = Cypress.env();

    it("can properly respond to valid and invalid requests", () => {
        cy.request({ url: `${serverUrl}/`, method: "GET", failOnStatusCode: false }).then(
            (response) => expect(response.status).to.eq(405) // method not allowed
        );

        cy.request({ url: `${serverUrl}/`, method: "PUT", failOnStatusCode: false }).then(
            (response) => expect(response.status).to.eq(405) // method not allowed
        );

        cy.request({ url: `${serverUrl}/`, method: "OPTIONS" });

        cy.request({ url: `${serverUrl}/`, method: "POST", failOnStatusCode: false }).then(
            (response) => expect(response.status).to.eq(400) // bad request (no json)
        );

        cy.request({
            url: `${serverUrl}/`,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "user@example.com" }),
        }).then((response) => {
            expect(response.status).to.eq(200);
            expect(JSON.stringify(response.body)).to.eq(
                JSON.stringify({
                    result: null,
                    error: {
                        code: "invalid_request",
                        message: "",
                    },
                    kind: "response",
                    version: "3.1.0",
                })
            );
        });

        cy.request({
            url: `${serverUrl}/`,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                method: "getAuthInfo",
                params: [],
                device: {},
                auth: {},
                kind: "request",
                version: "3.1.0",
            }),
        }).then((response) => {
            expect(response.status).to.eq(200);
            expect(JSON.stringify(response.body)).to.eq(
                JSON.stringify({
                    result: null,
                    error: { code: "invalid_session", message: "" },
                    kind: "response",
                    version: "3.1.0",
                })
            );
        });
    });
});
