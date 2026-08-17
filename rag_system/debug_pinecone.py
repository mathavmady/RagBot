# debug_pinecone.py
# ----------------------------------------------------------
# Run this script to diagnose why Pinecone returns 0 results.
# It checks:
#   1. Which index name is in your .env
#   2. Whether that index exists in Pinecone
#   3. How many vectors are stored
#   4. Lists a sample of stored vector IDs
#
# Run:
#   python debug_pinecone.py
# ----------------------------------------------------------

import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

import config

print("\n" + "="*60)
print("  Pinecone Debug Report")
print("="*60)

# ── 1. Show what your .env says ───────────────────────────
print(f"\n  [.env settings]")
print(f"  PINECONE_INDEX_NAME : '{config.PINECONE_INDEX_NAME}'")
print(f"  PINECONE_CLOUD      : '{config.PINECONE_CLOUD}'")
print(f"  PINECONE_REGION     : '{config.PINECONE_REGION}'")
print(f"  EMBEDDING_DIMENSION : {config.EMBEDDING_DIMENSION}")

# ── 2. Connect and list ALL indexes in your Pinecone account ──
print(f"\n  [Connecting to Pinecone...]")
from pinecone import Pinecone

pc = Pinecone(api_key=config.PINECONE_API_KEY)

all_indexes = pc.list_indexes()
index_names = [idx.name for idx in all_indexes]

print(f"\n  [All indexes in your Pinecone account]")
if index_names:
    for name in index_names:
        marker = "  <-- this is what .env says" if name == config.PINECONE_INDEX_NAME else ""
        print(f"    - '{name}'{marker}")
else:
    print("    (no indexes found — nothing has been stored yet)")

# ── 3. Check if the configured index exists ───────────────
print(f"\n  [Checking configured index: '{config.PINECONE_INDEX_NAME}']")

if config.PINECONE_INDEX_NAME not in index_names:
    print(f"\n  !! INDEX MISMATCH DETECTED !!")
    print(f"  Your .env says PINECONE_INDEX_NAME = '{config.PINECONE_INDEX_NAME}'")
    print(f"  But this index does NOT exist in your account.")
    if index_names:
        print(f"\n  The indexes that DO exist are: {index_names}")
        print(f"\n  FIX: Update your .env file:")
        print(f"       PINECONE_INDEX_NAME={index_names[0]}")
    print()
    sys.exit(1)

# ── 4. Show vector count ──────────────────────────────────
index = pc.Index(config.PINECONE_INDEX_NAME)
stats = index.describe_index_stats()

print(f"  Total vectors stored : {stats.total_vector_count}")
print(f"  Dimension            : {stats.dimension}")

if stats.total_vector_count == 0:
    print(f"\n  !! NO VECTORS STORED !!")
    print(f"  The index exists but is EMPTY.")
    print(f"  You need to run the ingestion first:")
    print(f"\n    python ingest.py --file \"Artificial Intelligence.pdf\"")
    print()
    sys.exit(1)

# ── 5. Fetch sample vector IDs to confirm format ─────────
print(f"\n  [Sample vector IDs stored in Pinecone]")
try:
    # List a few vector IDs to see what's actually stored
    results = index.list(limit=10)
    ids = list(results)
    if ids:
        print(f"  First {len(ids)} vector ID(s):")
        for vid in ids[:10]:
            print(f"    - {vid}")
    else:
        print("  (could not list IDs — but vectors exist per stats)")
except Exception as e:
    print(f"  (list not supported on this tier: {e})")

print(f"\n  [Summary]")
print(f"  Index '{config.PINECONE_INDEX_NAME}' has {stats.total_vector_count} vectors.")
print(f"  Everything looks correct — query should work.")
print()