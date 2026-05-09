import {
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

// =======================
// MONTH ID
// =======================
const getMonthId = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// =======================
// DEFAULT STRUCTURE
// =======================
const defaultAnalytics = {
  visitors: 0,
  orderClicks: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ageGroups: {
    "13-17": 0,
    "18-24": 0,
    "25-34": 0,
    "35-44": 0,
    "45+": 0
  }
};

// =======================
// TRACK VISIT (FIXED)
// =======================
export const trackVisit = async () => {
  const monthId = getMonthId();
  const visitorKey = `vnt_${monthId}`;
  const docRef = doc(db, 'analytics', monthId);

  if (localStorage.getItem(visitorKey)) return;

  try {
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      await setDoc(docRef, {
        ...defaultAnalytics,
        visitors: 1
      });
    } else {
      await setDoc(docRef, {
        visitors: increment(1),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    localStorage.setItem(visitorKey, 'true');

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `analytics/${monthId}`);
  }
};

// =======================
// TRACK ORDER CLICK (FIXED)
// =======================
export const trackOrderClick = async () => {
  const monthId = getMonthId();
  const docRef = doc(db, 'analytics', monthId);

  try {
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      await setDoc(docRef, {
        ...defaultAnalytics,
        orderClicks: 1
      });
    } else {
      await setDoc(docRef, {
        orderClicks: increment(1),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `analytics/${monthId}`);
  }
};

// =======================
// AGE GROUP TRACKING (FIXED)
// =======================
export const trackAgeGroup = async (
  group: '13-17' | '18-24' | '25-34' | '35-44' | '45+'
) => {
  const monthId = getMonthId();
  const docRef = doc(db, 'analytics', monthId);

  try {
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      await setDoc(docRef, {
        ...defaultAnalytics,
        ageGroups: {
          ...defaultAnalytics.ageGroups,
          [group]: 1
        }
      });
    } else {
      await setDoc(docRef, {
        [`ageGroups.${group}`]: increment(1),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `analytics/${monthId}`);
  }
};