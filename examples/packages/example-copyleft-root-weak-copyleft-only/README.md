# @callstack/example-copyleft-root-weak-copyleft-only

This is a test private project (`private: true`) for the license-kit integration tests to pass as `license-kit copyleft --root`, to test the `copyleft` exit codes on a dependency tree with no other licenses. It depends on:

- `@callstack/example-license-mit-and-lgpl-2.1`

Expected `copyleft` exit code: 0, or 2 with `--error-on-weak`, under both OR Policies.
