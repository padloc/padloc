Cypress.Commands.add("clearIndexedDb", () => {
    cy.window().then((_window) => {
        return new Promise((resolve) => {
            _window.indexedDB.databases().then((dbs) => {
                dbs.forEach((db) => {
                    _window.indexedDB.deleteDatabase(db.name);
                });
                resolve(null);
            });
        });
    });
});

Cypress.Commands.add("signup", () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();

    cy.visit("/");

    const { email, emailToken, password } = Cypress.env();

    cy.get("pl-app").find("pl-start").find("pl-login-signup").find("pl-input#emailInput").find("input").type(email);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-button#submitEmailButton")
        .click({ force: true });

    cy.get("pl-app")
        .find("pl-prompt-dialog")
        .find("pl-input")
        .find("input[placeholder='Enter Verification Code']")
        .type(emailToken, { force: true });

    // Confirm token
    cy.get("pl-app").find("pl-prompt-dialog").find("pl-button#confirmButton").find("button").click({ force: true });

    // Enter name
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(2)")
        .find("pl-input")
        .find("input")
        .type("The Dude", { force: true });

    // Accept TOS
    cy.get("pl-app").find("pl-start").find("pl-login-signup").find("pl-drawer:eq(2)").find("input#tosCheckbox").click();

    // Continue
    cy.get("pl-app").find("pl-start").find("pl-login-signup").find("pl-button:eq(2)").click({ force: true });

    // Choose a different password
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(5)")
        .find("pl-button:eq(1)")
        .click({ force: true });

    // Choose my own
    cy.get("pl-app").find("pl-alert-dialog").find("pl-button:eq(2)").find("button").click({ force: true });

    // Type master password
    cy.get("pl-app")
        .find("pl-prompt-dialog")
        .find("pl-input[label='Enter Master Password']")
        .find("input")
        .type(password, { force: true });

    // Confirm master password
    cy.get("pl-app").find("pl-prompt-dialog").find("pl-button#confirmButton").find("button").click({ force: true });

    // Give the app some time to render the alert, otherwise it sometimes shows out of place
    cy.wait(100);

    // Confirm weak password
    cy.get("pl-app").find("pl-alert-dialog").find("pl-button:eq(1)").find("button").click({ force: true });

    // Continue signup
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(5)")
        .find("pl-button:eq(3)")
        .click({ force: true });

    // Repeat master password
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(6)")
        .find("pl-password-input#repeatPasswordInput")
        .find("input[type='password']")
        .type(password, { force: true });

    // Continue signup
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(6)")
        .find("pl-button#confirmPasswordButton")
        .click({ force: true });

    // Wait for success
    cy.url({ timeout: 20000 }).should("include", "/signup/success");

    // Done!
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(7)")
        .find("pl-button")
        .click({ force: true });

    cy.url().should("include", "/items");
});

Cypress.Commands.add("login", () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();

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
        .type(emailToken, { force: true });

    cy.get("pl-app").find("pl-prompt-dialog").find("pl-button#confirmButton").find("button").click({ force: true });

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-unlock")
        .find("pl-password-input#passwordInput")
        .find("input[type='password']")
        .type(password);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-unlock")
        .find("pl-button#unlockButton")
        .find("button")
        .click({ force: true });

    // TODO: "Trust device"

    cy.url().should("include", "/items");
});

Cypress.Commands.add("lock", () => {
    cy.visit("/");

    // Open menu
    cy.get("pl-app")
        .find("pl-items")
        .find("pl-items-list")
        .find("pl-button.menu-button:eq(0)")
        .find("button")
        .click({ force: true });

    // Click lock
    cy.get("pl-app").find("pl-menu").find("pl-button.menu-footer-button:eq(0)").find("button").click({ force: true });

    cy.url().should("include", "/unlock");
});

Cypress.Commands.add("unlock", () => {
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
        .type(password);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-unlock")
        .find("pl-button#unlockButton")
        .find("button")
        .click({ force: true });

    cy.url().should("include", "/items");
});
