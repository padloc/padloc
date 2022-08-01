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

Cypress.Commands.add("doWithin", ([first, ...rest]: string[], fn: () => void, delay: number = 0) => {
    cy.wait(delay);
    cy.get(first).within(() => {
        if (rest.length) {
            cy.doWithin(rest, fn);
        } else {
            fn();
        }
    });
});

Cypress.Commands.add("typeWithin", (selector, text, options) => {
    cy.get(selector).within(() => cy.get("input, textarea").type(text, options));
});

Cypress.Commands.add("signup", (email: string) => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.clearEmails();

    cy.visit("/");

    const { password, name } = Cypress.env();

    cy.doWithin(["pl-app", "pl-start", "pl-login-signup"], () => {
        cy.typeWithin("pl-input#emailInput", email);
        cy.get("pl-button#submitEmailButton").click({ force: true });
    });

    cy.doWithin(
        ["pl-app", "pl-prompt-dialog"],
        () => {
            cy.getCodeFromEmail()
                .should("not.be.null")
                .then((code) => {
                    cy.typeWithin("pl-input", code, { force: true });

                    cy.get("pl-button#confirmButton").click({ force: true });
                });
        },
        200
    );

    // Wait for the authentication request to be completed
    cy.url().should("include", "authToken");

    cy.doWithin(["pl-app", "pl-start", "pl-login-signup"], () => {
        // Enter name
        cy.typeWithin("pl-drawer:eq(2) pl-input", name, { force: true });

        // Accept TOS
        cy.get("pl-drawer:eq(2) input#tosCheckbox").click({ force: true });

        // Continue
        cy.get("pl-button:eq(2)").click({ force: true });

        // Choose a different password
        cy.get("pl-drawer:eq(5) pl-button:eq(1)").click({ force: true });
    });

    // Choose my own
    cy.doWithin(["pl-app", "pl-alert-dialog"], () => cy.get("pl-button:eq(2)").click({ force: true }), 200);

    // Type master password
    cy.doWithin(
        ["pl-app", "pl-prompt-dialog"],
        () => {
            cy.typeWithin("pl-input[label='Enter Master Password']", password, { force: true });
            cy.get("pl-button#confirmButton").click({ force: true });
        },
        200
    );

    // Confirm weak password
    cy.doWithin(["pl-app", "pl-alert-dialog"], () => cy.get("pl-button:eq(1)").click({ force: true }), 200);

    cy.doWithin(["pl-app", "pl-start", "pl-login-signup"], () => {
        // Continue signup
        cy.get("pl-drawer:eq(5) pl-button:eq(3)").click({ force: true });

        // Repeat master password
        cy.typeWithin("pl-drawer:eq(6) pl-password-input#repeatPasswordInput", password, { force: true });

        // Continue signup
        cy.get("pl-drawer:eq(6) pl-button#confirmPasswordButton").click({ force: true });

        // Wait for success
        cy.url({ timeout: 10000 }).should("include", "/signup/success");

        // Done!
        cy.get("pl-drawer:eq(7) pl-button").click({ force: true });
    });

    cy.url().should("include", "/items");
});

Cypress.Commands.add("login", (email: string) => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.clearEmails();

    cy.visit("/");

    const { password } = Cypress.env();

    cy.doWithin(["pl-app", "pl-start", "pl-login-signup"], () => {
        cy.get("pl-input#emailInput").find("input").type(email);

        cy.get("pl-button#submitEmailButton").click({ force: true });
    });

    cy.doWithin(
        ["pl-app", "pl-prompt-dialog"],
        () => {
            cy.getCodeFromEmail()
                .should("not.be.null")
                .then((code) => cy.typeWithin("pl-input", code, { force: true }));

            cy.get("pl-button#confirmButton").click({ force: true });
        },
        200
    );

    // Wait for the authentication request to be completed
    cy.url().should("include", "authToken");

    cy.doWithin(["pl-app", "pl-start", "pl-login-signup"], () => {
        cy.typeWithin("pl-drawer:eq(3) pl-password-input#loginPasswordInput", password, { force: true });

        cy.get("pl-drawer:eq(3) pl-button#loginButton").click({ force: true });
    });

    cy.doWithin(
        ["pl-app", "pl-alert-dialog"],
        () => {
            // Add trusted device
            cy.get("pl-button:eq(0)").click({ force: true });
        },
        200
    );

    cy.url({ timeout: 10000 }).should("include", "/items");
});

Cypress.Commands.add("lock", () => {
    cy.visit("/");

    // Open menu
    cy.doWithin(["pl-app", "pl-items", "pl-items-list"], () => {
        cy.get("pl-button.menu-button:eq(0)").click({ force: true });
    });

    // Click lock
    cy.doWithin(["pl-app", "pl-menu"], () => cy.get("pl-button.menu-footer-button:eq(0)").click({ force: true }));

    cy.url().should("include", "/unlock");
});

Cypress.Commands.add("unlock", (email: string) => {
    cy.visit("/");

    const { password } = Cypress.env();

    cy.doWithin(
        ["pl-app", "pl-start", "pl-unlock"],
        () => {
            cy.get("pl-input[label='Logged In As']").find("input").should("have.value", email);

            cy.typeWithin("pl-password-input#passwordInput", password, { force: true });

            cy.get("pl-button#unlockButton").click({ force: true });
        },
        1000
    );

    cy.url().should("include", "/items");
});

Cypress.Commands.add("v3_signup", (email: string) => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.clearEmails();

    const { password, v3_url, name } = Cypress.env();

    cy.visit(`${v3_url}/`);

    cy.doWithin(["pl-app", "pl-start", "pl-login"], () => cy.get("button.signup").click());

    cy.url().should("include", "/signup");

    cy.doWithin(["pl-app", "pl-start", "pl-signup"], () => {
        cy.typeWithin("pl-input#emailInput", email, { force: true });

        cy.typeWithin("pl-input#nameInput", name, { force: true });

        cy.get("pl-loading-button#submitEmailButton").click({ force: true });

        cy.getCodeFromEmail()
            .should("not.be.null")
            .then((code) => cy.typeWithin("pl-input#codeInput", code, { force: true }));

        cy.get("pl-loading-button#verifyEmailButton").click({ force: true });

        // Choose a different password
        cy.get("div.wrapper:eq(2) div.password-actions button:eq(1)").click({ force: true });
    });

    // Choose my own
    cy.doWithin(["pl-app", "pl-alert-dialog"], () => cy.get("button:eq(2)").click({ force: true }), 200);

    // Type master password
    cy.doWithin(["pl-app", "pl-prompt-dialog"], () => {
        cy.typeWithin("pl-input.tap", password, { force: true });

        // Confirm master password
        cy.get("pl-loading-button#confirmButton").click({ force: true });
    });

    // Confirm weak password
    cy.doWithin(["pl-app", "pl-alert-dialog"], () => cy.get("button:eq(1)").click({ force: true }), 200);

    cy.doWithin(["pl-app", "pl-start", "pl-signup"], () => {
        // Repeat master password
        cy.typeWithin("div.wrapper:eq(2) pl-password-input#repeatPasswordInput", password, { force: true });

        // Continue signup
        cy.get("pl-loading-button#submitPasswordButton").click({ force: true });
    });

    cy.url({ timeout: 10000 }).should("include", "/items");
});

Cypress.Commands.add("v3_login", (email: string) => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.clearEmails();

    const { password, v3_url } = Cypress.env();

    // This is required because the email validation requirement on login throws an error in the console, and without it, Cypress will halt
    cy.on("uncaught:exception", (error) => {
        // @ts-ignore this exists
        if (error.code === "email_verification_required") {
            return false;
        }
    });

    cy.visit(`${v3_url}/`);

    cy.doWithin(["pl-app", "pl-start", "pl-login"], () => {
        cy.typeWithin("pl-input#emailInput", email);

        cy.get("pl-password-input#passwordInput").find("input[type='password']").type(password, { force: true });

        cy.get("pl-loading-button#loginButton").click({ force: true });
    });

    cy.doWithin(
        ["pl-app", "pl-prompt-dialog"],
        () => {
            cy.getCodeFromEmail().then((code) => cy.typeWithin("pl-input.tap", code, { force: true }));
            cy.get("pl-loading-button#confirmButton").click({ force: true });
        },
        200
    );

    cy.url().should("include", "/items");
});

Cypress.Commands.add("v3_lock", () => {
    const { v3_url } = Cypress.env();

    cy.visit(`${v3_url}/`);

    // Click lock
    cy.doWithin(["pl-app", "pl-menu"], () => cy.get("pl-icon[icon='lock'].tap").click({ force: true }));

    cy.url({ timeout: 10000 }).should("include", "/unlock");
});

Cypress.Commands.add("v3_unlock", (email: string) => {
    const { v3_url, password } = Cypress.env();

    cy.visit(`${v3_url}/`);

    cy.doWithin(["pl-app", "pl-start", "pl-unlock"], () => {
        cy.get("pl-input[readonly]").find("input").should("have.value", email);

        cy.typeWithin("pl-password-input#passwordInput", password, { force: true });

        cy.get("pl-loading-button#unlockButton").click({ force: true });
    });

    cy.url({ timeout: 10000 }).should("include", "/items");
});
