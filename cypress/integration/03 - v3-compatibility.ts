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

describe("v3 compatibility", () => {
    it("can signup without errors", () => {
        cy.v3_signup();
    });

    it("can login without errors", () => {
        cy.v3_login();
    });

    it("can lock/unlock without errors", () => {
        cy.v3_login();

        cy.v3_lock();

        cy.v3_unlock();
    });

    it("can create an item without errors", () => {
        cy.v3_login();

        // Click plus sign
        cy.get("pl-app").find("pl-items-list").find("pl-icon[icon='add']").click();

        // Click create
        cy.get("pl-app").find("pl-create-item-dialog").find(".footer button.primary").click();

        cy.url().should("match", /\/items\/[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}/);

        // Give the app some time to finish animations
        cy.wait(300);

        // Fill in form
        cy.get("pl-app")
            .find("pl-item-dialog")
            .find("pl-input#nameInput")
            .find("input")
            .type(v3_testItem.name, { force: true });

        cy.get("pl-app")
            .find("pl-item-dialog")
            .find("pl-field.item:eq(0)")
            .find("pl-input.value-input")
            .find("input.input-element")
            .type(v3_testItem.username, { force: true });

        cy.get("pl-app")
            .find("pl-item-dialog")
            .find("pl-field.item:eq(1)")
            .find("pl-input.value-input")
            .find("input.input-element")
            .type(v3_testItem.password, { force: true });

        cy.get("pl-app")
            .find("pl-item-dialog")
            .find("pl-field.item:eq(2)")
            .find("pl-input.value-input")
            .find("input.input-element")
            .type(v3_testItem.url, { force: true });

        // Click save
        cy.get("pl-app").find("pl-item-dialog").find("button.primary.save-button").click();

        // Close dialog
        cy.get("pl-app").find("pl-item-dialog").find("pl-icon[icon='close']").click();

        cy.url().should("include", "/items");
        cy.url().should(
            "not.match",
            /\/items\/[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}/
        );
    });

    it("can find an an item without errors", () => {
        cy.v3_unlock();

        // Click search sign
        cy.get("pl-app").find("pl-items-list").find("header pl-icon[icon='search']").click();

        // Give the app some time to finish animations
        cy.wait(100);

        // Find Item
        cy.get("pl-app")
            .find("pl-items-list")
            .find("pl-input#filterInput")
            .find("input")
            .type(v3_itemSearch.existing, { force: true });

        // Confirm we only find one
        cy.get("pl-app")
            .find("pl-items-list")
            .find("#main pl-virtual-list div.content")
            .children(".cell")
            .should("have.length", 1);

        // Confirm we find the right one
        cy.get("pl-app")
            .find("pl-items-list")
            .find("#main pl-virtual-list div.content .cell .item-header .item-name")
            .should("include.text", v3_testItem.name);

        // Click clear search sign
        cy.get("pl-app").find("pl-items-list").find("header pl-icon[icon='cancel']").click();

        // Click search sign
        cy.get("pl-app").find("pl-items-list").find("header pl-icon[icon='search']").click();

        // Find non-existent Item
        cy.get("pl-app")
            .find("pl-items-list")
            .find("pl-input#filterInput")
            .find("input")
            .type(v3_itemSearch.nonexistent, { force: true });

        // Confirm we find none
        cy.get("pl-app")
            .find("pl-items-list")
            .find("#main pl-virtual-list div.content")
            .children(".cell")
            .should("have.length", 0);

        cy.get("pl-app")
            .find("pl-items-list")
            .find(".empty-placeholder")
            .should("contain.text", "did not match any items");
    });
});
