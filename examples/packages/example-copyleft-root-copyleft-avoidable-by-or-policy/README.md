# @callstack/example-copyleft-root-copyleft-avoidable-by-or-policy

This is a test private project (`private: true`) for the license-kit integration tests to pass as `license-kit copyleft --root`, to test the `copyleft` exit codes on a dependency tree with no other licenses. It depends on:

- `@callstack/example-license-apache-2.0-or-lgpl-3.0-and-mit-or-gpl-2.0`
- `@callstack/example-license-mit-or-gpl-3.0`

Expected `copyleft` exit code: 1 with `--or-policy most-restrictive` (the default), 0 with `--or-policy least-restrictive`.
