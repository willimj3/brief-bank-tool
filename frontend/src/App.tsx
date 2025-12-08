import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { FileText, PenTool, Database } from 'lucide-react';
import BriefBank from './components/BriefBank';
import NewDraft from './components/NewDraft';
import DraftWorkflow from './components/DraftWorkflow';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Brief Bank Tool
                </h1>
              </div>
              <nav className="flex gap-6">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
                  }
                >
                  <Database className="w-4 h-4" />
                  Brief Bank
                </NavLink>
                <NavLink
                  to="/new-draft"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
                  }
                >
                  <PenTool className="w-4 h-4" />
                  New Draft
                </NavLink>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<BriefBank />} />
            <Route path="/new-draft" element={<NewDraft />} />
            <Route path="/draft/:draftId" element={<DraftWorkflow />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
