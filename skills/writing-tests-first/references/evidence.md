# Evidence behind the test-first rules

Why each rule in `writing-tests-first` is shaped the way it is. These informed the rules; where a project's own decision differs, the project wins.

## The loop

**Kent Beck, "Canon TDD" (2023).** <https://tidyfirst.substack.com/p/canon-tdd> The loop as its author states it: write a list of the test cases you expect, turn **one** into a concrete runnable test, make it pass, optionally refactor, repeat until the list is empty. The mistakes he names are the ones the loop forbids: deciding implementation details while writing the list, converting the whole list into tests before making any of them pass, and writing assertion-free tests to move a coverage number.

## Small, even steps rather than the ordering alone

**Fucci et al., "A Dissection of the Test-Driven Development Process: Does It Really Matter to Test-First or to Test-Last?" (ICSE 2016; arXiv:1611.05994), and their external replication.** In a randomised trial, external quality and productivity tracked the **granularity** and **uniformity** of the development cycles. The test-first versus test-last ordering itself showed no important effect. The benefit comes from short, steady, evenly sized steps, which is why the loop insists on one case at a time and on reverting when a cycle stays red.

Meta-analyses of TDD trials report modest, context-dependent effects rather than a uniform win: a reason to keep the mechanism and drop the ceremony, not to stop writing tests first.

## The cost and the payoff are both real

**Nagappan, Maximilien, Bhat and Williams, "Realizing quality improvement through test driven development: results and experiences of four industrial teams" (Empirical Software Engineering, 2008).** Four shipping teams, three at Microsoft and one at IBM. Pre-release defect density fell between **40% and 90%** against comparable projects without TDD, and initial development time rose **15% to 35%**. The bill is front-loaded and visible; the return is defects that never ship.

## What a test should be bound to

**Steve Freeman and Nat Pryce, "Growing Object-Oriented Software, Guided by Tests" (2009).** Mock roles, not objects, and do not mock types you do not own. Hence wrapping third parties in your own adapter and faking that.

**Ian Cooper, "TDD, Where Did It All Go Wrong" (2017).** The unit under test is a unit of **behaviour**, reached through the module's public surface, not one class with its collaborators mocked. Tests bound to internals turn a suite into a tax on refactoring.

**Kent Beck, "Test Desiderata" (2019).** The properties a test trades off: behavioural, structure-insensitive, fast, deterministic, isolated, specific, readable, writable, predictive, inspiring, automated. Vocabulary for arguing about a specific test.

## Why the doubles section exists

**"Are Coding Agents Generating Over-Mocked Tests? An Empirical Study" (MSR 2026; arXiv:2602.00409).** Over 1.2 million 2025 commits across 2,168 TypeScript, JavaScript and Python repositories, 48,563 of them by coding agents. Agent commits touch test files more often than human ones (**23% against 13%**) and add mocks more often (**36% against 26%**), concentrated on a single technique: agents reach for the easiest isolation, not the appropriate one. The authors recommend putting mocking guidance in the agent's configuration, which is what this skill does.

## Why test-first matters more for an agent

Work on agentic coding (TDFlow, LLM4TDD, TICoder and the 2025-2026 repository-level benchmarks) reports large pass-rate gains when the agent gets the tests before writing the implementation, rather than producing code and tests together. The tests are the one specification an agent cannot talk itself out of, which is also why a workflow locks them: the order changes the output.

**Forsgren, Humble and Kim, "Accelerate" (2018), and the DORA programme.** Test automation and continuous integration are among the capabilities that predict delivery performance. The suite exists to let you release.
