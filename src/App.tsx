import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, Settings, Bookmark } from 'lucide-react';
import clsx from 'clsx';
import Opportunities from './pages/Opportunities';
import MyExams from './pages/MyExams';
import MapView from './pages/Map';

function Sidebar() {
  const location = useLocation();
  
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Oportunidades' },
    { to: '/my-exams', icon: Bookmark, label: 'Meus Concursos' },
    { to: '/map', icon: MapIcon, label: 'Mapa' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight">Concursos BR</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                'flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors',
                isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon size={20} />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<Opportunities />} />
            <Route path="/my-exams" element={<MyExams />} />
            <Route path="/map" element={<MapView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
