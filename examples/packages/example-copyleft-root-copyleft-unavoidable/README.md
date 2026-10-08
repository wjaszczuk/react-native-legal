# @callstack/example-copyleft-root-copyleft-unavoidable

This is a test private project (`private: true`) for the license-kit integration tests to pass as `license-kit copyleft --root`, to test the `copyleft` exit codes on a dependency tree with no other licenses. It depends on:

- `@callstack/example-license-gpl-3.0-and-mit-or-apache-2.0`

Expected `copyleft` exit code: 1 under both OR Policies.
