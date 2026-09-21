<!--
Sync Impact Report
Version change: (none) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles: I. Test-First, II. Security by Default,
    III. Spec-Driven Workflow, IV. Small & Reversible Changes,
    V. Single Responsibility per File, VI. Scope-Organized Directories,
    VII. Clean Code, VIII. Pure Functions, IX. File Naming Convention
  - Technology Stack
  - Repository Organization (deferred, see TODO)
  - Governance
Removed sections: none (initial creation from template)
Deferred / TODO items:
  - RATIFICATION_DATE unknown; marked TODO pending user confirmation.
  - Repository Organization content left as TODO: source (.specs/rules.md)
    has an empty "Organização do repositorio" heading with no content
    to migrate.
Templates requiring follow-up: none — dependent templates/commands read
  this constitution at runtime and are out of scope for this command.
-->

# Maia CLI Constitution

## Language
Sempre em portugues BR.

## Core Principles

### I. Test-First (NON-NEGOTIABLE)
Tests are part of the task, not an afterthought. No new logic merges without
a test that exercises it. Typecheck and the test suite MUST be green at all
times; a task is not complete while either is red.
**Rationale**: Untested logic is unverified logic; keeping both gates green
continuously prevents regressions from accumulating silently.

### II. Security by Default
No secrets are committed to the repository. Destructive actions (deletions,
force-pushes, irreversible migrations, etc.) MUST be blocked by guardrails —
a deny list and pre-commit checks — never by relying on model or reviewer
discretion.
**Rationale**: Guardrails enforced by tooling are auditable and consistent;
trusting judgment alone does not scale and fails silently under pressure.

### III. Spec-Driven Workflow
Every relevant change follows spec → plan → task → implement → code review
→ review fixes (if needed) → test, with human review between phases (human
review may be explicitly skipped only when requested for that phase). No
step is bypassed for changes in scope of this workflow.
**Rationale**: Sequencing intent (spec), design (plan), and execution
(tasks) before code keeps changes traceable and reviewable at each stage.

### IV. Small & Reversible Changes
Each task MUST fit within a single commit. Work is decomposed until it is
small enough to land and, if necessary, revert independently.
**Rationale**: Small commits are easy to review, bisect, and roll back
without collateral damage to unrelated work.

### V. Single Responsibility per File
Each class, function, and type lives in its own file, and each file carries
a comment describing its purpose.
**Rationale**: One responsibility per file keeps navigation, review, and
testing predictable as the codebase grows.

### VI. Scope-Organized Directories
Directories MUST be organized by a well-defined scope. Files belong to the
folder that matches their responsibility, not to a catch-all location.
**Rationale**: Scope-based organization keeps related code discoverable and
prevents directories from becoming unstructured dumping grounds.

### VII. Clean Code
Clean code practices are mandatory: clear naming, minimal duplication, small
functions, and no dead or commented-out code left behind.
**Rationale**: Consistent code quality reduces the cost of every future
change and review.

### VIII. Pure Functions
Functions MUST be pure whenever possible — no hidden side effects, same
input yields same output. Side effects (I/O, mutation) are isolated at the
edges of the system.
**Rationale**: Pure functions are trivially testable and composable,
directly supporting Principle I (Test-First).

### IX. File Naming Convention
File names MUST separate every word with a dot (`.`). Test files MUST use
the `.test.ts` suffix. Example: `user.dto.in.ts`, `user.dto.in.test.ts`.
**Rationale**: A single, predictable naming scheme makes file purpose and
type identifiable at a glance across the repository.

## Technology Stack

- Node.js is the runtime for this project.
- `node:test` is the required test runner.
- TypeScript MUST use Node's native TS support during development (no
  separate transpilation step required for local development workflows).

## Repository Organization

TODO(REPOSITORY_ORGANIZATION): The source document (`.specs/rules.md`)
defines an "Organização do repositorio" heading with no content underneath
it. Provide the directory/scope layout to populate this section, or confirm
that Principle VI (Scope-Organized Directories) fully covers this concern.

## Governance

This constitution supersedes all other development practices for this
repository. All specs, plans, tasks, and code reviews MUST verify compliance
with these principles before proceeding to the next workflow phase defined
in Principle III.

**Amendment procedure**: Amendments are proposed by editing this file (or
its source of truth in `.specs/rules.md`), stating the change and rationale,
and are ratified via the standard spec-driven workflow's human review step.
Amendments take effect once merged.

**Versioning policy**: This constitution follows semantic versioning:
- MAJOR: Backward-incompatible governance changes, or removal/redefinition
  of an existing principle.
- MINOR: A new principle or section is added, or existing guidance is
  materially expanded.
- PATCH: Clarifications, wording, or typo fixes with no semantic change.

**Compliance review**: Every code review MUST confirm the change complies
with all Core Principles, in particular Test-First (I), Security by Default
(II), and Small & Reversible Changes (IV). Any complexity or deviation from
a principle MUST be explicitly justified in the relevant spec or plan.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original
adoption date not provided | **Last Amended**: 2026-09-21
