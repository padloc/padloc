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

Cypress.Commands.add("clearEmails", () => {
    return cy.request("DELETE", "http://localhost:1080/email/all");
});

Cypress.Commands.add("getCodeFromEmail", (options: any = {}) => {
    const getCode = () => {
        return cy.request("http://localhost:1080/email").then((res) => {
            const latest = res.body.sort((a, b) => (a.time > b.time ? -1 : 1))[0];
            if (!latest) {
                return null;
            }
            const matchCode = latest.text.match(/(\d{6})/);
            return matchCode && matchCode[1];
        });
    };

    const resolveValue = () => {
        getCode().then((value) => {
            // @ts-ignore
            return cy.verifyUpcomingAssertions(value, options, {
                onRetry: resolveValue,
            });
        });
    };

    return resolveValue();
});

Cypress.Commands.add("signup", () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.clearEmails();

    cy.visit("/");

    const { email, password, name } = Cypress.env();

    cy.get("pl-app").find("pl-start").find("pl-login-signup").find("pl-input#emailInput").find("input").type(email);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-button#submitEmailButton")
        .click({ force: true });

    cy.getCodeFromEmail()
        .should("not.be.null")
        .then((code) => {
            cy.get("pl-app")
                .find("pl-prompt-dialog")
                .find("pl-input")
                .find("input[placeholder='Enter Verification Code']")
                .type(code, { force: true });
        });

    // Give the app some time to finish animations
    cy.wait(100);

    // Confirm token
    cy.get("pl-app").find("pl-prompt-dialog").find("pl-button#confirmButton").click({ force: true });

    // Give the app some time to finish animations
    cy.wait(100);

    // Enter name
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(2)")
        .find("pl-input")
        .find("input")
        .type(name, { force: true });

    // Accept TOS
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(2)")
        .find("input#tosCheckbox")
        .click({ force: true });

    // Continue
    cy.get("pl-app").find("pl-start").find("pl-login-signup").find("pl-button:eq(2)").click({ force: true });

    // Give the app some time to finish animations
    cy.wait(200);

    // Choose a different password
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(5)")
        .find("pl-button:eq(1)")
        .click({ force: true });

    // Give the app some time to finish animations
    cy.wait(200);

    // Choose my own
    cy.get("pl-app").find("pl-alert-dialog").find("pl-button:eq(2)").click({ force: true });

    // Give the app some time to finish animations
    cy.wait(200);

    // Type master password
    cy.get("pl-app")
        .find("pl-prompt-dialog")
        .find("pl-input[label='Enter Master Password']")
        .find("input")
        .type(password, { force: true });

    // Confirm master password
    cy.get("pl-app").find("pl-prompt-dialog").find("pl-button#confirmButton").click({ force: true });

    // Give the app some time to render the alert, otherwise it sometimes shows out of place
    cy.wait(200);

    // Confirm weak password
    cy.get("pl-app").find("pl-alert-dialog").find("pl-button:eq(1)").click({ force: true });

    // Give the app some time to finish animations
    cy.wait(100);

    // Continue signup
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(5)")
        .find("pl-button:eq(3)")
        .click({ force: true });

    // Give the app some time to render the animations
    cy.wait(100);

    // Repeat master password
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(6)")
        .find("pl-password-input#repeatPasswordInput")
        .find("input[type='password']")
        .type(password, { force: true });

    // Give the app some time to render the animations
    cy.wait(100);

    // Continue signup
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(6)")
        .find("pl-button#confirmPasswordButton")
        .click({ force: true });

    // Wait for success
    cy.url().should("include", "/signup/success");

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
    cy.clearEmails();

    cy.visit("/");

    const { email, password } = Cypress.env();

    cy.get("pl-app").find("pl-start").find("pl-login-signup").find("pl-input#emailInput").find("input").type(email);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-button#submitEmailButton")
        .click({ force: true });

    // Give the app some time to finish animations and email to arrive
    cy.wait(2000);

    cy.getCodeFromEmail()
        .should("not.be.null")
        .then((code) => {
            cy.get("pl-app")
                .find("pl-prompt-dialog")
                .find("pl-input")
                .find("input[placeholder='Enter Verification Code']")
                .type(code, { force: true });
        });

    cy.get("pl-app").find("pl-prompt-dialog").find("pl-button#confirmButton").click({ force: true });

    // Give the app some time to render the animations
    cy.wait(100);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(3)")
        .find("pl-password-input#loginPasswordInput")
        .find("input[type='password']")
        .type(password, { force: true });

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login-signup")
        .find("pl-drawer:eq(3)")
        .find("pl-button#loginButton")
        .click({ force: true });

    // Give the app some time to render the animations
    cy.wait(100);

    // Add trusted device
    cy.get("pl-app").find("pl-alert-dialog").find("pl-button:eq(0)").click({ force: true });

    cy.url().should("include", "/items");
});

Cypress.Commands.add("lock", () => {
    cy.visit("/");

    // Open menu
    cy.get("pl-app").find("pl-items").find("pl-items-list").find("pl-button.menu-button:eq(0)").click({ force: true });

    // Click lock
    cy.get("pl-app").find("pl-menu").find("pl-button.menu-footer-button:eq(0)").click({ force: true });

    cy.url().should("include", "/unlock");
});

Cypress.Commands.add("unlock", () => {
    cy.visit("/");

    const { email, password } = Cypress.env();

    // Give the app some time to render the animations
    cy.wait(100);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-unlock")
        .find("pl-input[label='Logged In As']")
        .find("input")
        .should("have.value", email);

    // Give the app some time to render the animations
    cy.wait(100);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-unlock")
        .find("pl-password-input#passwordInput")
        .find("input[type='password']")
        .type(password, { force: true });

    cy.get("pl-app").find("pl-start").find("pl-unlock").find("pl-button#unlockButton").click({ force: true });

    cy.url().should("include", "/items");
});

Cypress.Commands.add("v3_signup", () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.clearEmails();

    const { v3_email, password, v3_url, name } = Cypress.env();

    cy.visit(`${v3_url}/`);

    cy.get("pl-app").find("pl-start").find("pl-login").find("button.signup").click();

    // Give the app some time to finish animations
    cy.wait(100);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-signup")
        .find("pl-input#emailInput")
        .find("input")
        .type(v3_email, { force: true });

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-signup")
        .find("pl-input#nameInput")
        .find("input")
        .type(name, { force: true });

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-signup")
        .find("pl-loading-button#submitEmailButton")
        .click({ force: true });

    // Give the app some time to finish animations and email to arrive
    cy.wait(2000);

    cy.getCodeFromEmail()
        .should("not.be.null")
        .then((code) => {
            cy.get("pl-app")
                .find("pl-start")
                .find("pl-signup")
                .find("pl-input#codeInput")
                .find("input")
                .type(code, { force: true });
        });

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-signup")
        .find("pl-loading-button#verifyEmailButton")
        .click({ force: true });

    // Give the app some time to finish animations
    cy.wait(100);

    // Choose a different password
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-signup")
        .find("div.wrapper:eq(2) div.password-actions button:eq(1)")
        .click({ force: true });

    // Give the app some time to finish animations
    cy.wait(100);

    // Choose my own
    cy.get("pl-app").find("pl-alert-dialog").find("button:eq(2)").click({ force: true });

    // Give the app some time to finish animations
    cy.wait(200);

    // Type master password
    cy.get("pl-app").find("pl-prompt-dialog").find("pl-input.tap").find("input").type(password, { force: true });

    // Confirm master password
    cy.get("pl-app").find("pl-prompt-dialog").find("pl-loading-button#confirmButton").click({ force: true });

    // Give the app some time to render the alert, otherwise it sometimes shows out of place
    cy.wait(200);

    // Confirm weak password
    cy.get("pl-app").find("pl-alert-dialog").find("button:eq(1)").click({ force: true });

    // Give the app some time to finish animations
    cy.wait(100);

    // Repeat master password
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-signup")
        .find("div.wrapper:eq(2) pl-password-input#repeatPasswordInput")
        .find("input[type='password']")
        .type(password, { force: true });

    // Continue signup
    cy.get("pl-app")
        .find("pl-start")
        .find("pl-signup")
        .find("pl-loading-button#submitPasswordButton")
        .click({ force: true });

    // Give the app some time to finish animations
    cy.wait(100);

    cy.url().should("include", "/items");
});

Cypress.Commands.add("v3_login", () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.clearEmails();

    const { v3_email, emailToken, password, v3_url } = Cypress.env();

    // This is required because the email validation requirement on login throws an error in the console, and without it, Cypress will halt
    cy.on("uncaught:exception", (error) => {
        // @ts-ignore this exists
        if (error.code === "email_verification_required") {
            return false;
        }
    });

    cy.visit(`${v3_url}/`);

    cy.get("pl-app").find("pl-start").find("pl-login").find("pl-input#emailInput").find("input").type(v3_email);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-login")
        .find("pl-password-input#passwordInput")
        .find("input[type='password']")
        .type(password, { force: true });

    cy.get("pl-app").find("pl-start").find("pl-login").find("pl-loading-button#loginButton").click({ force: true });

    // Give the app some time to finish animations and email to arrive
    cy.wait(2000);

    cy.getCodeFromEmail().then((code) => {
        cy.get("pl-app")
            .find("pl-prompt-dialog")
            .find("pl-input.tap")
            .find("input[placeholder='Enter Verification Code']")
            .type(code, { force: true });
    });

    cy.get("pl-app").find("pl-prompt-dialog").find("pl-loading-button#confirmButton").click({ force: true });

    // Give the app some time to render the animations
    cy.wait(100);

    cy.url().should("include", "/items");
});

Cypress.Commands.add("v3_lock", () => {
    const { v3_url } = Cypress.env();

    cy.visit(`${v3_url}/`);

    // Click lock
    cy.get("pl-app").find("pl-menu").find("pl-icon[icon='lock'].tap").click({ force: true });

    cy.url().should("include", "/unlock");
});

Cypress.Commands.add("v3_unlock", () => {
    const { v3_url, v3_email, password } = Cypress.env();

    cy.visit(`${v3_url}/`);

    // Give the app some time to render the animations
    cy.wait(100);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-unlock")
        .find("pl-input[readonly]")
        .find("input")
        .should("have.value", v3_email);

    // Give the app some time to render the animations
    cy.wait(100);

    cy.get("pl-app")
        .find("pl-start")
        .find("pl-unlock")
        .find("pl-password-input#passwordInput")
        .find("input[type='password']")
        .type(password, { force: true });

    cy.get("pl-app").find("pl-start").find("pl-unlock").find("pl-loading-button#unlockButton").click({ force: true });

    cy.url().should("include", "/items");
});
