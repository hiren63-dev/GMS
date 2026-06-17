import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore'
import { db } from './firebase'
import { Employee, Department } from '../types'

const employeesRef = collection(db, 'employees')

export const addEmployee = async (employee: Omit<Employee, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(employeesRef, {
      ...employee,
      createdAt: new Date(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error adding employee:', error)
    throw error
  }
}

export const getEmployees = async () => {
  try {
    const snapshot = await getDocs(employeesRef)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Employee))
  } catch (error) {
    console.error('Error getting employees:', error)
    throw error
  }
}

export const getEmployeesByDepartment = async (department: Department) => {
  try {
    const q = query(employeesRef, where('department', '==', department))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Employee))
  } catch (error) {
    console.error('Error getting employees by department:', error)
    throw error
  }
}

export const getEmployeeById = async (id: string) => {
  try {
    const snapshot = await getDocs(query(employeesRef, where('__name__', '==', id)))
    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
    } as Employee
  } catch (error) {
    console.error('Error getting employee:', error)
    throw error
  }
}

export const updateEmployee = async (id: string, updates: Partial<Employee>) => {
  try {
    const docRef = doc(db, 'employees', id)
    await updateDoc(docRef, updates)
  } catch (error) {
    console.error('Error updating employee:', error)
    throw error
  }
}

export const deleteEmployee = async (id: string) => {
  try {
    const docRef = doc(db, 'employees', id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Error deleting employee:', error)
    throw error
  }
}

export const subscribeToEmployees = (callback: (employees: Employee[]) => void) => {
  return onSnapshot(employeesRef, snapshot => {
    const employees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Employee))
    callback(employees)
  })
}
