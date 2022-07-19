describe("Signup/Login", () => {
    const email = `${Math.floor(Math.random() * 1e8)}@example.com`;

    it("can signup without errors", () => {
        cy.signup(email);
    });

    it("can login without errors", () => {
        cy.login(email);
    });

    it("can lock/unlock without errors", () => {
        cy.login(email);

        cy.lock();

        cy.unlock(email);
    });
});
