import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useConcursoStore } from '../store';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapView() {
  const { concursos } = useConcursoStore();
  const mappedConcursos = concursos.filter(c => c.interest_status === 'interested' && c.latitude && c.longitude);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Mapa de Concursos</h2>
        <p className="text-slate-500">Visualize os locais de prova dos seus concursos de interesse.</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[500px]">
        <MapContainer 
          center={[-15.7801, -47.9292]} // Brasilia
          zoom={4} 
          style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mappedConcursos.map((c, index) => (
            <Marker key={`${c.id}-${index}`} position={[c.latitude!, c.longitude!]}>
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-slate-900 mb-1">{c.institution}</h3>
                  <p className="text-sm text-slate-600 mb-2">{c.source}</p>
                  <div className="text-xs space-y-1">
                    <p><strong>Vagas:</strong> {c.vacancies}</p>
                    <p><strong>Data da Prova:</strong> {c.exam_date || 'Não definida'}</p>
                    <p><strong>Local:</strong> {c.exam_location || c.location}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
