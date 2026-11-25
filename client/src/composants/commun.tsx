import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icone, type NomIcone } from '../icones';
import type { StatutStation } from '../api';

// ---------- Formats
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const dateLongue = (d = new Date()) => `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
/** AAAA-MM-JJ → JJ/MM/AAAA */
export const jjmmaaaa = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
/** JJ/MM/AAAA → AAAA-MM-JJ (ou null) */
export function versIso(jjmm: string): string | null {
  const m = jjmm.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, j, mo, a] = m;
  const d = new Date(+a, +mo - 1, +j);
  if (d.getMonth() !== +mo - 1) return null;
  return `${a}-${mo.padStart(2, '0')}-${j.padStart(2, '0')}`;
}
export const heure = (iso?: string | null) => (iso ? iso.slice(11, 16) : '');
export const montant = (v: number | null | undefined, devise = 'TND') => (v == null ? `— ${devise}` : `${v.toLocaleString('fr-FR')} ${devise}`);
export function duree(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
}
const COULEURS = ['#f29b5b', '#ef6b6b', '#f2c14e', '#4fb3d9', '#6fcf6f', '#a78bfa'];
export const couleurCarre = (i: number) => COULEURS[Math.abs(i) % COULEURS.length];

// ---------- Données
export function useDonnees<T>(charger: () => Promise<T>, deps: unknown[] = []) {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const ref = useRef(charger);
  ref.current = charger;
  const recharger = useCallback(() => {
    setErreur(null);
    return ref.current().then(setDonnees).catch((e: Error) => setErreur(e.message));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { recharger(); }, deps);
  return { donnees, erreur, recharger, setDonnees };
}

// ---------- Mise en page
export function EnTete({ titre, sousTitre, actions }: { titre: ReactNode; sousTitre?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="hd">
      <div>
        <h1>{titre}</h1>
        {sousTitre && <span className="mut">{sousTitre}</span>}
      </div>
      <span className="sp" />
      <div className="btns">
        <span className="dt"><Icone nom="calendrier" taille={15} />{dateLongue()}</span>
        {actions}
      </div>
    </header>
  );
}

export function Stat({ libelle, valeur, icone = 'barres' }: { libelle: string; valeur: ReactNode; icone?: NomIcone }) {
  return (
    <div className="stat">
      <div className="tile">
        <div className="tl"><span className="ib2"><Icone nom={icone} taille={14} /></span><span className="mut">{libelle}</span></div>
        <b>{valeur}</b>
      </div>
    </div>
  );
}

export function Etapes({ active, total = 4 }: { active: number; total?: number }) {
  return (
    <div className="steps" aria-label={`Étape ${active} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => <span key={i} className={i < active ? 'on' : ''} />)}
    </div>
  );
}

export function PiedDePage() {
  return <span className="ft">Données de démonstration (fictives).</span>;
}

// ---------- Messages
export function Alerte({ type = 'bad', children, onFermer }: { type?: 'ok' | 'warn' | 'bad' | 'info'; children: ReactNode; onFermer?: () => void }) {
  if (!children) return null;
  return (
    <div className={`alerte ${type}`} role={type === 'bad' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onFermer && <button type="button" className="alerte-x" aria-label="Fermer" onClick={onFermer}><Icone nom="croix" taille={14} /></button>}
    </div>
  );
}

// ---------- Pastilles
const LIBELLE_STATUT: Record<StatutStation, [string, string]> = {
  vide: ['Vide', 'bad'], pleine: ['Pleine', 'warn'], equilibree: ['Équilibrée', 'ok'],
};
export const ChipStation = ({ statut }: { statut: StatutStation }) => (
  <span className={`chip ${LIBELLE_STATUT[statut][1]}`}>{LIBELLE_STATUT[statut][0]}</span>
);
export const libelleStatutStation = (s: StatutStation) => LIBELLE_STATUT[s][0];
export const classeOccupation = (s: StatutStation) => LIBELLE_STATUT[s][1];

const ETAT_VELO: Record<string, [string, string]> = {
  disponible: ['Disponible', 'ok'], loue: ['Loué', ''], en_reparation: ['En réparation', 'bad'], en_camion: ['En camion', 'warn'],
};
export function ChipVelo({ etat, reclamation }: { etat: string; reclamation?: boolean | number }) {
  if (etat === 'disponible' && reclamation) return <span className="chip warn">Réclamation ouverte</span>;
  const [l, c] = ETAT_VELO[etat] ?? [etat, ''];
  return <span className={`chip ${c}`}>{l}</span>;
}

// ---------- Formulaires
export function Champ({ libelle, children, erreur, aide }: { libelle: ReactNode; children: ReactNode; erreur?: string | null; aide?: ReactNode }) {
  return (
    <label className={`f${erreur ? ' err' : ''}`}>
      {libelle}
      {children}
      {aide && <span className="mut aide">{aide}</span>}
      {erreur && <span className="msg-err">{erreur}</span>}
    </label>
  );
}

// ---------- Tableaux : barre d'outils, pagination, export CSV
export function Recherche({ valeur, onChange, placeholder }: { valeur: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="sr2">
      <Icone nom="recherche" taille={14} />
      <input value={valeur} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

export function Filtre<V extends string>({ valeur, onChange, options, libelle }: {
  valeur: V; onChange: (v: V) => void; options: [V, string][]; libelle: string;
}) {
  return (
    <label className="flt">
      <select value={valeur} onChange={(e) => onChange(e.target.value as V)} aria-label={libelle}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <Icone nom="bas" taille={14} />
    </label>
  );
}

export function usePagination<T>(lignes: T[], parPage = 8) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(lignes.length / parPage));
  useEffect(() => { if (page > pages) setPage(1); }, [pages, page]);
  const visibles = useMemo(() => lignes.slice((page - 1) * parPage, page * parPage), [lignes, page, parPage]);
  return { page, pages, setPage, visibles, total: lignes.length };
}

export function Pagination({ page, pages, setPage, visibles, total }: ReturnType<typeof usePagination<unknown>>) {
  return (
    <div className="pgf">
      <span className="mut">Affichage de {visibles.length} sur {total}</span>
      <div className="pg">
        <button type="button" aria-label="Page précédente" disabled={page <= 1} onClick={() => setPage(page - 1)}><Icone nom="gauche" taille={14} /></button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button type="button" key={p} className={p === page ? 'on' : ''} aria-current={p === page ? 'page' : undefined} onClick={() => setPage(p)}>{p}</button>
        ))}
        <button type="button" aria-label="Page suivante" disabled={page >= pages} onClick={() => setPage(page + 1)}><Icone nom="droite" taille={14} /></button>
      </div>
    </div>
  );
}

export function exporterCSV(nomFichier: string, entetes: string[], lignes: (string | number | null | undefined)[][]) {
  const echap = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Séparateur « ; » et BOM UTF-8 : ouverture directe dans un tableur réglé en français
  const csv = '﻿' + [entetes, ...lignes].map((l) => l.map(echap).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nomFichier });
  a.click();
  URL.revokeObjectURL(url);
}

export function BoutonExport({ onClick }: { onClick: () => void }) {
  return <button type="button" className="btn exp" onClick={onClick}><Icone nom="export" taille={15} />Exporter en CSV</button>;
}

// ---------- Menu « Plus d'actions » et dialogue
export function PlusActions({ actions }: { actions: { libelle: string; onClick: () => void; danger?: boolean; desactive?: boolean }[] }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOuvert(false); };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [ouvert]);
  return (
    <span className="menu-plus" ref={ref}>
      <button type="button" className="mo" aria-label="Plus d’actions" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
        <Icone nom="plus" />
      </button>
      {ouvert && (
        <span className="menu-liste" role="menu">
          {actions.map((a) => (
            <button type="button" role="menuitem" key={a.libelle} className={a.danger ? 'danger' : ''} disabled={a.desactive}
              onClick={() => { setOuvert(false); a.onClick(); }}>{a.libelle}</button>
          ))}
        </span>
      )}
    </span>
  );
}

export function Dialogue({ titre, children, onFermer, actions }: { titre: string; children: ReactNode; onFermer: () => void; actions: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onFermer]);
  return (
    <div className="voile" onMouseDown={(e) => e.target === e.currentTarget && onFermer()}>
      <div className="card dialogue" role="dialog" aria-modal="true" aria-label={titre}>
        <div className="row"><h3>{titre}</h3><button type="button" className="mo" aria-label="Fermer" onClick={onFermer}><Icone nom="croix" /></button></div>
        {children}
        <div className="btns">{actions}</div>
      </div>
    </div>
  );
}

/** Normalise pour une recherche insensible aux accents et à la casse. */
export const norm = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
