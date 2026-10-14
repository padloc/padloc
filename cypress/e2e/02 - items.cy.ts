const testItem = {
    name: "Google.com",
    username: "example.user@google.com",
    password: "somethingsecret",
    url: "https://accounts.google.com",
};

const itemSearch = {
    existing: "secret",
    nonexistent: "apple",
};

const email = `${Math.floor(Math.random() * 1e8)}@example.com`;

describe("Items", () => {
    it("can create an item without errors", () => {
        cy.signup(email);

        // Click plus sign
        cy.doWithin(["pl-app", "pl-items", "pl-items-list"], () => cy.get("pl-button:eq(2)").click());

        // Click create
        cy.doWithin(["pl-app", "pl-create-item-dialog"], () => cy.get("footer pl-button.primary").click(), 100);

        cy.url().should("include", "/items/");
        cy.url().should("include", "/new");

        cy.doWithin(
            ["pl-app", "pl-items", "pl-item-view"],
            () => {
                // Fill in form
                cy.typeWithin("pl-input#nameInput", testItem.name, { force: true });
                cy.doWithin(["pl-scroller pl-list pl-field:eq(0)"], () =>
                    cy.typeWithin("pl-input.value-input", testItem.username, { force: true })
                );
                cy.doWithin(["pl-scroller pl-list pl-field:eq(1)"], () =>
                    cy.typeWithin("pl-input.value-input", testItem.password, { force: true })
                );
                cy.doWithin(["pl-scroller pl-list pl-field:eq(2)"], () =>
                    cy.typeWithin("pl-input.value-input", testItem.url, { force: true })
                );

                // Click save
                cy.get("pl-button.primary").click();
            },
            500
        );

        cy.url().should("include", "/items/");
        cy.url().should("not.include", "/new");

        // Saving changes the route before vault persistence and synchronization
        // finish. Complete that work before the next test reloads the app.
        cy.window().then((window) => window.app.synchronize());
    });

    it("can find an an item without errors", () => {
        cy.unlock(email);

        cy.doWithin(["pl-app", "pl-items", "pl-items-list"], () => {
            // Click search sign
            cy.get("pl-button:eq(3)").click();

            // Find Item
            cy.typeWithin("pl-input#filterInput", itemSearch.existing, { force: true });

            // Confirm we only find one
            cy.get("main pl-virtual-list pl-scroller div.content").children("div").should("have.length", 1);

            // Confirm we find the right one
            cy.get("main pl-virtual-list pl-scroller")
                .find("div.content pl-vault-item-list-item")
                .find("div > div > div.semibold")
                .should("include.text", testItem.name);

            // Search punctuation literally in names, usernames and subdomain URLs.
            for (const query of ["Google.com", "example.user", "accounts.google.com", ".", "GOOGLE.COM example.user"]) {
                cy.doWithin(["pl-input#filterInput"], () => {
                    cy.get("input").clear({ force: true }).type(query, { force: true });
                });
                cy.get("main pl-virtual-list pl-scroller div.content").children("div").should("have.length", 1);
            }

            // A dot must not act as a wildcard.
            cy.doWithin(["pl-input#filterInput"], () => {
                cy.get("input").clear({ force: true }).type("GoogleXcom", { force: true });
            });
            cy.get("main > div.centering").should("contain.text", "did not match any items");

            // Click clear search sign
            cy.get("pl-input#filterInput pl-button.slim").click();

            // Click search sign
            cy.get("pl-button:eq(3)").click();

            // Find non-existent Item
            cy.typeWithin("pl-input#filterInput", itemSearch.nonexistent, { force: true });

            // Confirm we find none
            // cy.get("main pl-virtual-list pl-scroller div.content").children("div").should("have.length", 0);

            cy.get("main > div.centering").should("contain.text", "did not match any items");
        });
    });
});
