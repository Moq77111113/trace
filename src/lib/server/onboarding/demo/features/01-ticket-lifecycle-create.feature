Feature: Creating a ticket

  Scenario: A new ticket starts in "Open" with the reporter recorded
    Given I am signed in as "Alice"
    When I create a ticket titled "Login button does nothing on Safari"
    Then the ticket is created in status "Open"
    And the reporter is "Alice"

  Scenario: A ticket cannot be created without a title
    Given I am signed in
    When I submit the new-ticket form with an empty title
    Then the form is rejected with "title is required"
    And no ticket is created

  Scenario: A ticket inherits the default priority "Normal" when none is specified
    Given I am signed in
    When I create a ticket without setting a priority
    Then the ticket's priority is "Normal"
