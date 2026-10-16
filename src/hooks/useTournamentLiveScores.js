import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase.js';

/** Realtime round metadata, independent entries and organiser-verified cards. */
export function useTournamentLiveScores(tournamentId) {
  const [state, setState] = useState({ rounds: [], loading: true, error: '' });
  useEffect(() => {
    if (!tournamentId) {
      setState({ rounds: [], loading: false, error: '' });
      return undefined;
    }
    let active = true;
    let metadataReady = false;
    const subscriptions = new Map();
    const records = new Map();
    const publish = () => {
      if (!active) return;
      const all = [...records.values()];
      setState({
        rounds: all.map(({round, entries, verifiedScores}) => ({round, entries, verifiedScores})),
        loading: !metadataReady || all.some((x) => !x.entriesReady || !x.verifiedReady),
        error: '',
      });
    };
    const fail = (error) => {
      if (active) setState((s) => ({...s,loading:false,error:error.message || 'Unable to load tournament scores.'}));
    };
    setState({ rounds: [], loading: true, error: '' });
    const stopRounds = onSnapshot(collection(db,'tournaments',tournamentId,'rounds'), (snapshot) => {
      const ids = new Set(snapshot.docs.map((d) => d.id));
      for (const [id, stops] of subscriptions) {
        if (!ids.has(id)) { stops.forEach((stop) => stop()); subscriptions.delete(id); records.delete(id); }
      }
      for (const item of snapshot.docs) {
        const id = item.id;
        records.set(id, { round: { id, ...item.data() }, entries: [], verifiedScores: {},
          entriesReady:false, verifiedReady:false, ...records.get(id),
          round: { id, ...item.data() },
        });
        if (!subscriptions.has(id)) {
          const base = ['tournaments',tournamentId,'rounds',id];
          const stopEntries = onSnapshot(collection(db,...base,'scoreEntries'), (snap) => {
            const previous=records.get(id); if (!previous || !active) return;
            records.set(id,{...previous,entries:snap.docs.map((d)=>({id:d.id,...d.data()})),entriesReady:true});publish();
          },fail);
          const stopVerified = onSnapshot(collection(db,...base,'verifiedScores'), (snap) => {
            const previous=records.get(id); if (!previous || !active) return;
            records.set(id,{...previous,verifiedScores:Object.fromEntries(snap.docs.map((d)=>[d.id,d.data()])),verifiedReady:true});publish();
          },fail);
          subscriptions.set(id,[stopEntries,stopVerified]);
        }
      }
      metadataReady=true;publish();
    },fail);
    return () => { active=false; stopRounds(); for(const stops of subscriptions.values()) stops.forEach((stop)=>stop()); };
  },[tournamentId]);
  return state;
}
