# How RAG Works in 60 Seconds

- Runtime: exactly 60 seconds
- Delivery: YouTube Short and Instagram Reel, 9:16
- Narration speed: natural 1× (hard maximum 1×)
- Visual style: Whiteboard Light
- Motion timing: narration phrase anchors with deterministic preview fallbacks
- Motion graphics: typed query, drawn retrieval path, arrowhead, data-travel particle, pulse rings, and subtle mascot drift
- Technical rule: RAG augments the prompt at inference time; it does not retrain the LLM and does not guarantee truth

## 00:00–00:04 — Hook

Narration: An LLM cannot answer from private documents it never saw. RAG lets it retrieve evidence before answering.

Visual: Ask the central question, introduce the user’s refund-policy query, and highlight the knowledge gap.

## 00:04–00:16 — Index documents

Narration: First, before anyone asks, documents are split into useful chunks. An embedding model converts each chunk into a vector, and a vector database stores the vector with its original text.

Visual: Draw the document vector space and add refund, handbook, and FAQ chunks.

## 00:16–00:27 — Retrieve evidence

Narration: A user asks, “What is our refund policy?” The same embedding model creates a query vector. Retrieval compares it with stored vectors and selects the most relevant chunks.

Visual: Add the query vector and draw the nearest-neighbor connection to the refund chunk.

## 00:27–00:39 — Augment the prompt

Narration: The system does not train the language model again. It builds a prompt with instructions, the question, and retrieved evidence.

Visual: Assemble the prompt formula from the instructions, question, and selected evidence.

## 00:39–00:48 — Generate a grounded answer

Narration: The LLM reads that context and generates an answer grounded in those chunks, ideally with citations. If evidence is missing, it should say so.

Visual: Orbit represents the LLM, producing a grounded answer with citations.

## 00:48–00:55 — Limitations

Narration: RAG can reduce unsupported answers, but does not guarantee truth. Poor chunks, weak retrieval, or stale documents can still fail.

Visual: Show the evidence warning and emphasize that retrieval quality controls answer quality.

## 00:55–01:00 — Recap

Narration: Remember the flow: index documents, retrieve evidence, augment the prompt, then generate.

Visual: Reveal the four-step pipeline and hold for the final caption.
