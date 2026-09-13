# Project Development Rules

## Core instruction

Do not immediately start implementation.

For every new feature, first:

1. Understand the requirement and intended user.
2. Inspect the existing project structure and reusable code.
3. Identify assumptions, dependencies and constraints.
4. Map the happy path, alternative paths and failure paths.
5. Identify functional, security, accessibility and performance risks.
6. Create a concise implementation and testing plan.
7. Use the relevant Superpowers workflow before implementing.

## Development workflow

Follow this sequence:

1. Requirements and acceptance criteria
2. Architecture and implementation plan
3. Edge-case and risk analysis
4. Test design
5. Test-driven implementation where practical
6. Code review
7. Automated verification
8. Documentation

Do not skip directly from the requirement to implementation.

## Functional quality

For every feature, verify:

- Happy path
- Alternative paths
- Failure and recovery paths
- Empty, invalid, duplicate and boundary values
- Loading, empty, success and error states
- Navigation and state persistence
- Backend and API failure handling
- Relevant desktop and mobile behaviour

## Authentication and authorisation

Where applicable, verify:

- Registration, login, logout and password recovery
- Invalid and expired credentials
- Session expiry and secured routes
- Role and permission restrictions
- Direct URL access
- Sensitive data is not exposed in UI, logs or source code

Never use real credentials or production data in tests.

## Security

- Validate and sanitise untrusted input.
- Do not place secrets in source code.
- Use environment variables for secrets.
- Apply server-side authorisation.
- Avoid logging tokens, passwords or personal information.
- Review dependencies and exposed endpoints.
- Do not perform destructive security testing without explicit approval.

## Accessibility

Where applicable, verify:

- Semantic HTML
- Accessible names and labels
- Keyboard operability
- Visible focus states
- Meaningful error messages
- Colour contrast
- Screen-reader-friendly status updates

## UI and UX

Verify:

- Clear navigation and no dead ends
- Consistent components, spacing and typography
- Responsive layouts
- Useful validation and feedback
- No overlapping, clipped or inaccessible controls
- Recovery guidance for errors
- No unnecessarily complex user flows

## Performance and reliability

Consider:

- Page and component loading
- Avoidable re-renders
- Excessive network requests
- Large assets and bundles
- API latency and timeouts
- Retry and duplicate-submission behaviour
- Network interruption and refresh recovery

Only make optimisation claims when supported by measurements.

## Testing requirements

Before considering work complete:

1. Add or update appropriate tests.
2. Run relevant unit, integration, API and end-to-end tests.
3. Run linting and type checks.
4. Verify important workflows using Playwright when available.
5. Check browser console and failed network requests.
6. Capture failure evidence when needed.

Do not remove or weaken a test merely to make the suite pass.

## Completion gate

Do not state that work is complete until:

- Requirements and acceptance criteria are satisfied.
- Relevant automated checks pass.
- The implementation has been reviewed.
- Security, accessibility and performance impacts were considered.
- Errors and edge cases were tested.
- Documentation was updated where necessary.
- Remaining limitations and technical debt are clearly disclosed.

When reporting completion, provide:

- What changed
- Files changed
- Tests added or updated
- Commands executed
- Results observed
- Known limitations
- Recommended next improvements

