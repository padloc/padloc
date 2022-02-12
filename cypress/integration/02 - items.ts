const testItem = {
    name: "Google",
    username: "example@google.com",
    password: "somethingsecret",
    url: "https://google.com",
};

const itemSearch = {
    existing: "secret",
    nonexistent: "apple",
};

describe("Items", () => {
    it("can create an item without errors", () => {
        cy.login();

        // Click plus sign
        cy.get("pl-app").find("pl-items").find("pl-items-list").find("pl-button:eq(2)").click();

        // Click create
        cy.get("pl-app").find("pl-create-item-dialog").find("footer pl-button.primary").click();

        cy.url().should("include", "/items/");
        cy.url().should("include", "/new");

        // Give the app some time to finish animations
        cy.wait(500);

        // Fill in form
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-item-view")
            .find("pl-input#nameInput")
            .find("input")
            .type(testItem.name, { force: true });
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-item-view")
            .find("pl-scroller pl-list pl-field:eq(0)")
            .find("pl-input.value-input")
            .find("input.input-element")
            .type(testItem.username, { force: true });
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-item-view")
            .find("pl-scroller pl-list pl-field:eq(1)")
            .find("pl-input.value-input")
            .find("input.input-element")
            .type(testItem.password, { force: true });
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-item-view")
            .find("pl-scroller pl-list pl-field:eq(2)")
            .find("pl-input.value-input")
            .find("input.input-element")
            .type(testItem.url, { force: true });

        // Click save
        cy.get("pl-app").find("pl-items").find("pl-item-view").find("pl-button.primary").click();

        cy.url().should("include", "/items/");
        cy.url().should("not.include", "/new");
    });

    it("can find an an item without errors", () => {
        cy.unlock();

        // Click search sign
        cy.get("pl-app").find("pl-items").find("pl-items-list").find("pl-button:eq(3)").click();

        // Give the app some time to finish animations
        cy.wait(100);

        // Find Item
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-items-list")
            .find("pl-input#filterInput")
            .find("input")
            .type(itemSearch.existing, { force: true });

        // Confirm we only find one
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-items-list")
            .find("main pl-virtual-list pl-scroller")
            .find("div.content")
            .children("div")
            .should("have.length", 1);

        // Confirm we find the right one
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-items-list")
            .find("main pl-virtual-list pl-scroller")
            .find("div.content pl-vault-item-list-item")
            .find("div > div > div.semibold")
            .should("include.text", testItem.name);

        // Click clear search sign
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-items-list")
            .find("pl-input#filterInput")
            .find("pl-button.slim")
            .click();

        // Click search sign
        cy.get("pl-app").find("pl-items").find("pl-items-list").find("pl-button:eq(3)").click();

        // Find non-existent Item
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-items-list")
            .find("pl-input#filterInput")
            .find("input")
            .type(itemSearch.nonexistent, { force: true });

        // Confirm we find none
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-items-list")
            .find("main pl-virtual-list pl-scroller")
            .find("div.content")
            .children("div")
            .should("have.length", 0);

        cy.get("pl-app")
            .find("pl-items")
            .find("pl-items-list")
            .find("main > div.centering")
            .should("contain.text", "did not match any items");
    });
});
