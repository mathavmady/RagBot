# embedder/embedding_model.py
# ----------------------------------------------------------
# Loads the Qwen3-Embedding-0.6B model from HuggingFace and
# converts text into dense vector embeddings.
#
# Key design decisions:
#   - Model is loaded ONCE and reused (expensive to reload).
#   - Texts are processed in batches to avoid OOM errors.
#   - Embeddings are L2-normalized (standard for cosine similarity).
# ----------------------------------------------------------

import torch
import numpy as np
from typing import List
from loguru import logger

import config


# ── Module-level model cache ──────────────────────────────
# We store the loaded model and tokenizer here so they are
# only loaded once during the entire program lifetime.
_tokenizer = None
_model     = None


def _load_model():
    """
    Load the Qwen3 embedding model from HuggingFace.
    Called automatically on first use.
    """
    global _tokenizer, _model

    if _tokenizer is not None and _model is not None:
        return   # Already loaded — skip

    logger.info(f"Loading embedding model: {config.EMBEDDING_MODEL_NAME}")
    logger.info("This may take a few minutes on first run (downloads ~600MB)...")

    from transformers import AutoTokenizer, AutoModel

    _tokenizer = AutoTokenizer.from_pretrained(
        config.EMBEDDING_MODEL_NAME,
        trust_remote_code=True
    )
    _model = AutoModel.from_pretrained(
        config.EMBEDDING_MODEL_NAME,
        trust_remote_code=True
    )

    # Use GPU if available, otherwise CPU
    device = "cuda" if torch.cuda.is_available() else "cpu"
    _model = _model.to(device)
    _model.eval()   # Set to inference mode (disables dropout, etc.)

    logger.success(f"Embedding model loaded on {device.upper()}.")


def _mean_pooling(model_output, attention_mask):
    """
    Average the token embeddings weighted by the attention mask.
    This converts variable-length token sequences into a single
    fixed-size vector per text.
    """
    token_embeddings = model_output.last_hidden_state

    # Expand mask to match embedding dimensions
    input_mask_expanded = (
        attention_mask.unsqueeze(-1)
                      .expand(token_embeddings.size())
                      .float()
    )

    # Weighted sum divided by total weight
    sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, dim=1)
    sum_mask       = torch.clamp(input_mask_expanded.sum(dim=1), min=1e-9)

    return sum_embeddings / sum_mask


def embed_texts(texts: List[str], batch_size: int = 16) -> List[List[float]]:
    """
    Convert a list of text strings into embedding vectors.

    Args:
        texts      : list of strings to embed
        batch_size : number of texts to process at once
                     (reduce if you get out-of-memory errors)

    Returns:
        List of embedding vectors. Each vector is a list of floats
        with length = EMBEDDING_DIMENSION (1024 for Qwen3-0.6B).
    """
    _load_model()   # Ensure model is loaded

    device = next(_model.parameters()).device
    all_embeddings = []

    logger.info(f"Embedding {len(texts)} texts in batches of {batch_size}...")

    for batch_start in range(0, len(texts), batch_size):
        batch_texts = texts[batch_start : batch_start + batch_size]

        # Tokenize the batch
        encoded = _tokenizer(
            batch_texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt"
        )

        # Move tensors to the correct device
        input_ids      = encoded["input_ids"].to(device)
        attention_mask = encoded["attention_mask"].to(device)

        # Run the model (no gradient needed — we're just doing inference)
        with torch.no_grad():
            model_output = _model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )

        # Pool token embeddings → one vector per text
        batch_embeddings = _mean_pooling(model_output, attention_mask)

        # L2-normalize so cosine similarity == dot product
        batch_embeddings = torch.nn.functional.normalize(batch_embeddings, p=2, dim=1)

        # Convert to plain Python lists and collect
        all_embeddings.extend(batch_embeddings.cpu().numpy().tolist())

        logger.debug(f"  Embedded batch {batch_start // batch_size + 1} "
                     f"({len(batch_texts)} texts).")

    logger.success(f"Finished embedding {len(texts)} texts.")
    return all_embeddings


def embed_single_text(text: str) -> List[float]:
    """
    Convenience wrapper to embed a single string.
    Used for query embedding at retrieval time.

    Args:
        text : the query or text to embed

    Returns:
        A single embedding vector (list of floats).
    """
    results = embed_texts([text], batch_size=1)
    return results[0]