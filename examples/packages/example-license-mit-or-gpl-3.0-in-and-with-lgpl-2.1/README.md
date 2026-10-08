# @callstack/example-license-mit-or-gpl-3.0-in-and-with-lgpl-2.1

This is a test package with the license expression `(MIT OR GPL-3.0-only) AND LGPL-2.1-only` (a Dual License nested inside `AND`), for the needs of example tester projects in this monorepository to depend on, to test that license-kit parses, renders and classifies SPDX license expressions.

Expected category: strong copyleft with `--or-policy most-restrictive` (the default), weak copyleft with `--or-policy least-restrictive`.
