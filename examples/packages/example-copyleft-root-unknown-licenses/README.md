# @callstack/example-copyleft-root-unknown-licenses

This is a test private project (`private: true`) for the license-kit integration tests to pass as `license-kit copyleft --root`, to test the `copyleft` exit codes on a dependency tree with only Unknown Licenses. It depends on:

- `@callstack/example-license-unlicensed`
- `@callstack/example-license-see-license-in`

Expected `copyleft` exit code: 0 under both OR Policies, also with `--error-on-weak`. `analyze --list-unknown` lists both with their Raw License.
