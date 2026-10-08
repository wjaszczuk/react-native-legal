# @callstack/example-license-mit-or-apache-2.0-and-isc

This is a test package with the license expression `MIT OR Apache-2.0 AND ISC` (an expression where `AND` binds tighter than `OR`, i.e. `MIT OR (Apache-2.0 AND ISC)`), for the needs of example tester projects in this monorepository to depend on, to test that license-kit parses, renders and classifies SPDX license expressions.

Expected category: permissive with `--or-policy most-restrictive` (the default), permissive with `--or-policy least-restrictive`.
