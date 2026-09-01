# Private Banking Onboarding Platform

This project renders a multi-step onboarding workflow using a schema-driven form engine. The experience is built around JSON-defined steps, FEEL-based conditions, and a single application state model that keeps validation, autosave, and step navigation in sync.

## Form lifecycle with @bpmn-io/form-js

The runtime form is managed in [src/components/DynamicFormEngine.tsx](src/components/DynamicFormEngine.tsx). The component owns the lifecycle of the form instance instead of letting it leak into the page container.

Key lifecycle decisions:

- The form is created once per schema change with a container ref.
- The schema is imported by calling form.importSchema(schema, initialData).
- A ref keeps a live handle to the form instance so validation and resubmission logic can trigger without re-mounting the component unnecessarily.
- Event listeners are attached for changed and blur events, which allow us to track touched fields and propagate the latest form data upward to the app state.
- The form instance is torn down in the cleanup callback with form.destroy(), preventing duplicate listeners or DOM leaks.
- The code keeps a previous-data snapshot so field-level change detection can be performed without over-reporting every change as a new mutation.

This pattern gives us a predictable lifecycle: create -> import schema -> listen for events -> sync data -> destroy on unmount.

The schema transformation helper in [src/utils/schemaBuilder.ts](src/utils/schemaBuilder.ts) also normalizes FEEL visibility expressions into the conditional.hide structure that the form engine expects. In other words, the authoring format stays simple in JSON, while the runtime layer converts it into the shape the renderer understands.

## RPC-over-HTTP constraints and client enforcement

The HTTP client in [src/api/rpcClient.ts](src/api/rpcClient.ts) enforces the strict enterprise rule that every remote operation must be sent as a POST request.

Design choices:

- A single execute() wrapper centralizes request creation and validation.
- Any forbidden verb such as GET, PUT, PATCH, or DELETE is rejected before fetch() is called.
- The client throws a dedicated HTTPMethodNotAllowedError so enforcement is explicit and easy to diagnose in logs or tests.
- The final request always uses method: "POST" and includes the RPC envelope plus an action header.
- This is a deliberate safety choice: it prevents accidental state-changing operations from being invoked through browser-safe but semantically wrong verbs.

The RPC envelope is typed in [src/types/rpc.ts](src/types/rpc.ts), and the app layer uses the client in a way that keeps transport concerns separate from business logic.

## State management and debounced autosave

The top-level application state is managed in [src/App.tsx](src/App.tsx). The app keeps a single source of truth for onboarding data and derives step validity from that state.

Important state choices:

- formData is kept in React state and merged with incoming form engine updates.
- Validation is recalculated from the current formData whenever a user changes a field or navigates between steps.
- Step completion and navigation gating are derived from validation results rather than duplicated state flags.
- The stepper only advances when higher-priority steps are valid, which prevents invalid data from flowing across the wizard.

Autosave is handled with the hook in [src/hooks/useDebouncedAutosave.ts](src/hooks/useDebouncedAutosave.ts).

Key behavior:

- The hook debounces writes to localStorage so rapid user edits do not spam storage.
- It maintains save status values such as idle, saving, saved, and error for UX feedback.
- Autosave runs after a short delay and clears the transient state back to idle after a brief confirmation period.
- The hook is intentionally narrow: it saves the draft only and does not mix validation or business logic into persistence concerns.

This separation keeps the data model predictable:

- form engine owns UI rendering and field events
- app state owns orchestration and validation
- autosave hook owns persistence timing and feedback
- RPC client owns HTTP transport safety

## Local setup and run

### Prerequisites

- Node.js 18 or newer
- npm 9 or newer

### Install dependencies

```bash
npm install
```

### Start the app in development mode

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

### Run the test suite

```bash
npx jest --runInBand --watch=false
```

## Summary

The application is intentionally built as a layered architecture with a strict separation of concerns:

- schema-driven rendering for forms
- FEEL-based conditional visibility rules
- centralized validation logic
- React state orchestration for step navigation
- debounced local draft persistence
- POST-only RPC transport enforcement

This structure makes the onboarding flow easier to reason about, easier to validate, and safer when connected to enterprise APIs.
