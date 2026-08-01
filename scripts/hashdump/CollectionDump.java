import hara.lang.protocol.Constant;

import java.util.Iterator;
import java.util.Map.Entry;

/**
 * Dumps behavioural cases for the hara persistent data structures from the
 * Java runtime as the normative collections conformance corpus:
 *
 * <pre>
 * specs/01-lang/020-data-structures/draft/conformance/collections.edn
 * </pre>
 *
 * <p>Regenerate (from the repo root, after {@code mvn -f java/pom.xml -Ptruffle package}):
 *
 * <pre>
 * javac -cp java/target/classes -d target/hashdump specs/scripts/hashdump/CollectionDump.java
 * java -cp target/hashdump:java/target/classes CollectionDump \
 *   > specs/01-lang/020-data-structures/draft/conformance/collections.edn
 * </pre>
 *
 * <p>Each case replays a small op script against a fresh structure (or its
 * Mutable variant when {@code :transient true}) and records the resulting
 * observable state: count, iteration, lookups, rank probes and hashes.
 *
 * <p>Ops vocabulary (values are strings or small longs):
 * {@code [:assoc k v] [:dissoc k] [:conj v] [:push-first v] [:push-last v]
 * [:pop-first] [:pop-last]}.
 *
 * <p>The output is deterministic (byte-identical across runs).
 */
public class CollectionDump {

  static StringBuilder OUT = new StringBuilder();
  static int COUNT = 0;

  // -------------------------------------------------------------------------
  // EDN emission helpers
  // -------------------------------------------------------------------------

  static String ednStr(String s) {
    StringBuilder sb = new StringBuilder("\"");
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      switch (c) {
        case '"' -> sb.append("\\\"");
        case '\\' -> sb.append("\\\\");
        case '\n' -> sb.append("\\n");
        case '\r' -> sb.append("\\r");
        case '\t' -> sb.append("\\t");
        default -> sb.append(c);
      }
    }
    return sb.append('"').toString();
  }

  /** EDN form of a corpus value: null, String, Long, Boolean. */
  static String ednVal(Object v) {
    if (v == null) return "nil";
    if (v instanceof String s) return ednStr(s);
    if (v instanceof Long || v instanceof Integer || v instanceof Boolean) return v.toString();
    throw new IllegalArgumentException("unsupported corpus value: " + v + " (" + v.getClass() + ")");
  }

  static String ednOps(Object[][] ops) {
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < ops.length; i++) {
      Object[] op = ops[i];
      sb.append(i == 0 ? "" : " ").append("[:").append(op[0]);
      for (int j = 1; j < op.length; j++) sb.append(' ').append(ednVal(op[j]));
      sb.append(']');
    }
    return sb.append(']').toString();
  }

  static String ednIterVals(Iterator<?> it) {
    StringBuilder sb = new StringBuilder("[");
    boolean first = true;
    while (it.hasNext()) {
      sb.append(first ? "" : " ").append(ednVal(it.next()));
      first = false;
    }
    return sb.append(']').toString();
  }

  static String ednIterEntries(Iterator<? extends Entry<?, ?>> it) {
    StringBuilder sb = new StringBuilder("[");
    boolean first = true;
    while (it.hasNext()) {
      Entry<?, ?> e = it.next();
      sb.append(first ? "" : " ")
          .append('[').append(ednVal(e.getKey())).append(' ').append(ednVal(e.getValue())).append(']');
      first = false;
    }
    return sb.append(']').toString();
  }

  static void emit(String id, String structure, boolean tr, Object[][] ops, String expectBody) {
    OUT.append("  {:id :").append(id)
        .append(" :structure :").append(structure)
        .append(" :transient ").append(tr)
        .append(" :ops ").append(ednOps(ops))
        .append("\n   :expect ").append(expectBody).append("}\n");
    COUNT++;
  }

  /** Multi-line variant for long op scripts (one op per line). */
  static void emitLong(String id, String structure, boolean tr, Object[][] ops, String expectBody) {
    OUT.append("  {:id :").append(id)
        .append(" :structure :").append(structure)
        .append(" :transient ").append(tr)
        .append("\n   :ops [\n");
    for (Object[] op : ops) {
      OUT.append("    [:").append(op[0]);
      for (int j = 1; j < op.length; j++) OUT.append(' ').append(ednVal(op[j]));
      OUT.append("]\n");
    }
    OUT.append("   ]\n   :expect ").append(expectBody).append("}\n");
    COUNT++;
  }

  static void appendHashes(StringBuilder sb, hara.lang.protocol.IHash struct) {
    sb.append(" :hash ").append(struct.hashCalc(Constant.HashType.RAPID));
    sb.append(" :hash-murmur3 ").append(struct.hashCalc(Constant.HashType.MURMUR3));
  }

  // op constructors
  static Object[] assoc(Object k, Object v) { return new Object[] {"assoc", k, v}; }
  static Object[] dissoc(Object k) { return new Object[] {"dissoc", k}; }
  static Object[] conj(Object v) { return new Object[] {"conj", v}; }
  static Object[] pushFirst(Object v) { return new Object[] {"push-first", v}; }
  static Object[] pushLast(Object v) { return new Object[] {"push-last", v}; }
  static Object[] popFirst() { return new Object[] {"pop-first"}; }
  static Object[] popLast() { return new Object[] {"pop-last"}; }

  // -------------------------------------------------------------------------
  // per-structure case builders
  // -------------------------------------------------------------------------

  static String findMapBody(hara.lang.data.Map.Standard<Object, Object> m, Object[] probes) {
    StringBuilder sb = new StringBuilder("{");
    for (int i = 0; i < probes.length; i++) {
      sb.append(i == 0 ? "" : " ").append(ednVal(probes[i])).append(' ')
          .append(ednVal(m.lookup(probes[i])));
    }
    return sb.append('}').toString();
  }

  static void mapCase(String id, boolean tr, Object[][] ops, Object[] findProbes) {
    hara.lang.data.Map.Standard<Object, Object> m;
    if (tr) {
      var mm = hara.lang.data.Map.Mutable.<Object, Object>from(null);
      for (Object[] op : ops) {
        if (op[0].equals("assoc")) mm.assoc(op[1], op[2]);
        else if (op[0].equals("dissoc")) mm.dissoc(op[1]);
        else throw new IllegalArgumentException("map op: " + op[0]);
      }
      m = mm.toPersistent();
    } else {
      m = hara.lang.data.Map.Standard.<Object, Object>from(null);
      for (Object[] op : ops) {
        if (op[0].equals("assoc")) m = m.assoc(op[1], op[2]);
        else if (op[0].equals("dissoc")) m = m.dissoc(op[1]);
        else throw new IllegalArgumentException("map op: " + op[0]);
      }
    }
    StringBuilder e = new StringBuilder("{");
    e.append(":count ").append(m.count());
    e.append(" :iter ").append(ednIterEntries(m.iterator()));
    e.append(" :find ").append(findMapBody(m, findProbes));
    appendHashes(e, m);
    emit(id, "map", tr, ops, e.append('}').toString());
  }

  static void setCase(String id, boolean tr, Object[][] ops, Object[] containsProbes) {
    hara.lang.data.Set.Standard<Object> s;
    if (tr) {
      var sm = hara.lang.data.Set.Mutable.<Object>from(null);
      for (Object[] op : ops) {
        if (op[0].equals("conj")) sm.conj(op[1]);
        else if (op[0].equals("dissoc")) sm.dissoc(op[1]);
        else throw new IllegalArgumentException("set op: " + op[0]);
      }
      s = sm.toPersistent();
    } else {
      s = hara.lang.data.Set.Standard.<Object>from(null);
      for (Object[] op : ops) {
        if (op[0].equals("conj")) s = s.conj(op[1]);
        else if (op[0].equals("dissoc")) s = s.dissoc(op[1]);
        else throw new IllegalArgumentException("set op: " + op[0]);
      }
    }
    StringBuilder e = new StringBuilder("{");
    e.append(":count ").append(s.count());
    e.append(" :iter ").append(ednIterVals(s.iterator()));
    StringBuilder contains = new StringBuilder("{");
    for (int i = 0; i < containsProbes.length; i++) {
      contains.append(i == 0 ? "" : " ").append(ednVal(containsProbes[i])).append(' ')
          .append(s.find(containsProbes[i]) != null);
    }
    e.append(" :contains ").append(contains).append('}');
    appendHashes(e, s);
    emit(id, "set", tr, ops, e.append('}').toString());
  }

  static void vectorCase(String id, boolean tr, Object[][] ops, long[] nthProbes) {
    hara.lang.data.Vector.Standard<Object> v;
    if (tr) {
      var vm = hara.lang.data.Vector.Mutable.<Object>from(null);
      for (Object[] op : ops) {
        switch ((String) op[0]) {
          case "push-last" -> vm.pushLast(op[1]);
          case "pop-last" -> vm.popLast();
          case "assoc" -> vm.assoc(((Long) op[1]).intValue(), op[2]);
          default -> throw new IllegalArgumentException("vector op: " + op[0]);
        }
      }
      v = vm.toPersistent();
    } else {
      v = hara.lang.data.Vector.Standard.<Object>from(null);
      for (Object[] op : ops) {
        switch ((String) op[0]) {
          case "push-last" -> v = v.pushLast(op[1]);
          case "pop-last" -> v = v.popLast();
          case "assoc" -> v = v.assoc(((Long) op[1]).intValue(), op[2]);
          default -> throw new IllegalArgumentException("vector op: " + op[0]);
        }
      }
    }
    StringBuilder e = new StringBuilder("{");
    e.append(":count ").append(v.count());
    e.append(" :iter ").append(ednIterVals(v.iterator()));
    if (nthProbes.length > 0) {
      StringBuilder nth = new StringBuilder("{");
      for (int i = 0; i < nthProbes.length; i++) {
        nth.append(i == 0 ? "" : " ").append(nthProbes[i]).append(' ')
            .append(ednVal(v.nth(nthProbes[i])));
      }
      e.append(" :nth ").append(nth).append('}');
    }
    appendHashes(e, v);
    emit(id, "vector", tr, ops, e.append('}').toString());
  }

  static void listCase(String id, Object[][] ops, long[] nthProbes) {
    hara.lang.data.List.Standard<Object> l = hara.lang.data.List.Standard.<Object>from(null);
    for (Object[] op : ops) {
      switch ((String) op[0]) {
        case "push-first" -> l = l.pushFirst(op[1]);
        case "push-last" -> l = l.pushLast(op[1]);
        case "pop-first" -> l = l.popFirst();
        case "pop-last" -> l = l.popLast();
        default -> throw new IllegalArgumentException("list op: " + op[0]);
      }
    }
    StringBuilder e = new StringBuilder("{");
    e.append(":count ").append(l.count());
    e.append(" :iter ").append(ednIterVals(l.iterator()));
    if (nthProbes.length > 0) {
      StringBuilder nth = new StringBuilder("{");
      for (int i = 0; i < nthProbes.length; i++) {
        nth.append(i == 0 ? "" : " ").append(nthProbes[i]).append(' ')
            .append(ednVal(l.nth(nthProbes[i])));
      }
      e.append(" :nth ").append(nth).append('}');
    }
    appendHashes(e, l);
    emit(id, "list", false, ops, e.append('}').toString());
  }

  @SuppressWarnings("unchecked")
  static void queueCase(String id, boolean tr, Object[][] ops, long[] nthProbes, boolean withIter) {
    hara.lang.data.Queue.Standard<Object> q;
    if (tr) {
      var qm = hara.lang.data.Queue.Mutable.<Object>from(null);
      for (Object[] op : ops) {
        switch ((String) op[0]) {
          case "push-last" -> qm.pushLast(op[1]);
          case "pop-first" -> qm.popFirst();
          case "pop-last" -> qm.popLast();
          default -> throw new IllegalArgumentException("queue op: " + op[0]);
        }
      }
      q = qm.toPersistent();
    } else {
      q = hara.lang.data.Queue.Standard.<Object>from(null);
      for (Object[] op : ops) {
        switch ((String) op[0]) {
          case "push-last" -> q = q.pushLast(op[1]);
          case "pop-first" -> q = q.popFirst();
          case "pop-last" -> q = q.popLast();
          default -> throw new IllegalArgumentException("queue op: " + op[0]);
        }
      }
    }
    StringBuilder e = new StringBuilder("{");
    e.append(":count ").append(q.count());
    if (withIter) e.append(" :iter ").append(ednIterVals(q.iterator()));
    e.append(" :first ").append(ednVal(q.count() > 0 ? q.peekFirst() : null));
    e.append(" :last ").append(ednVal(q.count() > 0 ? q.peekLast() : null));
    if (nthProbes.length > 0) {
      StringBuilder nth = new StringBuilder("{");
      for (int i = 0; i < nthProbes.length; i++) {
        nth.append(i == 0 ? "" : " ").append(nthProbes[i]).append(' ')
            .append(ednVal(q.nth(nthProbes[i])));
      }
      e.append(" :nth ").append(nth).append('}');
    }
    appendHashes(e, q);
    if (ops.length > 12) emitLong(id, "queue", tr, ops, e.append('}').toString());
    else emit(id, "queue", tr, ops, e.append('}').toString());
  }

  static String findOrderedMapBody(
      hara.lang.data.OrderedMap.Standard<Object, Object> m, Object[] probes) {
    StringBuilder sb = new StringBuilder("{");
    for (int i = 0; i < probes.length; i++) {
      sb.append(i == 0 ? "" : " ").append(ednVal(probes[i])).append(' ')
          .append(ednVal(m.lookup(probes[i])));
    }
    return sb.append('}').toString();
  }

  static void orderedMapCase(String id, boolean tr, Object[][] ops, Object[] findProbes) {
    hara.lang.data.OrderedMap.Standard<Object, Object> m;
    if (tr) {
      var mm = hara.lang.data.OrderedMap.Mutable.<Object, Object>from(null);
      for (Object[] op : ops) {
        if (op[0].equals("assoc")) mm.assoc(op[1], op[2]);
        else if (op[0].equals("dissoc")) mm.dissoc(op[1]);
        else throw new IllegalArgumentException("ordered-map op: " + op[0]);
      }
      m = mm.toPersistent();
    } else {
      m = hara.lang.data.OrderedMap.Standard.<Object, Object>from(null);
      for (Object[] op : ops) {
        if (op[0].equals("assoc")) m = m.assoc(op[1], op[2]);
        else if (op[0].equals("dissoc")) m = m.dissoc(op[1]);
        else throw new IllegalArgumentException("ordered-map op: " + op[0]);
      }
    }
    StringBuilder e = new StringBuilder("{");
    e.append(":count ").append(m.count());
    e.append(" :iter ").append(ednIterEntries(m.iterator()));
    e.append(" :find ").append(findOrderedMapBody(m, findProbes));
    appendHashes(e, m);
    if (ops.length > 12) emitLong(id, "ordered-map", tr, ops, e.append('}').toString());
    else emit(id, "ordered-map", tr, ops, e.append('}').toString());
  }

  static void orderedSetCase(String id, boolean tr, Object[][] ops, Object[] containsProbes) {
    hara.lang.data.OrderedSet.Standard<Object> s;
    if (tr) {
      var sm = hara.lang.data.OrderedSet.Mutable.<Object>from(null);
      for (Object[] op : ops) {
        if (op[0].equals("conj")) sm.conj(op[1]);
        else if (op[0].equals("dissoc")) sm.dissoc(op[1]);
        else throw new IllegalArgumentException("ordered-set op: " + op[0]);
      }
      s = sm.toPersistent();
    } else {
      s = hara.lang.data.OrderedSet.Standard.<Object>from(null);
      for (Object[] op : ops) {
        if (op[0].equals("conj")) s = s.conj(op[1]);
        else if (op[0].equals("dissoc")) s = s.dissoc(op[1]);
        else throw new IllegalArgumentException("ordered-set op: " + op[0]);
      }
    }
    StringBuilder e = new StringBuilder("{");
    e.append(":count ").append(s.count());
    e.append(" :iter ").append(ednIterVals(s.iterator()));
    StringBuilder contains = new StringBuilder("{");
    for (int i = 0; i < containsProbes.length; i++) {
      contains.append(i == 0 ? "" : " ").append(ednVal(containsProbes[i])).append(' ')
          .append(s.find(containsProbes[i]) != null);
    }
    e.append(" :contains ").append(contains).append('}');
    appendHashes(e, s);
    if (ops.length > 12) emitLong(id, "ordered-set", tr, ops, e.append('}').toString());
    else emit(id, "ordered-set", tr, ops, e.append('}').toString());
  }

  /**
   * Standardised sorted-map hash. DEVIATION: Java's SortedMap iterator
   * yields raw {@code SortedMap.Node} objects which do not override
   * {@code hashCode()}, so {@code G.hashCalc} over sorted maps sums identity
   * hashes and is non-deterministic across JVM processes (same defect class
   * as Keyword.toString). The corpus pins the standardised composition
   * instead: the unordered map composition over tuple2 entries, identical to
   * the CHAMP map formula. See :sorted-map-identity-hash in the spec.
   */
  static void appendHashesSortedMap(
      StringBuilder sb, hara.lang.data.SortedMap.Standard<Object, Object> m) {
    long rapid = "::MAP".hashCode();
    long murmur3 = "::MAP".hashCode();
    for (Entry<Object, Object> e : m) {
      var entry = new hara.lang.data.Tuple.Tup2.L<>(null, e.getKey(), e.getValue());
      rapid += entry.hashCalc(Constant.HashType.RAPID);
      murmur3 += entry.hashCalc(Constant.HashType.MURMUR3);
    }
    sb.append(" :hash ").append(rapid);
    sb.append(" :hash-murmur3 ").append(murmur3);
  }

  /** EDN map of inclusive floor/ceil rank probes: {probe rank-or-(-1)}. */
  static String rankBody(Object[] probes, java.util.function.ToLongFunction<Object> rankFn) {
    StringBuilder sb = new StringBuilder("{");
    for (int i = 0; i < probes.length; i++) {
      sb.append(i == 0 ? "" : " ").append(ednVal(probes[i])).append(' ')
          .append(rankFn.applyAsLong(probes[i]));
    }
    return sb.append('}').toString();
  }

  @SuppressWarnings("unchecked")
  static void sortedMapCase(String id, boolean tr, Object[][] ops, Object[] findProbes,
      Object[] indexProbes, long[] nthProbes, Object[] floorProbes, Object[] ceilProbes) {
    hara.lang.data.SortedMap.Standard<Object, Object> m;
    if (tr) {
      var mm = new hara.lang.data.SortedMap.Mutable<Object, Object>(null);
      for (Object[] op : ops) {
        if (op[0].equals("assoc")) mm.assoc(op[1], op[2]);
        else if (op[0].equals("dissoc")) mm.dissoc(op[1]);
        else throw new IllegalArgumentException("sorted-map op: " + op[0]);
      }
      m = mm.toPersistent();
    } else {
      m = new hara.lang.data.SortedMap.Standard<Object, Object>(
          null, hara.lang.data.SortedMap.Node.EMPTY_NODE,
          (java.util.Comparator<Object>) (java.util.Comparator<?>) java.util.Comparator
              .naturalOrder());
      for (Object[] op : ops) {
        if (op[0].equals("assoc")) m = m.assoc(op[1], op[2]);
        else if (op[0].equals("dissoc")) m = m.dissoc(op[1]);
        else throw new IllegalArgumentException("sorted-map op: " + op[0]);
      }
    }
    StringBuilder e = new StringBuilder("{");
    e.append(":count ").append(m.count());
    e.append(" :iter ").append(ednIterEntries(m.iterator()));
    StringBuilder find = new StringBuilder("{");
    for (int i = 0; i < findProbes.length; i++) {
      find.append(i == 0 ? "" : " ").append(ednVal(findProbes[i])).append(' ')
          .append(ednVal(m.lookup(findProbes[i])));
    }
    e.append(" :find ").append(find).append('}');
    StringBuilder index = new StringBuilder("{");
    for (int i = 0; i < indexProbes.length; i++) {
      index.append(i == 0 ? "" : " ").append(ednVal(indexProbes[i])).append(' ')
          .append(m.indexOfKey(indexProbes[i]));
    }
    e.append(" :index-of ").append(index).append('}');
    if (nthProbes.length > 0) {
      StringBuilder nth = new StringBuilder("{");
      for (int i = 0; i < nthProbes.length; i++) {
        var entry = m.nth(nthProbes[i]);
        nth.append(i == 0 ? "" : " ").append(nthProbes[i]).append(' ')
            .append('[').append(ednVal(entry.getKey())).append(' ')
            .append(ednVal(entry.getValue())).append(']');
      }
      e.append(" :nth ").append(nth).append('}');
    }
    if (floorProbes.length > 0) {
      e.append(" :floor-index ").append(rankBody(floorProbes, m::inclusiveFloorIndex));
    }
    if (ceilProbes.length > 0) {
      e.append(" :ceil-index ").append(rankBody(ceilProbes, m::ceilIndex));
    }
    appendHashesSortedMap(e, m);
    emit(id, "sorted-map", tr, ops, e.append('}').toString());
  }

  @SuppressWarnings("unchecked")
  static void sortedSetCase(String id, boolean tr, Object[][] ops, Object[] containsProbes,
      Object[] indexProbes, long[] nthProbes, Object[] floorProbes, Object[] ceilProbes) {
    hara.lang.data.SortedSet.Standard<Object> s;
    if (tr) {
      var sm = new hara.lang.data.SortedSet.Mutable<Object>(null);
      for (Object[] op : ops) {
        if (op[0].equals("conj")) sm.conj(op[1]);
        else if (op[0].equals("dissoc")) sm.dissoc(op[1]);
        else throw new IllegalArgumentException("sorted-set op: " + op[0]);
      }
      s = sm.toPersistent();
    } else {
      s = hara.lang.data.SortedSet.Standard.<Object>from(null);
      for (Object[] op : ops) {
        if (op[0].equals("conj")) s = s.conj(op[1]);
        else if (op[0].equals("dissoc")) s = s.dissoc(op[1]);
        else throw new IllegalArgumentException("sorted-set op: " + op[0]);
      }
    }
    StringBuilder e = new StringBuilder("{");
    e.append(":count ").append(s.count());
    e.append(" :iter ").append(ednIterVals(s.iterator()));
    StringBuilder contains = new StringBuilder("{");
    for (int i = 0; i < containsProbes.length; i++) {
      contains.append(i == 0 ? "" : " ").append(ednVal(containsProbes[i])).append(' ')
          .append(s.find(containsProbes[i]) != null);
    }
    e.append(" :contains ").append(contains).append('}');
    StringBuilder index = new StringBuilder("{");
    for (int i = 0; i < indexProbes.length; i++) {
      index.append(i == 0 ? "" : " ").append(ednVal(indexProbes[i])).append(' ')
          .append(s._lookup().indexOfKey(indexProbes[i]));
    }
    e.append(" :index-of ").append(index).append('}');
    var lookup = (hara.lang.data.SortedMap.Base<Object, Object>) s._lookup();
    if (nthProbes.length > 0) {
      StringBuilder nth = new StringBuilder("{");
      for (int i = 0; i < nthProbes.length; i++) {
        nth.append(i == 0 ? "" : " ").append(nthProbes[i]).append(' ')
            .append(ednVal(lookup.nth(nthProbes[i]).getKey()));
      }
      e.append(" :nth ").append(nth).append('}');
    }
    if (floorProbes.length > 0) {
      e.append(" :floor-index ").append(rankBody(floorProbes, lookup::inclusiveFloorIndex));
    }
    if (ceilProbes.length > 0) {
      e.append(" :ceil-index ").append(rankBody(ceilProbes, lookup::ceilIndex));
    }
    appendHashes(e, s);
    emit(id, "sorted-set", tr, ops, e.append('}').toString());
  }

  static void trieCase(String id, boolean tr, Object[][] ops, String[] findProbes) {
    hara.lang.data.Trie<Object> t;
    if (tr) {
      var tm = new hara.lang.data.Trie.Mutable<Object>();
      for (Object[] op : ops) {
        if (op[0].equals("assoc")) tm.assoc((String) op[1], op[2]);
        else if (op[0].equals("dissoc")) tm.dissoc((String) op[1]);
        else throw new IllegalArgumentException("trie op: " + op[0]);
      }
      t = tm;
    } else {
      t = new hara.lang.data.Trie.Standard<Object>();
      for (Object[] op : ops) {
        if (op[0].equals("assoc")) t = t.assoc((String) op[1], op[2]);
        else if (op[0].equals("dissoc")) t = t.dissoc((String) op[1]);
        else throw new IllegalArgumentException("trie op: " + op[0]);
      }
    }
    StringBuilder e = new StringBuilder("{");
    e.append(":count ").append(t.count());
    // iteration yields keys; pair with values for a full picture
    StringBuilder iter = new StringBuilder("[");
    Iterator<String> it = t.iterator();
    boolean first = true;
    while (it.hasNext()) {
      String k = it.next();
      var pair = t.find(k);
      iter.append(first ? "" : " ").append('[').append(ednStr(k)).append(' ')
          .append(ednVal(pair == null ? null : pair.getValue())).append(']');
      first = false;
    }
    e.append(" :iter ").append(iter).append(']');
    StringBuilder find = new StringBuilder("{");
    for (int i = 0; i < findProbes.length; i++) {
      var pair = t.find(findProbes[i]);
      find.append(i == 0 ? "" : " ").append(ednStr(findProbes[i])).append(' ')
          .append(ednVal(pair == null ? null : pair.getValue()));
    }
    e.append(" :find ").append(find).append('}');
    appendHashes(e, t);
    emit(id, "trie", tr, ops, e.append('}').toString());
  }

  // -------------------------------------------------------------------------
  // case definitions
  // -------------------------------------------------------------------------

  public static void main(String[] args) {
    OUT.append("""
        {:spec/version "0.1"
         :document/id :hara/data-structures-collections-conformance
         :document/for :hara/data-structures
         :document/status :draft
         :note "Generated by specs/scripts/hashdump/CollectionDump.java against the Java runtime (see specs/01-lang/020-data-structures/draft/README.md). Each case replays :ops against a fresh structure (or its Mutable variant when :transient is true, then converted back to persistent) and records the observable state. Ops: [:assoc k v] [:dissoc k] [:conj v] [:push-first v] [:push-last v] [:pop-first] [:pop-last]; values are strings or small longs. Expect keys: :count; :iter (full iteration; map-like entries as [k v] pairs); :first/:last; :nth {idx val}; :find {key val-or-nil}; :contains {val bool}; :index-of {key rank-or-(-1)}; :floor-index/:ceil-index {key inclusive-floor/ceil-rank-or-(-1)}; :hash (RAPID) and :hash-murmur3 (Java longs). For :map and :set the :iter ORDER reflects the Java CHAMP layout; conforming runtimes must match :count, :find/:contains and the hashes, and must iterate the same entry SET - exact order parity is pinned for reference but implementations with a different layout may assert unordered equality until CHAMP layout parity is achieved. For :queue growth cases :iter is omitted (probe-only). For :sorted-map the :hash values are the STANDARDISED unordered tuple2-entry composition (identical to the :map formula): Java's SortedMap iterator yields raw Node objects without a hashCode override, so Java's own sorted-map hashCalc is identity-based and non-deterministic across JVM processes."
         :cases [
        """);

    // ---- map ----
    mapCase("map/assoc-basic", false,
        new Object[][] {assoc("a", 1L), assoc("b", 2L)},
        new Object[] {"a", "b", "zz"});
    mapCase("map/assoc-overwrite", false,
        new Object[][] {assoc("a", 1L), assoc("a", 2L)},
        new Object[] {"a", "zz"});
    mapCase("map/dissoc-basic", false,
        new Object[][] {assoc("a", 1L), assoc("b", 2L), assoc("c", 3L), dissoc("b")},
        new Object[] {"a", "b", "c"});
    mapCase("map/dissoc-absent", false,
        new Object[][] {assoc("a", 1L), dissoc("zz")},
        new Object[] {"a", "zz"});
    mapCase("map/int-keys", false,
        new Object[][] {assoc(1L, "one"), assoc(2L, "two"), assoc(3L, "three")},
        new Object[] {1L, 2L, 3L, 4L});
    {
      Object[][] ops = new Object[45][];
      for (int i = 0; i < 30; i++) ops[i] = assoc("k" + i, (long) i);
      for (int i = 0; i < 15; i++) ops[30 + i] = dissoc("k" + (2 * i));
      mapCase("map/churn-30", false, ops, new Object[] {"k1", "k29", "k0", "zz"});
    }
    mapCase("map/transient-basic", true,
        new Object[][] {assoc("a", 1L), assoc("b", 2L), assoc("c", 3L), dissoc("a")},
        new Object[] {"a", "b", "c"});

    // ---- set ----
    setCase("set/conj-basic", false,
        new Object[][] {conj("a"), conj("b"), conj("c")},
        new Object[] {"a", "b", "c", "zz"});
    setCase("set/conj-dup", false,
        new Object[][] {conj("a"), conj("a"), conj("b")},
        new Object[] {"a", "b"});
    setCase("set/dissoc-basic", false,
        new Object[][] {conj("a"), conj("b"), conj("c"), dissoc("b")},
        new Object[] {"a", "b", "c"});
    {
      Object[][] ops = new Object[40][];
      for (int i = 0; i < 30; i++) ops[i] = conj((long) i);
      for (int i = 0; i < 10; i++) ops[30 + i] = dissoc((long) (3 * i));
      setCase("set/churn-30", false, ops, new Object[] {1L, 2L, 0L, 29L, 30L});
    }
    setCase("set/transient-basic", true,
        new Object[][] {conj("a"), conj("b"), conj("c"), dissoc("a")},
        new Object[] {"a", "b", "c"});

    // ---- vector ----
    vectorCase("vector/push-basic", false,
        new Object[][] {pushLast(1L), pushLast(2L), pushLast(3L)}, new long[] {0, 2});
    vectorCase("vector/pop-last", false,
        new Object[][] {pushLast(1L), pushLast(2L), pushLast(3L), popLast()}, new long[] {0, 1});
    vectorCase("vector/assoc-index", false,
        new Object[][] {pushLast(1L), pushLast(2L), pushLast(3L), assoc(1L, 99L)},
        new long[] {0, 1, 2});
    {
      Object[][] ops = new Object[70][];
      for (int i = 0; i < 70; i++) ops[i] = pushLast((long) i);
      vectorCase("vector/growth-70", false, ops, new long[] {0, 31, 32, 63, 64, 69});
    }
    vectorCase("vector/transient-basic", true,
        new Object[][] {pushLast(1L), pushLast(2L), pushLast(3L), popLast(), assoc(0L, 99L)},
        new long[] {0, 1});

    // ---- list ----
    listCase("list/push-first",
        new Object[][] {pushFirst(1L), pushFirst(2L), pushFirst(3L)}, new long[] {0, 2});
    listCase("list/push-last",
        new Object[][] {pushLast(1L), pushLast(2L), pushLast(3L)}, new long[] {0, 2});
    listCase("list/mixed-ends",
        new Object[][] {pushFirst(1L), pushLast(2L), pushFirst(0L), popLast(), popFirst()},
        new long[] {0});
    {
      Object[][] ops = new Object[40][];
      for (int i = 0; i < 40; i++) ops[i] = pushLast((long) i);
      listCase("list/growth-40", ops, new long[] {0, 39});
    }

    // ---- queue ----
    queueCase("queue/enqueue-basic", false,
        new Object[][] {pushLast(1L), pushLast(2L), pushLast(3L)}, new long[] {0, 2}, true);
    queueCase("queue/dequeue", false,
        new Object[][] {pushLast(1L), pushLast(2L), pushLast(3L), popFirst()},
        new long[] {0, 1}, true);
    queueCase("queue/pop-last", false,
        new Object[][] {pushLast(1L), pushLast(2L), pushLast(3L), popLast()},
        new long[] {0, 1}, true);
    queueCase("queue/transient-basic", true,
        new Object[][] {pushLast(1L), pushLast(2L), pushLast(3L), popFirst()},
        new long[] {0, 1}, true);
    {
      // crosses the 1024-element segment-promotion boundary; probe-only expect
      Object[][] ops = new Object[1200][];
      for (int i = 0; i < 1100; i++) ops[i] = pushLast((long) i);
      for (int i = 0; i < 100; i++) ops[1100 + i] = popFirst();
      queueCase("queue/growth-1100", false, ops, new long[] {0, 500, 999}, false);
    }
    {
      // 1030 pushes + 1025 pops: the offset crosses 1024, so the head is
      // replaced by the former (short) tail; iteration and nth must respect
      // the offset into the promoted head
      Object[][] ops = new Object[1030 + 1025][];
      for (int i = 0; i < 1030; i++) ops[i] = pushLast((long) i);
      for (int i = 0; i < 1025; i++) ops[1030 + i] = popFirst();
      queueCase("queue/segment-promote-iter", false, ops, new long[] {0, 4}, true);
    }
    {
      // nth probes across the head / buffer / tail segments with a nonzero
      // offset (923 = head boundary, 924/1947 = buffer, 1948+ = tail)
      Object[][] ops = new Object[2500 + 100][];
      for (int i = 0; i < 2500; i++) ops[i] = pushLast((long) i);
      for (int i = 0; i < 100; i++) ops[2500 + i] = popFirst();
      queueCase("queue/nth-past-head", false, ops,
          new long[] {0, 923, 924, 1947, 1948, 2399}, false);
    }
    {
      // popLast with an empty tail and a non-empty buffer promotes the last
      // buffer segment WITHOUT dropping an element (only _size decrements),
      // so the iterator still yields the retained last element
      Object[][] ops = new Object[2049 + 2][];
      for (int i = 0; i < 2049; i++) ops[i] = pushLast((long) i);
      ops[2049] = popLast();
      ops[2050] = popLast();
      queueCase("queue/pop-last-promote", false, ops,
          new long[] {0, 1023, 1024, 2046}, true);
    }

    // ---- ordered-map ----
    orderedMapCase("ordered-map/assoc-basic", false,
        new Object[][] {assoc("c", 3L), assoc("a", 1L), assoc("b", 2L)},
        new Object[] {"a", "b", "c", "zz"});
    orderedMapCase("ordered-map/assoc-overwrite", false,
        new Object[][] {assoc("a", 1L), assoc("b", 2L), assoc("a", 3L)},
        new Object[] {"a", "b"});
    orderedMapCase("ordered-map/dissoc-reinsert", false,
        new Object[][] {assoc("a", 1L), assoc("b", 2L), assoc("c", 3L), dissoc("b"),
            assoc("b", 9L)},
        new Object[] {"a", "b", "c"});
    {
      // 40 entries, 25 tombstones: exercises slot compaction (Rust compacts
      // when slots >= 32 and tombstones >= 2 * count)
      Object[][] ops = new Object[65][];
      for (int i = 0; i < 40; i++) ops[i] = assoc("k" + i, (long) i);
      for (int i = 0; i < 25; i++) ops[40 + i] = dissoc("k" + i);
      orderedMapCase("ordered-map/compaction-40", false, ops,
          new Object[] {"k25", "k39", "k0", "zz"});
    }
    {
      // past the compaction threshold, then re-insert: new keys append after
      // the compacted survivors (lookup indices renumbered 0..count-1)
      Object[][] ops = new Object[72][];
      for (int i = 0; i < 40; i++) ops[i] = assoc("k" + i, (long) i);
      for (int i = 0; i < 30; i++) ops[40 + i] = dissoc("k" + i);
      ops[70] = assoc("n1", 101L);
      ops[71] = assoc("n2", 102L);
      orderedMapCase("ordered-map/compaction-reinsert", false, ops,
          new Object[] {"k39", "n1", "n2", "k0"});
    }
    orderedMapCase("ordered-map/transient-basic", true,
        new Object[][] {assoc("a", 1L), assoc("b", 2L), dissoc("a")},
        new Object[] {"a", "b"});

    // ---- ordered-set ----
    orderedSetCase("ordered-set/conj-basic", false,
        new Object[][] {conj("c"), conj("a"), conj("b")},
        new Object[] {"a", "b", "c", "zz"});
    orderedSetCase("ordered-set/dissoc-reinsert", false,
        new Object[][] {conj("a"), conj("b"), conj("c"), dissoc("b"), conj("b")},
        new Object[] {"a", "b", "c"});
    {
      Object[][] ops = new Object[65][];
      for (int i = 0; i < 40; i++) ops[i] = conj((long) i);
      for (int i = 0; i < 25; i++) ops[40 + i] = dissoc((long) i);
      orderedSetCase("ordered-set/churn-40", false, ops, new Object[] {25L, 39L, 0L, 40L});
    }
    {
      // past the compaction threshold, then re-conj: new elements append
      // after the compacted survivors (lookup indices renumbered)
      Object[][] ops = new Object[72][];
      for (int i = 0; i < 40; i++) ops[i] = conj((long) i);
      for (int i = 0; i < 30; i++) ops[40 + i] = dissoc((long) i);
      ops[70] = conj(101L);
      ops[71] = conj(102L);
      orderedSetCase("ordered-set/compaction-reinsert", false, ops,
          new Object[] {39L, 101L, 102L, 0L});
    }
    orderedSetCase("ordered-set/transient-basic", true,
        new Object[][] {conj("a"), conj("b"), dissoc("a")},
        new Object[] {"a", "b"});

    // ---- sorted-map ----
    sortedMapCase("sorted-map/assoc-ints", false,
        new Object[][] {assoc(5L, "five"), assoc(3L, "three"), assoc(8L, "eight"),
            assoc(1L, "one"), assoc(9L, "nine"), assoc(2L, "two"), assoc(7L, "seven")},
        new Object[] {1L, 9L, 4L},
        new Object[] {1L, 5L, 9L, 4L},
        new long[] {0, 3, 6},
        new Object[] {4L, 0L, 10L, 5L},
        new Object[] {4L, 0L, 10L, 9L});
    sortedMapCase("sorted-map/assoc-strings", false,
        new Object[][] {assoc("pear", 1L), assoc("apple", 2L), assoc("orange", 3L),
            assoc("banana", 4L)},
        new Object[] {"apple", "pear", "fig"},
        new Object[] {"apple", "pear", "fig"},
        new long[] {0, 2, 3},
        new Object[] {"fig", "aardvark", "zebra", "orange"},
        new Object[] {"fig", "aardvark", "zebra", "pear"});
    sortedMapCase("sorted-map/dissoc", false,
        new Object[][] {assoc(5L, "five"), assoc(3L, "three"), assoc(8L, "eight"),
            assoc(1L, "one"), dissoc(3L)},
        new Object[] {1L, 3L, 8L},
        new Object[] {1L, 5L, 8L, 3L},
        new long[] {0, 1, 2},
        new Object[] {3L, 0L, 9L},
        new Object[] {3L, 1L, 9L});
    sortedMapCase("sorted-map/transient-basic", true,
        new Object[][] {assoc(2L, "two"), assoc(1L, "one"), assoc(3L, "three"), dissoc(2L)},
        new Object[] {1L, 2L, 3L},
        new Object[] {1L, 3L, 2L},
        new long[] {0, 1},
        new Object[] {2L, 0L, 4L},
        new Object[] {2L, 0L, 4L});

    // ---- sorted-set ----
    sortedSetCase("sorted-set/conj-ints", false,
        new Object[][] {conj(5L), conj(3L), conj(8L), conj(1L), conj(9L), conj(2L), conj(7L)},
        new Object[] {1L, 9L, 4L},
        new Object[] {1L, 9L, 4L},
        new long[] {0, 3, 6},
        new Object[] {4L, 0L, 10L, 5L},
        new Object[] {4L, 0L, 10L, 9L});
    sortedSetCase("sorted-set/conj-strings", false,
        new Object[][] {conj("pear"), conj("apple"), conj("orange"), conj("banana")},
        new Object[] {"apple", "pear", "fig"},
        new Object[] {"apple", "pear", "fig"},
        new long[] {0, 2, 3},
        new Object[] {"fig", "aardvark", "zebra", "orange"},
        new Object[] {"fig", "aardvark", "zebra", "pear"});
    sortedSetCase("sorted-set/dissoc", false,
        new Object[][] {conj(5L), conj(3L), conj(8L), conj(1L), dissoc(3L)},
        new Object[] {1L, 3L, 8L},
        new Object[] {1L, 8L, 3L},
        new long[] {0, 1, 2},
        new Object[] {3L, 0L, 9L},
        new Object[] {3L, 1L, 9L});

    // ---- trie ----
    trieCase("trie/assoc-prefix", false,
        new Object[][] {assoc("apple", 1L), assoc("app", 2L), assoc("banana", 3L),
            assoc("band", 4L)},
        new String[] {"app", "apple", "banana", "band", "ap", "ban"});
    trieCase("trie/dissoc", false,
        new Object[][] {assoc("apple", 1L), assoc("app", 2L), assoc("banana", 3L), dissoc("app")},
        new String[] {"app", "apple", "banana"});
    trieCase("trie/assoc-overwrite", false,
        new Object[][] {assoc("app", 1L), assoc("app", 9L)},
        new String[] {"app"});
    trieCase("trie/transient-basic", true,
        new Object[][] {assoc("apple", 1L), assoc("app", 2L), dissoc("apple")},
        new String[] {"app", "apple"});
    trieCase("trie/dissoc-prune", false,
        new Object[][] {assoc("cat", 1L), assoc("cats", 2L), assoc("car", 3L),
            dissoc("cats"), dissoc("car")},
        new String[] {"cat", "cats", "car", "ca"});
    trieCase("trie/dissoc-prefix", false,
        new Object[][] {assoc("cat", 1L), assoc("cats", 2L), dissoc("cat")},
        new String[] {"cat", "cats", "ca"});
    trieCase("trie/empty-key", false,
        new Object[][] {assoc("", 7L), assoc("a", 1L)},
        new String[] {"", "a", "b"});

    OUT.append("]}\n");
    System.out.print(OUT);
    System.err.println("cases: " + COUNT);
  }
}
