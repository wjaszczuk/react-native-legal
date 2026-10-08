# @callstack/example-license-legacy-licenses-array

This is a test package with the legacy `licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }]` array instead of a `license` field, for the needs of example tester projects in this monorepository to depend on, to test that license-kit parses the legacy form as `MIT OR Apache-2.0`.

Expected category: permissive with both OR Policies.
