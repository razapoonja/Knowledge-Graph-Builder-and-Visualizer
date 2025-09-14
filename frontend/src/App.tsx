import { useEffect, useState } from 'react'
import { useGraphStore } from './store/useGraphStore'
import GraphView from './components/GraphView'
import PropertiesPanel from './components/PropertiesPanel'
import ImportPanel from './components/ImportPanel'

export default function App() {
    const load = useGraphStore(s => s.load)
    const setSearch = useGraphStore(s => s.setSearch)
    const search = useGraphStore(s => s.search)
    const [showImport, setShowImport] = useState(false)

    useEffect(() => { load() }, [load])

    return (
        <div className="h-full grid grid-cols-[1fr_320px]">
            <div className="relative flex flex-col">
                <div className="flex items-center gap-2 p-3 border-b bg-white">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search nodes…"
                        className="rounded-md border px-3 py-2 w-72"
                    />

                    <GraphView.Toolbar />

                    <button onClick={() => setShowImport(true)} className="ml-auto rounded-md border px-3 py-2">
                        Import
                    </button>
                </div>

                <GraphView />
                {showImport && <ImportPanel onClose={() => setShowImport(false)} />}
            </div>

            <div className="border-l bg-white">
                <PropertiesPanel />
            </div>
        </div>
    )
    }
