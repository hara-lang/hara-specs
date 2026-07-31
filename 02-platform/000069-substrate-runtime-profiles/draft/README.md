# Substrate runtime profiles

This draft maps the portable 000060–000068 contracts onto Hara and XTalk. Java
Truffle and Rust are Hara implementation profiles; generated XTalk targets form
the XTalk profile. Divergences are explicit gaps, not alternate semantics.

The validation gate combines EDN/reference checks, the portable corpus, and
implementation-specific Truffle, Rust, and XTalk tests.
