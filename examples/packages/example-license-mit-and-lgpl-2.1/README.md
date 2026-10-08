# @callstack/example-license-mit-and-lgpl-2.1

This is a test package with the license expression `MIT AND LGPL-2.1-only` (a permissive and a weak copyleft license combined with `AND`), for the needs of example tester projects in this monorepository to depend on, to test that license-kit parses, renders and classifies SPDX license expressions.

Expected category: weak copyleft with `--or-policy most-restrictive` (the default), weak copyleft with `--or-policy least-restrictive`.
