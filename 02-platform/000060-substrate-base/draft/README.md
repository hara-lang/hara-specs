# Hara portable substrate base

Status: **draft**  
Version: **0.1.0**  
Wire family: **substrate.v1**

The authoritative contract is [`substrate-base.edn`](substrate-base.edn).
It defines the vocabulary, identity domains, portable value and error
boundaries, compatibility policy, and dependency order shared by Hara and
XTalk.

The substrate is transport-neutral and owns no host authority. Live service
instances and callbacks remain runtime-local; only portable data crosses a
transport.
