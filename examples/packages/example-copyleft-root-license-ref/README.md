# @callstack/example-copyleft-root-license-ref

This is a test private project (`private: true`) for the license-kit integration tests to pass as `license-kit copyleft --root`, to test the `copyleft` exit codes on a dependency tree with strong copyleft next to a custom license. It depends on:

- `@callstack/example-license-gpl-3.0-and-license-ref`

Expected `copyleft` exit code: 1 under both OR Policies, since Unknown operands cannot hide the unavoidable strong copyleft.
