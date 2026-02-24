import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Check, X, Search, Sparkles, Loader2, Filter, ArrowUp, ArrowDown, ArrowUpDown, Download, Calendar, ChevronDown, ChevronRight, BookOpen, Briefcase } from 'lucide-react';
import { useConcursoStore, Concurso } from '../store';
import { CSVUpload } from '../components/CSVUpload';
import { identifyMultipleUFs, identifyUFWithMaps, standardizeDates } from '../services/aiService';
import clsx from 'clsx';
import Papa from 'papaparse';

type SortKey = keyof Concurso | 'status';

export default function Opportunities() {
  const { concursos, markInterest, updateConcurso } = useConcursoStore();
  const [filter, setFilter] = useState('');
  const [ufFilter, setUfFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [isRefiningDates, setIsRefiningDates] = useState(false);
  const [enrichStatus, setEnrichStatus] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  
  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState(50);
  const observerTarget = useRef(null);

  const getEditalStatus = useCallback((registrationEnd: string, examDate: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const parseDate = (dateStr: string) => {
      if (!dateStr || /suspenso|definir|cancelado|n\/a/i.test(dateStr)) return null;
      
      const parts = dateStr.split('/');
      if (parts.length < 2) return null;
      
      const day = parseInt(parts[0].replace(/\D/g, ''));
      const month = parseInt(parts[1]) - 1;
      const year = parts.length === 3 ? parseInt(parts[2]) : currentYear;
      
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    };

    const regDate = parseDate(registrationEnd);
    const exDate = parseDate(examDate);

    if (regDate && regDate > now) return 'Aberto';
    if (exDate && exDate > now) return 'Prova Agendada';
    if (regDate || exDate) return 'Encerrado';
    
    return 'N/A';
  }, []);

  const handleAIEnrich = async () => {
    const targets = concursos
      .filter(c => c.location === 'N/A' || !c.location || c.location === '')
      .slice(0, 15);

    if (targets.length === 0) {
      alert('Todos os concursos já possuem UF identificada ou a lista está vazia.');
      return;
    }

    setIsEnriching(true);
    setEnrichStatus('Identificando UFs via IA...');
    try {
      const results = await identifyMultipleUFs(targets.map(t => ({ id: t.id, name: t.institution })));
      
      const pendingFallback: { id: string, name: string }[] = [];

      results.forEach(res => {
        if (res.uf === 'N/A') {
          const target = targets.find(t => t.id === res.id);
          if (target) pendingFallback.push({ id: target.id, name: target.institution });
        } else {
          updateConcurso(res.id, { location: res.uf });
        }
      });

      if (pendingFallback.length > 0) {
        setEnrichStatus(`Refinando ${pendingFallback.length} UFs via Google Maps...`);
        for (const item of pendingFallback) {
          const uf = await identifyUFWithMaps(item.name);
          if (uf) {
            updateConcurso(item.id, { location: uf });
          }
        }
      }

      alert('Processo de identificação concluído!');
    } catch (error) {
      console.error(error);
      alert('Erro ao identificar UFs.');
    } finally {
      setIsEnriching(false);
      setEnrichStatus('');
    }
  };

  const handleRefineDates = async () => {
    const targets: { id: string, rawDate: string, field: 'registration_end' | 'exam_date' | 'exemption_period', concursoId: string }[] = [];
    
    concursos.forEach(c => {
      // Check registration_end
      targets.push({ id: `${c.id}|registration_end`, rawDate: c.registration_end, field: 'registration_end', concursoId: c.id });
      // Check exam_date
      targets.push({ id: `${c.id}|exam_date`, rawDate: c.exam_date, field: 'exam_date', concursoId: c.id });
      // Check exemption_period
      targets.push({ id: `${c.id}|exemption_period`, rawDate: c.exemption_period, field: 'exemption_period', concursoId: c.id });
    });

    const batch = targets.slice(0, 30); // Batch size for dates

    if (batch.length === 0) {
      alert('Nenhuma data curta encontrada para refinar ou a lista está vazia.');
      return;
    }

    setIsRefiningDates(true);
    try {
      const results = await standardizeDates(batch.map(t => ({ id: t.id, rawDate: t.rawDate })));
      
      results.forEach(res => {
        const lastPipeIndex = res.id.lastIndexOf('|');
        if (lastPipeIndex === -1) return;
        
        const concursoId = res.id.substring(0, lastPipeIndex);
        const field = res.id.substring(lastPipeIndex + 1) as 'registration_end' | 'exam_date' | 'exemption_period';
        
        updateConcurso(concursoId, { [field]: res.cleanDate });
      });

      alert(`${results.length} datas refinadas com sucesso!`);
    } catch (error) {
      console.error(error);
      alert('Erro ao refinar datas via IA.');
    } finally {
      setIsRefiningDates(false);
    }
  };

  const handleDownload = () => {
    const dataToExport = processedConcursos.map(c => ({
      Fonte: c.source,
      Orgao: c.institution,
      UF: c.location,
      Banca: c.board,
      Cargos: c.positions,
      Vagas: c.vacancies,
      Salario: c.salary,
      Fim_Inscricoes: c.registration_end,
      Periodo_Isencao: c.exemption_period,
      Data_Prova: c.exam_date,
      Disciplinas: c.subjects,
      Status_Edital: getEditalStatus(c.registration_end, c.exam_date),
      Link: c.link
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `concursos_oportunidades_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ufs = useMemo(() => {
    const set = new Set(concursos.map(c => c.location).filter(Boolean));
    return Array.from(set).sort();
  }, [concursos]);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedConcursos = useMemo(() => {
    // 1. Filter
    let result = concursos.filter(c => {
      const matchesText = 
        c.institution.toLowerCase().includes(filter.toLowerCase()) ||
        c.board.toLowerCase().includes(filter.toLowerCase()) ||
        c.source.toLowerCase().includes(filter.toLowerCase());
      
      const matchesUf = ufFilter === '' || c.location === ufFilter;
      
      const status = getEditalStatus(c.registration_end, c.exam_date);
      const matchesStatus = statusFilter === '' || status === statusFilter;
      
      return matchesText && matchesUf && matchesStatus;
    });

    // 2. Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.key === 'status') {
          valA = getEditalStatus(a.registration_end, a.exam_date);
          valB = getEditalStatus(b.registration_end, b.exam_date);
        } else {
          valA = a[sortConfig.key as keyof Concurso] || '';
          valB = b[sortConfig.key as keyof Concurso] || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [concursos, filter, ufFilter, statusFilter, sortConfig, getEditalStatus]);

  const visibleConcursos = useMemo(() => {
    return processedConcursos.slice(0, visibleCount);
  }, [processedConcursos, visibleCount]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < processedConcursos.length) {
          setVisibleCount(prev => prev + 50);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [processedConcursos.length, visibleCount]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (!sortConfig || sortConfig.key !== column) return <ArrowUpDown size={14} className="ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-indigo-600" /> : <ArrowDown size={14} className="ml-1 text-indigo-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Oportunidades</h2>
          <p className="text-slate-500">Encontre e gerencie concursos públicos via CSV.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefineDates}
            disabled={isRefiningDates || concursos.length === 0}
            className="flex items-center space-x-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            title="Padronizar datas de inscrição via IA"
          >
            {isRefiningDates ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
            <span>{isRefiningDates ? 'Refinando...' : 'Refinar Datas'}</span>
          </button>
          <button
            onClick={handleAIEnrich}
            disabled={isEnriching || concursos.length === 0}
            className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {isEnriching ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <span>{isEnriching ? (enrichStatus || 'Identificando...') : 'Identificar UFs'}</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={processedConcursos.length === 0}
            className="flex items-center space-x-2 bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <Download size={18} />
            <span>Download</span>
          </button>
          <CSVUpload />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <Search size={20} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por órgão, banca ou fonte..." 
            className="flex-1 outline-none text-slate-700"
            value={filter}
            onChange={e => {
              setFilter(e.target.value);
              setVisibleCount(50);
            }}
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-48 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
            <Filter size={20} className="text-slate-400" />
            <select 
              className="flex-1 outline-none text-slate-700 bg-transparent"
              value={ufFilter}
              onChange={e => {
                setUfFilter(e.target.value);
                setVisibleCount(50);
              }}
            >
              <option value="">Todas as UFs</option>
              {ufs.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 md:w-48 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
            <Filter size={20} className="text-slate-400" />
            <select 
              className="flex-1 outline-none text-slate-700 bg-transparent"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setVisibleCount(50);
              }}
            >
              <option value="">Todos os Status</option>
              <option value="Aberto">Aberto</option>
              <option value="Prova Agendada">Prova Agendada</option>
              <option value="Encerrado">Encerrado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('institution')}>
                  <div className="flex items-center">Órgão / Fonte <SortIcon column="institution" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('location')}>
                  <div className="flex items-center">UF <SortIcon column="location" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('board')}>
                  <div className="flex items-center">Banca <SortIcon column="board" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center">Status Edital <SortIcon column="status" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('salary')}>
                  <div className="flex items-center">Salário <SortIcon column="salary" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('registration_end')}>
                  <div className="flex items-center">Fim Inscrições <SortIcon column="registration_end" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('exemption_period')}>
                  <div className="flex items-center">Período Isenção <SortIcon column="exemption_period" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('exam_date')}>
                  <div className="flex items-center">Data Prova <SortIcon column="exam_date" /></div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center">Link</div>
                </th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {concursos.length === 0 ? (
                <tr><td colSpan={11} className="px-6 py-8 text-center text-slate-500">Nenhum concurso encontrado. Faça o upload do arquivo CSV.</td></tr>
              ) : processedConcursos.length === 0 ? (
                <tr><td colSpan={11} className="px-6 py-8 text-center text-slate-500">Nenhum resultado para a busca.</td></tr>
              ) : (
                <>
                  {visibleConcursos.map((c, index) => {
                    const status = getEditalStatus(c.registration_end, c.exam_date);
                    const isExpanded = expandedRow === c.id;
                    
                    return (
                      <React.Fragment key={`${c.id}-${index}`}>
                        <tr 
                          className={clsx(
                            "transition-all duration-300 ease-in-out cursor-pointer",
                            c.interest_status === 'interested' ? "bg-indigo-50/50" : 
                            c.interest_status === 'ignored' ? "bg-slate-50/50 opacity-50 grayscale" : 
                            "hover:bg-slate-50/80",
                            isExpanded && "bg-slate-50/80"
                          )}
                          onClick={() => setExpandedRow(isExpanded ? null : c.id)}
                        >
                          <td className="px-6 py-4">
                            {isExpanded ? <ChevronDown size={18} className="text-indigo-600" /> : <ChevronRight size={18} className="text-slate-400" />}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{c.institution}</div>
                            <div className="text-slate-500 text-xs mt-1">{c.source}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{c.location}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{c.board}</td>
                          <td className="px-6 py-4">
                            <span className={clsx(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              status === 'Aberto' ? "bg-emerald-100 text-emerald-800" :
                              status === 'Prova Agendada' ? "bg-blue-100 text-blue-800" :
                              status === 'Encerrado' ? "bg-slate-100 text-slate-600" :
                              "bg-amber-100 text-amber-800"
                            )}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium text-indigo-600">{c.salary}</td>
                          <td className="px-6 py-4 text-slate-600">{c.registration_end}</td>
                          <td className="px-6 py-4 text-slate-600">{c.exemption_period}</td>
                          <td className="px-6 py-4 text-slate-600">{c.exam_date}</td>
                          <td className="px-6 py-4 text-slate-600">
                            {c.link && c.link !== 'N/A' ? (
                              <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline" onClick={(e) => e.stopPropagation()}>Acessar</a>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                            {c.interest_status === 'interested' ? (
                              <div className="flex items-center justify-end space-x-2">
                                <span className="text-indigo-600 font-medium text-xs bg-indigo-50 px-2 py-1 rounded">Interessado</span>
                                <button 
                                  onClick={() => markInterest(c.id, 'none')}
                                  className="p-1 text-slate-400 hover:text-rose-500 active:scale-90 transition-all duration-200"
                                  title="Remover interesse"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : c.interest_status === 'ignored' ? (
                              <div className="flex items-center justify-end space-x-2">
                                <span className="text-slate-400 font-medium text-xs bg-slate-100 px-2 py-1 rounded">Ignorado</span>
                                <button 
                                  onClick={() => markInterest(c.id, 'none')}
                                  className="p-1 text-slate-400 hover:text-indigo-500 active:scale-90 transition-all duration-200"
                                  title="Restaurar"
                                >
                                  <Check size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end space-x-1">
                                <button 
                                  onClick={() => markInterest(c.id, 'interested')}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-100 active:scale-90 rounded-md transition-all duration-200"
                                  title="Tenho Interesse"
                                >
                                  <Check size={18} />
                                </button>
                                <button 
                                  onClick={() => markInterest(c.id, 'ignored')}
                                  className="p-1.5 text-rose-600 hover:bg-rose-100 active:scale-90 rounded-md transition-all duration-200"
                                  title="Ignorar"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={11} className="px-12 py-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 text-slate-900 font-semibold">
                                    <Briefcase size={18} className="text-indigo-600" />
                                    <span>Cargos</span>
                                  </div>
                                  <div className="bg-white p-4 rounded-lg border border-slate-200 text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {c.positions || 'Não informado'}
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 text-slate-900 font-semibold">
                                    <BookOpen size={18} className="text-indigo-600" />
                                    <span>Disciplinas</span>
                                  </div>
                                  <div className="bg-white p-4 rounded-lg border border-slate-200 text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {c.subjects || 'Não informado'}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {/* Infinite Scroll Sentinel */}
                  <tr ref={observerTarget}>
                    <td colSpan={11} className="p-4 text-center text-slate-400 text-xs">
                      {visibleCount < processedConcursos.length ? 'Carregando mais...' : 'Fim da lista'}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
