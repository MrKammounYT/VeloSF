import { Link } from 'react-router-dom';
import { api, type Station } from '../api';
import { Alerte, ChipStation, EnTete, PiedDePage, Stat, useDonnees } from '../composants/commun';

interface Reponse {
  stations: Station[];
  suggestions: { de: string; vers: string | null }[];
  mouvements: { id: number; nom: string; departs: number; arrivees: number }[];
  desequilibre: boolean;
  compteurs: { pleines: number; vides: number; equilibrees: number };
  seuils: { vide: number; pleine: number };
}

/** Écran 09 – CU10 équilibre des stations et mouvements de location. */
export function Equilibre() {
  const { donnees, erreur } = useDonnees(() => api.get<Reponse>('/equilibre'));
  if (erreur) return <Alerte>{erreur}</Alerte>;
  const d = donnees;
  return (
    <>
      <EnTete titre="Équilibre des stations" sousTitre="Mouvements de location et stations déséquilibrées." />
      <div className="g3">
        <Stat libelle="Stations pleines" valeur={d?.compteurs.pleines ?? '…'} />
        <Stat libelle="Stations vides" valeur={d?.compteurs.vides ?? '…'} />
        <Stat libelle="Équilibrées" valeur={d?.compteurs.equilibrees ?? '…'} />
      </div>
      <div className="g21">
        <div className="col">
          <div className="g3">
            {d?.stations.map((s) => {
              const horsService = s.nb_velos - s.velos_disponibles;
              return (
                <div className="tc" key={s.id}>
                  <div className="im">
                    <div className="dots" aria-label={`${s.nb_velos} vélos sur ${s.capacite} places`}>
                      {Array.from({ length: s.capacite }, (_, i) => (
                        <i key={i} className={`d${i < s.velos_disponibles ? ' f' : i < s.nb_velos ? ' w' : ''}`} />
                      ))}
                    </div>
                    <ChipStation statut={s.statut} />
                  </div>
                  <div className="bt">
                    <b>{s.nom}</b>
                    <span className="mut">{s.nb_velos}/{s.capacite} vélos · {s.occupation} %{horsService ? ` · ${horsService} en panne` : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <section className="card">
            <h3>Mouvements de location · 7 derniers jours</h3>
            <table>
              <thead><tr><th>Station</th><th>Départs</th><th>Arrivées</th><th>Solde</th></tr></thead>
              <tbody>
                {d?.mouvements.map((m) => {
                  const solde = m.arrivees - m.departs;
                  return (
                    <tr key={m.id}>
                      <td className="nm">{m.nom}</td><td>{m.departs}</td><td>{m.arrivees}</td>
                      <td><span className={`pc ${solde > 0 ? 'warn' : solde < 0 ? 'bad' : 'ok'}`}>{solde > 0 ? `+${solde}` : solde}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <span className="mut">Solde positif : la station se remplit ; négatif : elle se vide.</span>
          </section>
        </div>
        <section className="card">
          <h3>À rééquilibrer</h3>
          {d && !d.desequilibre && <span className="mut">Aucune station déséquilibrée.</span>}
          {d?.suggestions.map((s, i) => (
            <div className="li" key={i}><span className="n">{i + 1}</span>{s.de}{s.vers ? ` → ${s.vers}` : ' · à délester'}</div>
          ))}
          <Link to="/itineraires?nouveau=1" className="btn p" aria-disabled={d ? !d.desequilibre : true}>Préparer un itinéraire</Link>
          {d && (
            <span className="mut">
              Statuts (hypothèse H14) : « Vide » sous {Math.round(d.seuils.vide * 100)} % d’occupation, « Pleine » à {Math.round(d.seuils.pleine * 100)} %.
              Points orange : vélos en panne.
            </span>
          )}
        </section>
      </div>
      <PiedDePage />
    </>
  );
}
