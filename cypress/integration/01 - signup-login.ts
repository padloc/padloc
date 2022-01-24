describe("Signup/Login", () => {
    it("can signup without errors", () => {
        cy.signup();
    });

    it("can login without errors", () => {
        cy.login();
    });
});
