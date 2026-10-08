# @callstack/example-copyleft-root-weak-and-unidentified

This is a test private project (`private: true`) for the license-kit integration tests to pass as `license-kit copyleft --root`, to test the `copyleft` output and exit codes on a dependency tree with weak copyleft next to a custom license. It depends on:

- `@callstack/example-license-lgpl-2.1-and-license-ref`

Expected `copyleft` exit code: 0, 2 with `--error-on-weak`, 3 with only `--error-on-unidentified`. The package is listed as weak copyleft and as an Unidentified License.
