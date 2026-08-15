# Python Lists vs Generators — 60-second production script

- Series: Python to AI Engineer
- Runtime: exactly 1:00 at 30 FPS
- Deliveries: YouTube Short 9:16 and Instagram Reel 9:16
- Pace: natural local narration at 1.0×, with automatic speed-up disabled
- Audience: Python beginners preparing for AI engineering
- Learning objective: explain when Python materializes a complete list and when a generator computes values lazily.

## Timed narration and motion beats

| Time | Voiceover | Motion direction |
| --- | --- | --- |
| 0–5s | These two Python lines look alike, but they run very differently. | Open on the contrast, then let the first code card type on. |
| 5–13s | Square brackets build a list. Python loops now, calculates every square, and stores every result in memory. | Draw a storage boundary, then materialize `0, 1, 4, 9, 16` into retained slots. |
| 13–21s | Parentheses build a generator expression. Python returns a generator object before calculating the results. | Type the generator expression and draw an initially empty execution-state boundary. |
| 21–34s | When next, or a for loop, asks for a value, Python resumes the generator, calculates one item, yields it, then pauses with its state saved. Ask again, and it continues. | Pulse `next()`, travel one value across the connector, then highlight the retained state. |
| 34–44s | Lists support indexing, length, reuse, and repeated passes. Generators produce values once as you iterate, so an exhausted generator stays exhausted. | Keep both code forms available as context while the two trade-offs appear. |
| 44–55s | Use a list when you need the whole collection or random access. Use a generator for large files, database rows, model batches, or streaming pipelines where holding everything wastes memory. | Clear the code cards, then reveal the decision rule and streaming examples without information stacking. |
| 55–60s | Same loop idea; different runtime. Follow for more Python foundations for AI engineering, save this comparison, and use it in your next project. | Clear the runtime diagram, reveal the centered decision hierarchy, land the save cue, and hold on `WHOLE COLLECTION ↔ ONE-VALUE FLOW`. |

## Runnable example

```python
data = range(5)

squares_list = [n * n for n in data]
squares_generator = (n * n for n in data)

print(squares_list)
print(next(squares_generator))
print(next(squares_generator))
print(list(squares_generator))
```

Expected output:

```text
[0, 1, 4, 9, 16]
0
1
[4, 9, 16]
```

The final conversion shows only the remaining generator values because the
first two values were already consumed.

## Primary sources

- [Python Functional Programming HOWTO — generator expressions and list comprehensions](https://docs.python.org/3/howto/functional.html#generator-expressions-and-list-comprehensions)
- [Python Language Reference — yield expressions and suspended execution](https://docs.python.org/3/reference/expressions.html#yield-expressions)
- [Python glossary — generator iterator](https://docs.python.org/3/glossary.html#term-generator-iterator)

## Production command

```bash
npm run produce -- tech/python-lists-vs-generators --python .venv-tts/bin/python3 --force
```
