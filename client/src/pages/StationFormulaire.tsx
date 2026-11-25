import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ErreurApi, type Station } from '../api';
import { Alerte, Champ, EnTete, PiedDePage } from '../composants/commun';
import { CarteSchematique } from '../composants/CarteSchematique';
import { useRafraichirResume } from '../composants/Coquille';

/** Écran 03 – CU1 création ou modification d'une station. */
export function StationFormulaire() {
  const { id } = useParams();
  const navigate = useNavigate();
  const rafraichirResume = useRafraichirResume();
  const [stations, setStations] = useState<Station[]>([]);
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [capacite, setCapacite] = useState('');
  const [nbVelos, setNbVelos] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [erreur, setErreur] = useState<{ texte: string; champ?: string } | null>(null);

  useEffect(() => {
    api.get<{ stations: Station[] }>('/stations').then((r) => setStations(r.stations));
    if (id) {
      api.get<{ station: Station }>(`/stations/${id}`).then(({ station: s }) => {
        setNom(s.nom);
        setAdresse(s.adresse);
        setCapacite(String(s.capacite));
        setNbVelos(s.nb_velos);
        if (s.carte_x != null && s.carte_y != null) setPos({ x: s.carte_x, y: s.carte_y });
      }).catch((e) => setErreur({ texte: e.message }));
    }
  }, [id]);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    const corps = { nom, adresse, capacite: capacite === '' ? undefined : Number(capacite), carte_x: pos?.x ?? null, carte_y: pos?.y ?? null };
    try {
      const r = id ? await api.put<{ id: number }>(`/stations/${id}`, corps) : await api.post<{ id: number }>('/stations', corps);
      rafraichirResume();
      navigate(`/stations/${r.id}`);
    } catch (err) {
      setErreur({ texte: (err as Error).message, champ: (err as ErreurApi).champ });
    }
  };

  const err = (c: string) => (erreur?.champ === c ? erreur.texte : null);
  return (
    <>
      <EnTete titre={id ? `Modifier la station ${nom}` : 'Nouvelle station'} sousTitre="Renseigner l’adresse et la capacité." />
      <div className="g21">
        <form className="card" onSubmit={enregistrer} noValidate>
          <h3>Informations de la station</h3>
          <div className="g2">
            <Champ libelle="Nom de la station" erreur={err('nom')}>
              <span className="in"><input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. : Sfax Centre" /></span>
            </Champ>
            <Champ libelle="Capacité (bornes)" erreur={err('capacite')}>
              <span className="in"><input type="number" min={1} value={capacite} onChange={(e) => setCapacite(e.target.value)} placeholder="Ex. : 20" /></span>
            </Champ>
          </div>
          <Champ libelle="Adresse" erreur={err('adresse')}>
            <span className="in"><input type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Rue, quartier, ville" /></span>
          </Champ>
          <Champ libelle="Nombre de vélos présents"
            aide="Calculé à partir des vélos affectés à la station (achats, locations, missions) : il reste toujours cohérent.">
            <span className="in ro"><input type="number" value={nbVelos} readOnly aria-readonly="true" /></span>
          </Champ>
          {erreur && !erreur.champ && <Alerte>{erreur.texte}</Alerte>}
          {erreur?.champ === 'capacite' && <Alerte>{erreur.texte}</Alerte>}
          <div className="btns">
            <button type="submit" className="btn p">Enregistrer</button>
            <Link to={id ? `/stations/${id}` : '/stations'} className="btn">Annuler</Link>
          </div>
        </form>
        <section className="card">
          <h3>Emplacement</h3>
          <CarteSchematique hauteur={300} choix={pos} onChoisir={(x, y) => setPos({ x, y })}
            stations={stations.filter((s) => String(s.id) !== id)} />
          <span className="mut">{pos ? `Position choisie : ${pos.x} / ${pos.y}` : 'Cliquez sur la carte pour placer la station.'}</span>
        </section>
      </div>
      <PiedDePage />
    </>
  );
}
