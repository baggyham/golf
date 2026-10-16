import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase.js';

export function useOfficialScores(tournamentId, roundId) {
  const [state,setState]=useState({scores:{},loading:true,error:''});
  useEffect(()=>{
    setState({scores:{},loading:true,error:''});
    if(!tournamentId || !roundId){ setState({scores:{},loading:false,error:''}); return undefined; }
    return onSnapshot(collection(db,'tournaments',tournamentId,'rounds',roundId,'verifiedScores'),
      (snapshot)=>setState({scores:Object.fromEntries(snapshot.docs.map((d)=>[d.id,d.data()])),loading:false,error:''}),
      (err)=>setState({scores:{},loading:false,error:err.message || 'Unable to load official results.'}));
  },[tournamentId,roundId]);
  return state;
}
