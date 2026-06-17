import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  orderBy,
  onSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import { LoginLog } from '../types'

const loginsRef = collection(db, 'loginLogs')

export const logLogin = async (employeeId: string, employeeName: string) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if already logged in today
    const q = query(
      loginsRef,
      where('employeeId', '==', employeeId),
      where('date', '>=', today)
    )
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      // Already logged in, return existing log
      return snapshot.docs[0].id
    }

    const docRef = await addDoc(loginsRef, {
      employeeId,
      employeeName,
      date: today,
      loginTime: new Date(),
      logoutTime: null,
    })
    return docRef.id
  } catch (error) {
    console.error('Error logging in:', error)
    throw error
  }
}

export const logLogout = async (loginLogId: string) => {
  try {
    const docRef = doc(db, 'loginLogs', loginLogId)
    await updateDoc(docRef, {
      logoutTime: new Date(),
    })
  } catch (error) {
    console.error('Error logging out:', error)
    throw error
  }
}

export const getTodayLoginLog = async (employeeId: string) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const q = query(
      loginsRef,
      where('employeeId', '==', employeeId),
      where('date', '>=', today)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
    } as LoginLog
  } catch (error) {
    console.error('Error getting login log:', error)
    throw error
  }
}

export const getWorkHours = async (loginLogId: string) => {
  try {
    const docRef = doc(db, 'loginLogs', loginLogId)
    const q = query(loginsRef, where('__name__', '==', loginLogId))
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null
    const loginLog = snapshot.docs[0].data() as LoginLog

    if (!loginLog.logoutTime) {
      const now = new Date()
      const hours = (now.getTime() - loginLog.loginTime) / (1000 * 60 * 60)
      return parseFloat(hours.toFixed(2))
    }

    const hours = (loginLog.logoutTime - loginLog.loginTime) / (1000 * 60 * 60)
    return parseFloat(hours.toFixed(2))
  } catch (error) {
    console.error('Error calculating work hours:', error)
    throw error
  }
}

export const subscribeToLoginLogs = (callback: (logs: LoginLog[]) => void) => {
  return onSnapshot(loginsRef, snapshot => {
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as LoginLog))
    callback(logs)
  })
}
