const v3_testItem = {
    name: "Google",
    username: "example@google.com",
    password: "somethingsecret",
    url: "https://google.com",
};

const v3_itemSearch = {
    existing: "secret",
    nonexistent: "apple",
};

const v3_email = `${Math.floor(Math.random() * 1e8)}@example.com`;

describe("v3 compatibility", () => {
    it("can signup without errors", () => {
        cy.v3_signup(v3_email);
    });

    it("can login without errors", () => {
        cy.v3_login(v3_email);
    });

    it("can lock/unlock without errors", () => {
        cy.v3_login(v3_email);

        cy.v3_lock();

        cy.v3_unlock(v3_email);
    });

    it("can create an item without errors", () => {
        cy.v3_login(v3_email);

        // Click plus sign
        cy.doWithin(["pl-app", "pl-items-list"], () => cy.get("pl-icon[icon='add']").click());

        // Click create
        cy.doWithin(["pl-app", "pl-create-item-dialog"], () => cy.get(".footer button.primary").click());

        cy.url().should("match", /\/items\/[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}/);

        cy.doWithin(["pl-app", "pl-item-dialog"], () => {
            // Apparently there is some race condition that results in
            // only part of the name being typed if we're too fast
            cy.wait(100);

            // Fill in form
            cy.typeWithin("pl-input#nameInput", v3_testItem.name, { force: true });

            cy.doWithin(["pl-field.item:eq(0)"], () =>
                cy.typeWithin("pl-input.value-input", v3_testItem.username, { force: true })
            );

            cy.doWithin(["pl-field.item:eq(1)"], () =>
                cy.typeWithin("pl-input.value-input", v3_testItem.password, { force: true })
            );

            cy.doWithin(["pl-field.item:eq(2)"], () =>
                cy.typeWithin("pl-input.value-input", v3_testItem.url, { force: true })
            );

            // Click save
            cy.get("button.primary.save-button").click();

            // Close dialog
            cy.get("pl-icon[icon='close']").click();
        });

        cy.url().should("include", "/items");
        cy.url().should(
            "not.match",
            /\/items\/[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}/
        );
    });

    it("can find an an item without errors", () => {
        cy.v3_unlock(v3_email);

        cy.doWithin(["pl-app", "pl-items-list"], () => {
            // Click search sign
            cy.get("header pl-icon[icon='search']").click();

            // Find Item
            cy.typeWithin("pl-input#filterInput", v3_itemSearch.existing, { force: true });

            // Confirm we only find one
            cy.get("#main pl-virtual-list div.content").children(".cell").should("have.length", 1);

            // Confirm we find the right one
            cy.get("#main pl-virtual-list div.content .cell .item-header .item-name").should(
                "include.text",
                v3_testItem.name
            );

            // Click clear search sign
            cy.get("header pl-icon[icon='cancel']").click();

            // Click search sign
            cy.get("header pl-icon[icon='search']").click();

            // Find non-existent Item
            cy.typeWithin("pl-input#filterInput", v3_itemSearch.nonexistent, { force: true });

            // Confirm we find none
            cy.get("#main pl-virtual-list div.content").children(".cell").should("have.length", 0);

            cy.get(".empty-placeholder").should("contain.text", "did not match any items");
        });
    });
});
