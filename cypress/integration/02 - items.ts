const testItem = {
    name: "Google",
    username: "example@google.com",
    password: "somethingsecret",
    url: "https://google.com",
};

describe("Items", () => {
    it("can create an item without errors", () => {
        cy.login();

        // Click plus sign
        cy.get("pl-app").find("pl-items").find("pl-items-list").find("pl-button:eq(2)").click({ force: true });

        // Give the app some time to render the animations
        cy.wait(100);

        // Click create
        cy.get("pl-app").find("pl-create-item-dialog").find("footer pl-button.primary").click({ force: true });

        cy.url().should("include", "/items/");
        cy.url().should("include", "/new");

        // Give the app some (more) time to render the animations
        cy.wait(100);

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
            .find("pl-scroller")
            .find("pl-list")
            .find("pl-field:eq(0)")
            .find("pl-input.value-input")
            .find("input.input-element")
            .type(testItem.username, { force: true });
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-item-view")
            .find("pl-scroller")
            .find("pl-list")
            .find("pl-field:eq(1)")
            .find("pl-input.value-input")
            .find("input.input-element")
            .type(testItem.password, { force: true });
        cy.get("pl-app")
            .find("pl-items")
            .find("pl-item-view")
            .find("pl-scroller")
            .find("pl-list")
            .find("pl-field:eq(2)")
            .find("pl-input.value-input")
            .find("input.input-element")
            .type(testItem.url, { force: true });

        // Click save
        cy.get("pl-app").find("pl-items").find("pl-item-view").find("pl-button.primary").click({ force: true });

        cy.url().should("include", "/items/");
        cy.url().should("not.include", "/new");
    });
});
