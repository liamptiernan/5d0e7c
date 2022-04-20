/// <reference types="cypress" />

const ringo = {
  username: "Ringo",
  email: "ringo@example.com",
  password: "Z6#6%xfLTarZ9U",
};
const george = {
  username: "George",
  email: "george@example.com",
  password: "L%e$xZHC4QKP@F",
};

describe("Read Status", () => {
  it("setup", () => {
    cy.signup(ringo.username, ringo.email, ringo.password);
    cy.logout();
    cy.signup(george.username, george.email, george.password);
    cy.logout();
  });

  it("displays total unread", () => {
    cy.login(ringo.username, ringo.password);

    cy.get("input[name=search]").type("George");
    cy.contains("George").click();

    cy.get("input[name=text]").type("First message{enter}");
    cy.wait(500)
    cy.get("input[name=text]").type("Second message{enter}");
    cy.wait(500)
    cy.get("input[name=text]").type("Third message{enter}");

    cy.logout();

    cy.login(george.username, george.password);
    cy.contains("3");
    cy.logout();
  });

  it("displays last read message", () => {
    cy.login(george.username, george.password);
    cy.contains("Ringo").click();
    cy.logout();

    cy.login(ringo.username, ringo.password);
    cy.contains("George").click();
    
    cy.get("svg").should(($list) => {
      expect($list).to.have.length(6)
    })

    cy.logout();
  });
});
