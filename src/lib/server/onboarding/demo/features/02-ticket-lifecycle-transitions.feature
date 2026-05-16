Feature: Ticket status transitions

  Scenario: Assigning an open ticket moves it to "In Progress"
    Given a ticket exists in status "Open"
    When I assign it to "Bob"
    Then its status is "In Progress"
    And its assignee is "Bob"

  Scenario: A ticket cannot be closed without a resolution
    Given a ticket exists in status "In Review"
    When I close the ticket with no resolution selected
    Then the action is rejected with "resolution is required"
    And the ticket stays in status "In Review"

  Scenario: A closed ticket can be reopened with a comment
    Given a ticket is in status "Closed" with resolution "Fixed"
    When I reopen the ticket with the comment "regression on Safari 18"
    Then its status is "Open"
    And the reopen comment is recorded in its history
