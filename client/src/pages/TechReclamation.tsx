import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ErreurApi } from '../api';
import { useAuth } from '../auth';
import { Alerte, Champ, EnTete, PiedDePage, jjmmaaaa } from '../composants/commun';

interface InfoVelo { numero_serie: string; type: string; couleur: string; station: string | null; reclamation_ouverte: number }
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Écran 21 – CU8 réclamation (technicien et date renseignés automatiquement). */
export function TechReclamation() {
  const [params] = useSearchParams();
  const { utilisateur } = useAuth();
  const [velo, setVelo] = useState(params.get('velo') ?? '');
  const [diagnostic, setDiagnostic] = useState('');
  const [info, setInfo] = useState<InfoVelo | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad'; texte: string; champ?: string } | null>(null);

  useEffect(() => {
    setInfo(null);
    if (!velo.trim()) return;
    const t = setTimeout(() => {
      api.get<{ velo: InfoVelo }>(`/reclamation/velo/${encodeURIComponent(velo.trim())}`).then((r) => setInfo(r.velo)).catch(() => setInfo(null));
    }, 250);
    return () => clearTimeout(t);
  }, [velo]);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/reclamations', { numero_serie: velo, diagnostic });
      setMsg({ type: 'ok', texte: `Réclamation du vélo ${velo.toUpperCase()} envoyée au Responsable.` });
      setDiagnostic('');
      setVelo('');
    } catch (err) {
      setMsg({ type: 'bad', texte: (err as Error).message, champ: (err as ErreurApi).champ });
    }
  };

  return (
    <>
      <EnTete titre="Réclamation de réparation" sousTitre="Décrire la panne constatée lors du contrôle." />
      <div className="g2">
        <form className="card" onSubmit={envoyer} noValidate>
          <h3>Réclamation</h3>
          <div className="g2">
            <Champ libelle="Vélo" erreur={msg?.type === 'bad' && (msg.champ === 'numero_serie' || msg.champ === 'velo') ? msg.texte : null}
              aide={info ? `${info.type} · ${info.couleur} · ${info.station ?? 'hors station'}` : velo ? 'Vélo introuvable' : undefined}>
              <span className="in"><input type="text" value={velo} onChange={(e) => setVelo(e.target.value)} placeholder="Ex. : VS-0201" /></span>
            </Champ>
            <Champ libelle="Date"><span className="in ro"><input type="text" value={jjmmaaaa(aujourdhui())} readOnly /></span></Champ>
          </div>
          <Champ libelle="Technicien"><span className="in ro"><input type="text" value={utilisateur?.nom ?? ''} readOnly /></span></Champ>
          <Champ libelle="Diagnostic" erreur={msg?.type === 'bad' && msg.champ === 'diagnostic' ? msg.texte : null}>
            <textarea value={diagnostic} onChange={(e) => setDiagnostic(e.target.value)} placeholder="Décrire la panne" />
          </Champ>
          {info?.reclamation_ouverte ? <Alerte type="warn">Ce vélo a déjà une réclamation ouverte.</Alerte> : null}
          {msg && (msg.type === 'ok' || !msg.champ) && <Alerte type={msg.type} onFermer={() => setMsg(null)}>{msg.texte}</Alerte>}
          <div className="btns">
            <button type="submit" className="btn p">Envoyer</button>
            <Link to="/controle" className="btn">Annuler</Link>
          </div>
        </form>
        <section className="card">
          <h3>Rappel</h3>
          <div className="mut">La réclamation sera transmise au Responsable pour planifier la réparation.</div>
          <Link to="/controle" className="btn" style={{ alignSelf: 'flex-start' }}>Retour au contrôle quotidien</Link>
        </section>
      </div>
      <PiedDePage />
    </>
  );
}
