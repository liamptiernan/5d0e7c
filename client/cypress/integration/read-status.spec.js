/// <reference types="cypress" />

const alice = {
  username: "Alice",
  email: "alice@example.com",
  password: "Z6#6%xfLTarZ9U",
};
const bob = {
  username: "Bob",
  email: "bob@example.com",
  password: "L%e$xZHC4QKP@F",
};

describe("Read Status", () => {
  it("setup", () => {
    cy.signup(alice.username, alice.email, alice.password);
    cy.logout();
    cy.signup(bob.username, bob.email, bob.password);
    cy.logout();
  });

  it("displays total unread", () => {
    cy.login(alice.username, alice.password);

    cy.get("input[name=search]").type("Bob");
    cy.contains("Bob").click();

    cy.get("input[name=text]").type("First message{enter}");
    cy.get("input[name=text]").type("Second message{enter}");
    cy.get("input[name=text]").type("Third message{enter}");

    cy.logout();

    cy.login(bob.username, bob.password);
    cy.contains("3");
    cy.logout();
  });

  it("displays last read message", () => {
    cy.login(bob.username, bob.password);
    cy.contains("Alice").click();
    cy.logout();

    cy.login(alice.username, alice.password);
    cy.contains("Bob").click();
    
    cy.get("svg").should(($list) => {
      expect($list).to.have.length(6)
    })

    cy.logout();
  });
});
