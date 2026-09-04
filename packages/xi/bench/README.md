# Xi benchmarks

Run the router microbenchmark from the repository root:

```sh
bun run --filter @xinkjs/xi bench
```

The benchmark isolates each route shape, warms up the router, and reports the median of five samples. Results are directional and should be compared on the same machine with minimal background load.

## Optimization record

Measured with Node 26.7.0 on the same development machine. Values are operations per second.

| Case | Correctness baseline | Compiled edges | Allocation reduction | Lazy maps |
| --- | ---: | ---: | ---: | ---: |
| Static | 9.74M | 10.26M | 9.31M | 11.05M |
| Dynamic | 6.06M | 7.21M | 6.89M | 7.89M |
| Matcher | 2.66M | 6.11M | 6.03M | 5.67M |
| Mixed | 5.12M | 6.01M | 7.19M | 6.90M |
| Mixed matcher | 2.63M | 4.75M | 5.17M | 5.16M |
| Wildcard | 3.25M | 3.71M | 3.56M | 3.23M |
| Eight dynamic parameters | 1.00M | 1.14M | 2.35M | 2.49M |
| 100 matcher siblings | 45.5K | 468K | 576K | 547K |
| Miss after matcher scan | 47.2K | 466K | 487K | 504K |

For 20,000 registered routes, lazy maps reduced allocated child maps from 120,006 to 20,002 across 40,002 nodes. The approximate observed heap delta fell from 35.6 MiB to 14-17 MiB, and registration time fell from 4.46 microseconds to approximately 3.7 microseconds per route. Heap snapshots include runtime noise; the exact allocated-map count is the stable memory indicator.

An index-based pathname scanner was also tested. It improved some shallow mixed and wildcard cases but made deep parameterized routes 15-25% slower, so it was rejected in favor of V8's optimized `split()` implementation.
