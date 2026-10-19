import { collection, doc, getDocs, runTransaction, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { validateClub, validateCourse, validateTee } from '../lib/courseLibrary.js';
import { originOnCreate, originOnEdit } from '../lib/courseOrigin.js';

const ref = (id) => doc(db, 'courseClubs', id);
const newId = () => doc(collection(db, 'courseClubs')).id;

export async function listClubs() {
  const snapshot = await getDocs(collection(db, 'courseClubs'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => a.name.localeCompare(b.name));
}
export async function saveClub(id, fields) {
  const value = validateClub(fields);
  if (!id) {
    const clubId = newId();
    await setDoc(ref(clubId), { ...value, origin: originOnCreate(), courses: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return clubId;
  }
  await runTransaction(db, async tx => { const snap = await tx.get(ref(id)); if (!snap.exists()) throw new Error('Club no longer exists.'); tx.update(ref(id), { ...value, origin: originOnEdit(snap.data()), updatedAt: serverTimestamp() }); });
  return id;
}
export async function removeClub(id) { await deleteDoc(ref(id)); }
export async function saveCourse(clubId, courseId, fields) {
  const value = validateCourse(fields);
  const id = courseId || newId();
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref(clubId)); if (!snap.exists()) throw new Error('Club no longer exists.');
    const courses = snap.data().courses || [];
    if (courseId && !courses.some(c => c.id === id)) throw new Error('Course no longer exists.');
    tx.update(ref(clubId), { courses: courseId ? courses.map(c => c.id === id ? { ...c, ...value, origin: originOnEdit(c) } : c) : [...courses, { id, ...value, origin: originOnCreate(), teeSets: [] }], updatedAt: serverTimestamp() });
  });
}
export async function removeCourse(clubId, courseId) { await runTransaction(db, async tx => { const snap = await tx.get(ref(clubId)); if (!snap.exists()) throw new Error('Club no longer exists.'); tx.update(ref(clubId), { courses: (snap.data().courses || []).filter(c => c.id !== courseId), updatedAt: serverTimestamp() }); }); }
export async function saveTee(clubId, courseId, teeId, fields) {
  const value = validateTee(fields); const id = teeId || newId();
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref(clubId)); if (!snap.exists()) throw new Error('Club no longer exists.');
    const courses = snap.data().courses || []; if (!courses.some(c => c.id === courseId)) throw new Error('Course no longer exists.');
    tx.update(ref(clubId), { courses: courses.map(c => {
      if (c.id !== courseId) return c;
      const teeSets = c.teeSets || [];
      if (teeId && !teeSets.some(t => t.id === id)) throw new Error('Tee set no longer exists.');
      return { ...c, teeSets: teeId ? teeSets.map(t => t.id === id ? { ...t, ...value, origin: originOnEdit(t) } : t) : [...teeSets, { id, ...value, origin: originOnCreate() }] };
    }), updatedAt: serverTimestamp() });
  });
}
export async function removeTee(clubId, courseId, teeId) { await runTransaction(db, async tx => { const snap = await tx.get(ref(clubId)); if (!snap.exists()) throw new Error('Club no longer exists.'); tx.update(ref(clubId), { courses: (snap.data().courses || []).map(c => c.id === courseId ? { ...c, teeSets: (c.teeSets || []).filter(t => t.id !== teeId) } : c), updatedAt: serverTimestamp() }); }); }
