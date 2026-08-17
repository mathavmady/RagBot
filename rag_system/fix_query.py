# fix_query.py
# ----------------------------------------------------------
# Deep diagnosis — finds exactly why query returns 0 results
# even though 3871 vectors exist in Pinecone.
#
# Checks:
#   1. What namespaces the vectors are stored in
#   2. Does a raw Pinecone query (bypassing embedding model)
#   3. Does a real query with a dummy vector
#   4. Prints exactly what to fix
#
# Run:
#   python fix_query.py
# ----------------------------------------------------------

import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

import config
from pinecone import Pinecone

print("\n" + "="*60)
print("  Deep Query Diagnosis")
print("="*60)

pc    = Pinecone(api_key=config.PINECONE_API_KEY)
index = pc.Index(config.PINECONE_INDEX_NAME)

# ── 1. Check namespaces ───────────────────────────────────
print("\n  [Step 1] Checking namespaces in the index...")
stats = index.describe_index_stats()

print(f"  Total vectors : {stats.total_vector_count}")
print(f"  Namespaces    : {dict(stats.namespaces)}")

namespaces = list(stats.namespaces.keys())

if len(namespaces) == 0:
    print("\n  Vectors exist but NO namespace info — they are in the default namespace ('').")
    active_namespace = ""
elif len(namespaces) == 1:
    active_namespace = namespaces[0]
    print(f"\n  All vectors are in namespace: '{active_namespace}'")
else:
    print(f"\n  Multiple namespaces found: {namespaces}")
    # Pick the one with the most vectors
    active_namespace = max(
        namespaces,
        key=lambda ns: stats.namespaces[ns].vector_count
    )
    print(f"  Largest namespace (most vectors): '{active_namespace}'")

# ── 2. Test a raw query with a dummy vector ───────────────
print(f"\n  [Step 2] Testing raw query with dummy vector...")
print(f"  Using namespace: '{active_namespace}'")

dummy_vector = [0.01] * config.EMBEDDING_DIMENSION

try:
    raw_result = index.query(
        vector          = dummy_vector,
        top_k           = 3,
        include_metadata = True,
        namespace       = active_namespace
    )

    if raw_result.matches:
        print(f"\n  RAW QUERY WORKS — found {len(raw_result.matches)} result(s):")
        for m in raw_result.matches:
            print(f"    ID    : {m.id}")
            print(f"    Score : {m.score:.4f}")
            meta = m.metadata or {}
            print(f"    File  : {meta.get('source_file', 'N/A')}")
            print(f"    Page  : {meta.get('page_number', 'N/A')}")
            print(f"    Text  : {str(meta.get('text', ''))[:80]}...")
            print()
    else:
        print("  Raw query returned 0 results — vectors may be corrupted.")

except Exception as e:
    print(f"  Raw query failed: {e}")

# ── 3. Print the fix ──────────────────────────────────────
print("\n" + "="*60)
print("  FIX")
print("="*60)

if active_namespace == "":
    print("""
  Your vectors are in the DEFAULT namespace (empty string '').
  The pinecone_store.py query does not pass namespace=''.
  
  Fix already applied in the updated pinecone_store.py below.
  Just run:  python ingest.py --file <your_file>   (re-ingest is NOT needed)
  Then run:  python query.py --chat
""")
else:
    print(f"""
  Your vectors are in namespace: '{active_namespace}'
  But pinecone_store.py queries without specifying namespace.
  
  Fix: Add  namespace='{active_namespace}'  to the query call.
  Fix already applied in the updated pinecone_store.py below.
""")

print(f"  Active namespace to use: '{active_namespace}'")
print("="*60 + "\n")