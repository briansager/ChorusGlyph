export function App() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col overflow-hidden rounded-3xl border border-blue-900/60 bg-slate-900 shadow-2xl shadow-blue-950/30 sm:min-h-[calc(100vh-5rem)]">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-5 sm:px-10">
          <p className="text-lg font-semibold tracking-tight text-blue-300">ChorusGlyph</p>
          <span className="rounded-full border border-blue-800/70 bg-blue-950/50 px-3 py-1 text-xs font-medium text-blue-200">
            Milestone 1
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center px-6 py-16 sm:px-16 lg:px-24">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
              Sing together, understand every line
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              A multilingual sing-along app.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              ChorusGlyph is a privacy-conscious app for exploring songs with readable,
              editable romanized readings across languages.
            </p>
            <div className="mt-10 rounded-2xl border border-blue-800/60 bg-blue-950/40 p-5 text-blue-100 sm:p-6">
              <p className="font-medium">Synced lyrics will be added in a later milestone.</p>
              <p className="mt-2 text-sm leading-6 text-blue-200/80">
                This starter page is the foundation for the lyric and now-playing experiences to come.
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-800 px-6 py-5 text-sm text-slate-500 sm:px-10">
          Built as an independent portfolio project by Brian Sager.
        </footer>
      </div>
    </main>
  )
}
