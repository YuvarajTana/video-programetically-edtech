# Python Before AI Engineering — 60-second production script

- Series: Python to AI Engineer
- Preset: `reel-concept`
- Runtime: exactly 1:00 at 30 FPS
- Deliveries: YouTube Short 9:16 and Instagram Reel 9:16
- Audience: beginners preparing for AI engineering
- Narration: 145 words, approximately 145 WPM
- Learning objective: give learners an ordered checklist of the Python concepts they should master before LLM applications, RAG, and AI agents.

## Timed narration and scenes

| # | Time | Length | Scene | Visual direction | Exact narration |
| --- | --- | ---: | --- | --- | --- |
| 1 | 0:00–0:03 | 3s | Title | Open with “Python Before AI” and the series label. | Before AI engineering, learn the Python that builds it. |
| 2 | 0:03–0:12 | 9s | Callout | Contrast learning every feature with learning a reliable core. | You do not need every feature. You need a reliable core that turns data into small, testable programs and services. |
| 3 | 0:12–0:21 | 9s | Compare | Put scalar values on the left and collections used by AI applications on the right. | Start with names, strings, numbers, booleans, and None. Master lists, tuples, sets, and dictionaries for records, chunks, messages, and structured model responses. |
| 4 | 0:21–0:30 | 9s | Code | Reveal the function parameters, then the list comprehension that filters dictionaries. | Learn conditions, loops, comprehensions, functions, parameters, and return values. They filter results, transform data, and keep each processing step testable. |
| 5 | 0:30–0:39 | 9s | Steps | Reveal Structure, Isolate, Exchange, and Recover in order. | Organize code with modules, imports, packages, and virtual environments. Read files, JSON, and environment variables. Catch expected failures with specific exceptions. |
| 6 | 0:39–0:48 | 9s | Steps | Progress from type hints and tests to generators, decorators, and asynchronous I/O. | Then add type hints, dataclasses, logging, tests, generators, decorators, and async await. Async helps while applications wait for APIs, databases, and model calls. |
| 7 | 0:48–0:57 | 9s | Architecture | Trace dictionaries and functions into tested RAG and agent services; connect async requests separately. | This maps directly to AI: dictionaries hold messages, functions become tools, async runs requests, and tested modules become reliable RAG and agent services. |
| 8 | 0:57–1:00 | 3s | Outro | Recap data, behavior, services, then point to LLM fundamentals. | Master this path, then start LLM fundamentals. |

## Runnable example

```python
results = [
    {"score": 0.92},
    {"score": 0.61},
]

def passing(rows, limit=.8):
    return [row for row in rows
            if row["score"] >= limit]

print(passing(results))
```

Expected output:

```text
[{'score': 0.92}]
```

## Primary sources

- [Python tutorial: values, assignment, strings, and lists](https://docs.python.org/3/tutorial/introduction.html)
- [Python tutorial: control flow, functions, parameters, and return values](https://docs.python.org/3/tutorial/controlflow.html)
- [Python tutorial: data structures and comprehensions](https://docs.python.org/3/tutorial/datastructures.html)
- [Python tutorial: modules and packages](https://docs.python.org/3/tutorial/modules.html)
- [Python tutorial: errors and exceptions](https://docs.python.org/3/tutorial/errors.html)
- [Python standard library: `asyncio`](https://docs.python.org/3/library/asyncio.html)

## Production commands

```bash
npm run typecheck
npm run validate -- tech/python-before-ai-engineering
npm run voice -- tech/python-before-ai-engineering --python .venv-tts/bin/python3
npm run render -- tech/python-before-ai-engineering
npm run package -- tech/python-before-ai-engineering
```
