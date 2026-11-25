import { useMemo, useState, type FormEvent } from 'react';
import { api, ErreurApi } from '../api';
import {
  Alerte, BoutonExport, Champ, Dialogue, EnTete, Filtre, Pagination, PiedDePage, PlusActions, Recherche,
  couleurCarre, exporterCSV, jjmmaaaa, norm, useDonnees, usePagination,
} from '../composants/commun';

interface Fournisseur { id: number; nom: string; adresse: string | null; telephone: string | null; email: string | null; velos_achetes: number }
const VIDE = { nom: '', adresse: '', telephone: '', email: '' };

/** Écran 05 – CU3 gérer les fournisseurs. */
export function Fournisseurs() {
  const { donnees, erreur, recharger } = useDonnees(() => api.get<{ fournisseurs: Fournisseur[] }>('/fournisseurs'));
  const [q, setQ] = useState('');
  const [filtre, setFiltre] = useState<'tous' | 'actifs' | 'sans'>('tous');
  const [form, setForm] = useState(VIDE);
  const [edition, setEdition] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'bad'; texte: string; champ?: string } | null>(null);
  const [voir, setVoir] = useState<{ f: Fournisseur; velos: { numero_serie: string; type: string; couleur: string; date_achat: string }[] } | null>(null);

  const lignes = useMemo(() => {
    let l = donnees?.fournisseurs ?? [];
    if (q) l = l.filter((f) => [f.nom, f.email, f.telephone, f.adresse].some((x) => norm(x).includes(norm(q))));
    if (filtre === 'actifs') l = l.filter((f) => f.velos_achetes > 0);
    if (filtre === 'sans') l = l.filter((f) => f.velos_achetes === 0);
    return l;
  }, [donnees, q, filtre]);
  const pag = usePagination(lignes, 8);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      if (edition) await api.put(`/fournisseurs/${edition}`, form);
      else await api.post('/fournisseurs', form);
      setMsg({ type: 'ok', texte: edition ? 'Fournisseur modifié.' : `Fournisseur « ${form.nom} » enregistré.` });
      setForm(VIDE);
      setEdition(null);
      recharger();
    } catch (err) {
      setMsg({ type: 'bad', texte: (err as Error).message, champ: (err as ErreurApi).champ });
    }
  };

  const modifier = (f: Fournisseur) => {
    setEdition(f.id);
    setForm({ nom: f.nom, adresse: f.adresse ?? '', telephone: f.telephone ?? '', email: f.email ?? '' });
    setMsg(null);
  };
  const supprimer = async (f: Fournisseur) => {
    if (!confirm(`Supprimer le fournisseur « ${f.nom} » ?`)) return;
    try {
      await api.del(`/fournisseurs/${f.id}`);
      setMsg({ type: 'ok', texte: `Fournisseur « ${f.nom} » supprimé.` });
      recharger();
    } catch (err) {
      setMsg({ type: 'bad', texte: (err as Error).message });
    }
  };
  const ouvrir = async (f: Fournisseur) => {
    const r = await api.get<{ velos: { numero_serie: string; type: string; couleur: string; date_achat: string }[] }>(`/fournisseurs/${f.id}`);
    setVoir({ f, velos: r.velos });
  };

  const champ = (k: keyof typeof VIDE, libelle: string, type = 'text') => (
    <Champ libelle={libelle} erreur={msg?.type === 'bad' && msg.champ === k ? msg.texte : null}>
      <span className="in"><input type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></span>
    </Champ>
  );

  return (
    <>
      <EnTete titre="Gérer les fournisseurs" sousTitre="Coordonnées des fournisseurs de vélos." />
      <Alerte>{erreur}</Alerte>
      <div className="g21">
        <section className="card">
          <div className="tbar">
            <Recherche valeur={q} onChange={setQ} placeholder="Rechercher un fournisseur…" />
            <Filtre libelle="Filtre" valeur={filtre} onChange={setFiltre}
              options={[['tous', 'Tous les fournisseurs'], ['actifs', 'Avec vélos achetés'], ['sans', 'Sans achat']]} />
            <BoutonExport onClick={() => exporterCSV('fournisseurs.csv', ['Nom', 'Adresse', 'Téléphone', 'E-mail', 'Vélos achetés'],
              lignes.map((f) => [f.nom, f.adresse, f.telephone, f.email, f.velos_achetes]))} />
          </div>
          <table>
            <thead><tr><th>Nom</th><th>Téléphone</th><th>E-mail</th><th>Vélos achetés</th><th>Action</th></tr></thead>
            <tbody>
              {pag.visibles.map((f) => (
                <tr key={f.id} className={edition === f.id ? 'sel' : ''}>
                  <td><span className="sq" style={{ background: couleurCarre(f.id + 2) }} /><span className="nm">{f.nom}</span></td>
                  <td>{f.telephone || '—'}</td><td>{f.email || '—'}</td><td>{f.velos_achetes}</td>
                  <td>
                    <span className="acts">
                      <button type="button" className="al" onClick={() => ouvrir(f)}>Voir</button>
                      <button type="button" className="al" onClick={() => modifier(f)}>Modifier</button>
                      <PlusActions actions={[{ libelle: 'Supprimer', danger: true, onClick: () => supprimer(f) }]} />
                    </span>
                  </td>
                </tr>
              ))}
              {donnees && lignes.length === 0 && <tr><td colSpan={5} className="vide">Aucun fournisseur.</td></tr>}
            </tbody>
          </table>
          <Pagination {...pag} />
        </section>
        <form className="card" onSubmit={enregistrer} noValidate>
          <h3>{edition ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}</h3>
          {champ('nom', 'Nom')}
          {champ('adresse', 'Adresse')}
          {champ('telephone', 'Téléphone')}
          {champ('email', 'E-mail', 'email')}
          {msg && (msg.type === 'ok' || !msg.champ) && <Alerte type={msg.type} onFermer={() => setMsg(null)}>{msg.texte}</Alerte>}
          <div className="btns">
            <button type="submit" className="btn p">Enregistrer</button>
            {edition && <button type="button" className="btn" onClick={() => { setEdition(null); setForm(VIDE); setMsg(null); }}>Annuler</button>}
          </div>
        </form>
      </div>
      <PiedDePage />
      {voir && (
        <Dialogue titre={voir.f.nom} onFermer={() => setVoir(null)} actions={<button type="button" className="btn" onClick={() => setVoir(null)}>Fermer</button>}>
          <div className="col" style={{ gap: 4 }}>
            <span>{voir.f.adresse || 'Adresse non renseignée'}</span>
            <span className="mut">{voir.f.telephone || '—'} · {voir.f.email || '—'}</span>
          </div>
          <span className="mut">{voir.velos.length} vélo(s) acheté(s)</span>
          <div style={{ maxHeight: 220, overflow: 'auto' }}>
            <table>
              <thead><tr><th>Série</th><th>Type</th><th>Couleur</th><th>Achat</th></tr></thead>
              <tbody>{voir.velos.map((v) => <tr key={v.numero_serie}><td>{v.numero_serie}</td><td>{v.type}</td><td>{v.couleur}</td><td>{jjmmaaaa(v.date_achat)}</td></tr>)}</tbody>
            </table>
          </div>
        </Dialogue>
      )}
    </>
  );
}
