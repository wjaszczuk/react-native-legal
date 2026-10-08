# @callstack/example-copyleft-root-with-exception

This is a test private project (`private: true`) for the license-kit integration tests to pass as `license-kit copyleft --root`, to test the `copyleft` exit codes on a dependency tree with a strong copyleft license with a License Exception. It depends on:

- `@callstack/example-license-gpl-2.0-with-classpath-exception`

Expected `copyleft` exit code: 1 under both OR Policies. The License Exception is shown in the output.
