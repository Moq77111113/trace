Feature: Assignment notifications

  Scenario: The new assignee receives a notification
    Given a ticket exists in status "Open"
    When I assign the ticket to "Bob"
    Then "Bob" receives a notification mentioning the ticket title

  Scenario: Reassignment notifies the new assignee, not the previous one
    Given a ticket is assigned to "Bob"
    When I reassign the ticket to "Carol"
    Then "Carol" receives an assignment notification
    And "Bob" does not receive an assignment notification

  Scenario: Self-assignment does not send a notification
    Given I am signed in as "Bob"
    When I assign a ticket to myself
    Then I do not receive a notification
