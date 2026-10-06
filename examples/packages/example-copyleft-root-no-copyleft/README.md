# @callstack/example-copyleft-root-no-copyleft

This is a test private project (`private: true`) for the license-kit integration tests to pass as `license-kit copyleft --root`, to test the `copyleft` exit codes on a dependency tree with no other licenses. It depends on:

- `@callstack/example-license-mit-or-apache-2.0`
- `@callstack/example-license-mit-or-apache-2.0-and-isc`

Expected `copyleft` exit code: 0 under both OR Policies, also with `--error-on-weak`.
