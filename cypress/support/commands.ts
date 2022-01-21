Cypress.Commands.add("signup", () => {
    cy.visit("/");

    const { email, password } = Cypress.env();

    cy.get("pl-app").find("pl-start").find("pl-login-signup").find("pl-input#emailInput").find("input").type(email);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-button#submitEmailButton")
        .find("button")
        .click({ force: true });

    // TODO: get/force verification code

    // TODO: Click submit

    // TODO: Force defining a password
});

Cypress.Commands.add("login", () => {
    cy.visit("/");

    // TODO: Write this
});
