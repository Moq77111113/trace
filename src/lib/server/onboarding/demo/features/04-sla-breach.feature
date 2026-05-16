Feature: SLA breach detection

  Scenario: A "Normal" priority ticket breaches SLA after 5 business days untouched
    Given a "Normal" priority ticket was opened 6 business days ago
    And nobody has updated it since
    When the SLA check runs
    Then the ticket is flagged "SLA breached"
    And the team lead receives an escalation notification

  Scenario: Comments reset the inactivity clock
    Given a "Normal" priority ticket was opened 4 business days ago
    And someone commented on it 1 business day ago
    When the SLA check runs
    Then the ticket is not flagged
