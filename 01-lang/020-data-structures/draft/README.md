# Hara persistent data structures

Status: **draft**

The authoritative document is
[`data-structures-spec.edn`](data-structures-spec.edn). The
`hara/data-structures-metaspec` it declares conformance to is **TODO** — the
metaspec layer for this area has not been written yet; see the area
[README](../README.md).

This layer owns the observable behaviour of the built-in persistent data
structures: the structure catalog (vector, list, queue, map, set,
ordered-map, ordered-set, sorted-map, sorted-set, trie), op semantics,
iteration-order guarantees, transient (Mutable) semantics, and the
Java-parity hashing stack (RAPID default; SYSTEM, MURMUR3, SIP).

It does not own reader syntax for collection literals
([01-lang/001-language](../../001-language)) or protocol dispatch
([01-lang/002-protocol](../../002-protocol)).

## Executable evidence

- [`conformance/hash-parity.edn`](conformance/hash-parity.edn) — 276 cases
  pinning raw hash functions, canonical number hashing, string-type
  (keyword/symbol) hashing, hash seeds, and collection hash composition.
- [`conformance/collections.edn`](conformance/collections.edn) — 54
  behavioural cases replaying op scripts against the Java reference
  structures and pinning count, iteration, lookups, rank probes, and hashes.

Both corpora are generated from the Java reference runtime and are
byte-for-byte deterministic across runs:

```shell
mvn -f java/pom.xml -Ptruffle package   # once, for java/target/classes
javac -cp java/target/classes -d target/hashdump target/hashdump/HashDump.java
java -cp target/hashdump:java/target/classes HashDump \
  > specs/01-lang/020-data-structures/draft/conformance/hash-parity.edn
javac -cp java/target/classes -d target/hashdump target/hashdump/CollectionDump.java
java -cp target/hashdump:java/target/classes CollectionDump \
  > specs/01-lang/020-data-structures/draft/conformance/collections.edn
```

Regeneration caveats:

- The generators (`HashDump.java`, `CollectionDump.java`) currently live in
  `target/hashdump/`, which is untracked CI scratch. **TODO**: move them to a
  tracked home (e.g. `specs/scripts/` or `java/src/test/`) — until then they
  must be recovered from the working tree or rewritten from the corpus
  formats in `data-structures-spec.edn`.
- `java/target/classes` must be fresh: the `Queue` reference-runtime repairs
  (below) are uncommitted source changes, so re-run the `mvn package` step
  before regenerating or the corpora will pin the old, broken `Queue`
  behaviour.

Rust consumers: `lang::hash::tests::java_parity_fixture`
(`rust/src/lang/hash/mod.rs`) and `lang::data::conformance_tests`
(`rust/src/lang/data/conformance_tests.rs`).

## Reference-runtime repairs

Writing the collections corpus surfaced two defects in the Java reference
`Queue`: `Base.iterator` ignored the popped-head offset (iteration, display,
and hashing read stale elements after `pop-first`), and `Base.nth` swapped
segment/index past the head. Both were repaired so that the corpus pins
coherent behaviour; `hara.lang.data.QueueTest` passes (5/5).

A third finding was standardised rather than repaired: Java's
`SortedMap.Node` does not override `hashCode`, so Java's own sorted-map
`hashCalc` is identity-based and non-deterministic across JVM processes.
The corpus pins the standardised unordered tuple2-entry composition
(identical to the CHAMP map formula), matching the Rust runtime; see
`:sorted-map-identity-hash` in the spec.
