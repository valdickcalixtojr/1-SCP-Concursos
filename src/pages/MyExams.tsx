import { useState } from 'react';
import { MapPin, Calendar, FileText, ExternalLink, Save, Map as MapIcon, Check } from 'lucide-react';
import { useConcursoStore, Concurso } from '../store';

export default function MyExams() {
  const { concursos, updateConcurso } = useConcursoStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Concurso>>({});
  const [enriching, setEnriching] = useState<string | null>(null);

  const myExams = concursos.filter(c => c.interest_status === 'interested');

  const handleEdit = (concurso: Concurso) => {
    setEditingId(concurso.id);
    setEditForm({
      is_enrolled: concurso.is_enrolled,
      exam_location: concurso.exam_location || '',
      notes: concurso.notes || ''
    });
  };

  const handleSave = (id: string) => {
    updateConcurso(id, editForm);
    setEditingId(null);
  };

  const enrichLocation = async (id: string, locationQuery: string) => {
    setEnriching(id);
    try {
      // Mocking geocoding for client-side
      const lat = -23.55 + (Math.random() * 0.1);
      const lng = -46.63 + (Math.random() * 0.1);
      
      updateConcurso(id, { latitude: lat, longitude: lng });
      alert('Localização aproximada definida no mapa!');
    } catch (e) {
      console.error(e);
    }
    setEnriching(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Minhas Inscrições</h2>
        <p className="text-slate-500">Gerencie os concursos que você está acompanhando.</p>
      </div>

      {myExams.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
          <p className="text-slate-500">Você ainda não marcou nenhum concurso como interessado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {myExams.map((c, index) => (
            <div key={`${c.id}-${index}`} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{c.institution}</h3>
                  <p className="text-indigo-600 text-sm font-medium">{c.source}</p>
                </div>
                <a 
                  href={c.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <ExternalLink size={20} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Calendar size={16} className="text-slate-400" />
                  <span>Prova: {c.exam_date || 'A definir'}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400" />
                  <span>{c.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Calendar size={16} className="text-slate-400" />
                  <span>Inscrições: {c.registration_end || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Calendar size={16} className="text-slate-400" />
                  <span>Isenção: {c.exemption_period || 'N/A'}</span>
                </div>
              </div>

              {editingId === c.id ? (
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id={`enrolled-${c.id}`}
                      checked={editForm.is_enrolled}
                      onChange={e => setEditForm({...editForm, is_enrolled: e.target.checked})}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={`enrolled-${c.id}`} className="text-sm font-medium text-slate-700">Já estou inscrito</label>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Local de Prova</label>
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        value={editForm.exam_location}
                        onChange={e => setEditForm({...editForm, exam_location: e.target.value})}
                        placeholder="Ex: Escola Estadual..."
                        className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button 
                        onClick={() => enrichLocation(c.id, editForm.exam_location || '')}
                        disabled={enriching === c.id || !editForm.exam_location}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                        title="Buscar no Mapa"
                      >
                        <MapIcon size={18} className={enriching === c.id ? 'animate-pulse' : ''} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notas / Lembretes</label>
                    <textarea 
                      value={editForm.notes}
                      onChange={e => setEditForm({...editForm, notes: e.target.value})}
                      placeholder="Anotações sobre o edital, matérias..."
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                    />
                  </div>

                  <button 
                    onClick={() => handleSave(c.id)}
                    className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Save size={18} />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${c.is_enrolled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-sm font-medium text-slate-700">
                        {c.is_enrolled ? 'Inscrito' : 'Não inscrito'}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleEdit(c)}
                      className="text-indigo-600 text-sm font-medium hover:underline"
                    >
                      Editar Detalhes
                    </button>
                  </div>

                  {c.exam_location && (
                    <div className="flex items-start space-x-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <MapPin size={16} className="text-slate-400 mt-0.5" />
                      <span>{c.exam_location}</span>
                    </div>
                  )}

                  {c.notes && (
                    <div className="flex items-start space-x-2 text-sm text-slate-600 bg-indigo-50/50 p-2 rounded-lg">
                      <FileText size={16} className="text-indigo-400 mt-0.5" />
                      <p className="italic">{c.notes}</p>
                    </div>
                  )}

                  {c.latitude && c.longitude && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center">
                      <Check size={12} className="mr-1" /> Localização mapeada
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
