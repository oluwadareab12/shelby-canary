export default function DocsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">API Reference</h1>
      <p className="text-gray-400 mb-10">
        Shelby Canary exposes a REST API for programmatic access to dataset monitoring data.
      </p>

      <div className="flex flex-col gap-10">
        <section>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-mono bg-green-500/20 text-green-400 px-2 py-0.5 rounded">POST</span>
            <code className="text-sm font-mono text-white">/api/datasets/register</code>
          </div>
          <p className="text-sm text-gray-400 mb-3">Register a new dataset for monitoring.</p>
          <pre className="bg-[#111111] border border-[#222222] rounded-xl p-4 text-xs font-mono text-gray-300 overflow-x-auto">{`curl -X POST https://your-domain.vercel.app/api/datasets/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Dataset",
    "description": "Optional description",
    "dataset_url": "https://example.com/data.csv",
    "owner_wallet": "0xYourWalletAddress",
    "file_format": "csv",
    "check_interval_minutes": 15,
    "alert_email": "you@example.com"
  }'`}</pre>
          <pre className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-4 text-xs font-mono text-gray-400 mt-2 overflow-x-auto">{`// Response 201
{
  "id": "uuid",
  "name": "My Dataset",
  "canary_score": 100,
  "status": "healthy",
  ...
}`}</pre>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">GET</span>
            <code className="text-sm font-mono text-white">/api/datasets/:id</code>
          </div>
          <p className="text-sm text-gray-400 mb-3">Get full dataset status including recent check results and incidents.</p>
          <pre className="bg-[#111111] border border-[#222222] rounded-xl p-4 text-xs font-mono text-gray-300 overflow-x-auto">{`curl https://your-domain.vercel.app/api/datasets/YOUR_DATASET_ID`}</pre>
          <pre className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-4 text-xs font-mono text-gray-400 mt-2 overflow-x-auto">{`// Response 200
{
  "id": "uuid",
  "name": "My Dataset",
  "canary_score": 98.5,
  "status": "healthy",
  "uptime_24h": 100,
  "uptime_7d": 99.8,
  "avg_latency_ms": 240,
  "check_results": [...],
  "recent_incidents": [...]
}`}</pre>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">GET</span>
            <code className="text-sm font-mono text-white">/api/datasets/:id/incidents</code>
          </div>
          <p className="text-sm text-gray-400 mb-3">Get paginated incident history for a dataset.</p>
          <pre className="bg-[#111111] border border-[#222222] rounded-xl p-4 text-xs font-mono text-gray-300 overflow-x-auto">{`# All incidents (default limit 20)
curl https://your-domain.vercel.app/api/datasets/YOUR_DATASET_ID/incidents

# Only unresolved
curl https://your-domain.vercel.app/api/datasets/YOUR_DATASET_ID/incidents?resolved=false

# Custom limit
curl https://your-domain.vercel.app/api/datasets/YOUR_DATASET_ID/incidents?limit=50`}</pre>
          <pre className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-4 text-xs font-mono text-gray-400 mt-2 overflow-x-auto">{`// Response 200
[
  {
    "id": "uuid",
    "dataset_id": "uuid",
    "started_at": "2024-01-15T12:00:00Z",
    "resolved_at": "2024-01-15T12:05:00Z",
    "severity": "critical",
    "type": "outage",
    "description": "Dataset is unavailable.",
    "resolved": true
  }
]`}</pre>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">GET</span>
            <code className="text-sm font-mono text-white">/api/leaderboard</code>
          </div>
          <p className="text-sm text-gray-400 mb-3">Get top 20 most reliable datasets sorted by Canary Score.</p>
          <pre className="bg-[#111111] border border-[#222222] rounded-xl p-4 text-xs font-mono text-gray-300 overflow-x-auto">{`curl https://your-domain.vercel.app/api/leaderboard`}</pre>
          <pre className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-4 text-xs font-mono text-gray-400 mt-2 overflow-x-auto">{`// Response 200
[
  {
    "id": "uuid",
    "name": "My Dataset",
    "owner_wallet": "0x...",
    "canary_score": 99.1,
    "uptime_24h": 100,
    "certified": false,
    "status": "healthy",
    "total_checks": 2880
  }
]`}</pre>
        </section>

        <section className="border-t border-[#222222] pt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Canary Score Formula</h2>
          <pre className="bg-[#111111] border border-[#222222] rounded-xl p-4 text-xs font-mono text-gray-300 overflow-x-auto">{`score = 100
  - (100 - uptime_24h) × 0.4
  - (100 - uptime_7d) × 0.3
  - (100 - integrity_pass_rate) × 0.2
  - min(drift_events_30d × 2, 10)
  - latency_penalty (0 if <500ms, up to 5 if >2000ms)

range: 0–100, 1 decimal place`}</pre>
        </section>
      </div>
    </main>
  )
}
