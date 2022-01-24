Cypress.Commands.add("signup", () => {
    cy.visit("/");

    const { email, emailToken, password } = Cypress.env();

    cy.get("pl-app").find("pl-start").find("pl-login-signup").find("pl-input#emailInput").find("input").type(email);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-button#submitEmailButton")
        .find("button")
        .click({ force: true });

    cy.get("pl-app")
        .find("pl-prompt-dialog")
        .find("pl-input")
        .find("input[placeholder='Enter Verification Code']")
        .type(emailToken);

    // Confirm token
    cy.get("pl-app").find("pl-prompt-dialog").find("pl-button#confirmButton").find("button").click({ force: true });

    // Choose a different password
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(3)")
        .find("pl-button:eq(1)")
        .find("button")
        .click({ force: true });

    // Choose my own
    cy.get("pl-app").find("pl-alert-dialog").find("pl-button:eq(2)").find("button").click({ force: true });

    // Type master password
    cy.get("pl-app")
        .find("pl-prompt-dialog")
        .find("pl-input[label='Enter Master Password']")
        .find("input")
        .type(password);

    // Confirm master password
    cy.get("pl-app").find("pl-prompt-dialog").find("pl-button#confirmButton").find("button").click({ force: true });

    // Confirm weak password
    cy.get("pl-app").find("pl-alert-dialog").find("pl-button:eq(1)").find("button").click({ force: true });

    // Continue signup
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(3)")
        .find("pl-button:eq(3)")
        .find("button")
        .click({ force: true });

    // Repeat master password
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(4)")
        .find("pl-password-input#repeatPasswordInput")
        .find("input[type='password']")
        .type(password, { force: true });

    // Continue signup
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(4)")
        .find("pl-button#confirmPasswordButton")
        .find("button")
        .click({ force: true });

    cy.url().should("include", "/items");
});

Cypress.Commands.add("login", () => {
    cy.visit("/");

    const { email, password } = Cypress.env();

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-unlock")
        .find("pl-input[label='Logged In As']")
        .find("input")
        .should("have.value", email);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-unlock")
        .find("pl-password-input#passwordInput")
        .find("input[type='password']")
        .type(password, { force: true });

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-unlock")
        .find("pl-button#unlockButton")
        .find("button")
        .click({ force: true });

    cy.url().should("include", "/items");
});
