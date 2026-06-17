import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  or,
} from 'firebase/firestore'
import { db } from './firebase'
import { Message } from '../types'

const messagesRef = collection(db, 'messages')

export const sendMessage = async (message: Omit<Message, 'id'>) => {
  try {
    const docRef = await addDoc(messagesRef, {
      ...message,
      timestamp: new Date(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

export const getConversation = async (userId1: string, userId2: string) => {
  try {
    const q = query(
      messagesRef,
      where('isGroupChat', '==', false),
      orderBy('timestamp', 'desc')
    )
    const snapshot = await getDocs(q)
    const messages = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Message))
      .filter(msg =>
        (msg.senderId === userId1 && msg.recipientId === userId2) ||
        (msg.senderId === userId2 && msg.recipientId === userId1)
      )
    return messages
  } catch (error) {
    console.error('Error getting conversation:', error)
    throw error
  }
}

export const getGroupChat = async (groupName: string) => {
  try {
    const q = query(
      messagesRef,
      where('isGroupChat', '==', true),
      where('groupName', '==', groupName),
      orderBy('timestamp', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Message))
  } catch (error) {
    console.error('Error getting group chat:', error)
    throw error
  }
}

export const subscribeToConversation = (
  userId1: string,
  userId2: string,
  callback: (messages: Message[]) => void
) => {
  const q = query(
    messagesRef,
    where('isGroupChat', '==', false),
    orderBy('timestamp', 'desc')
  )
  return onSnapshot(q, snapshot => {
    const messages = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Message))
      .filter(msg =>
        (msg.senderId === userId1 && msg.recipientId === userId2) ||
        (msg.senderId === userId2 && msg.recipientId === userId1)
      )
      .reverse()
    callback(messages)
  })
}

export const subscribeToGroupChat = (
  groupName: string,
  callback: (messages: Message[]) => void
) => {
  const q = query(
    messagesRef,
    where('isGroupChat', '==', true),
    where('groupName', '==', groupName),
    orderBy('timestamp', 'desc')
  )
  return onSnapshot(q, snapshot => {
    const messages = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Message))
      .reverse()
    callback(messages)
  })
}
