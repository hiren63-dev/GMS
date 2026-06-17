import { useState, useEffect } from 'react'
import { Message } from '../types'
import { subscribeToConversation, subscribeToGroupChat } from '../services/messageService'

export const useMessages = (userId1: string, userId2?: string, groupName?: string) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (groupName) {
      const unsubscribe = subscribeToGroupChat(groupName, messages => {
        setMessages(messages)
        setLoading(false)
      })
      return unsubscribe
    }

    if (userId2) {
      const unsubscribe = subscribeToConversation(userId1, userId2, messages => {
        setMessages(messages)
        setLoading(false)
      })
      return unsubscribe
    }
  }, [userId1, userId2, groupName])

  return { messages, loading }
}
