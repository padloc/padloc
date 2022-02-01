describe("Signup/Login", () => {
    it("can signup without errors", () => {
        cy.signup();
    });

    it("can login without errors", () => {
        cy.login();
    });

    it("can lock/unlock without errors", () => {
        cy.login();

        cy.lock();

        cy.unlock();
    });
});
