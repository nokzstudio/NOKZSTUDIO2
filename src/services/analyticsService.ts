import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

const getMonthId = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const trackVisit = async () => {
  const monthId = getMonthId();
  const visitorKey = `vnt_${monthId}`;
  
  if (localStorage.getItem(visitorKey)) return;

  const docRef = doc(db, 'analytics', monthId);
  try {
    // We use setDoc with merge: true to either create the doc or update it
    // This reduces the need for split get/set permissions and logic
    await setDoc(docRef, {
      visitors: increment(1),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    localStorage.setItem(visitorKey, 'true');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `analytics/${monthId}`);
  }
};

export const trackOrderClick = async () => {
  const monthId = getMonthId();
  const docRef = doc(db, 'analytics', monthId);
  try {
    await updateDoc(docRef, {
      orderClicks: increment(1),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `analytics/${monthId}`);
  }
};

export const trackAgeGroup = async (group: '13-17' | '18-24' | '25-34' | '35-44' | '45+') => {
  const monthId = getMonthId();
  const docRef = doc(db, 'analytics', monthId);
  try {
    await updateDoc(docRef, {
      [`ageGroups.${group}`]: increment(1),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `analytics/${monthId}`);
  }
};
