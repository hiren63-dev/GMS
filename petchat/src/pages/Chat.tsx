import React, { useState } from 'react'
import { Employee } from '../types'
import { useMessages } from '../hooks/useMessages'
import MessageList from '../components/MessageList'
import MessageInput from '../components/MessageInput'
import DepartmentMenu from '../components/DepartmentMenu'
import { useEmployees } from '../hooks/useEmployees'
import { sendMessage } from '../services/messageService'
import { Menu, X } from 'lucide-react'

interface ChatProps {
  currentEmployee: Employee
}

export const Chat: React.FC<ChatProps> = ({ currentEmployee }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isDeptMenuOpen, setIsDeptMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { messages } = useMessages(
    currentEmployee.id,
    selectedEmployee?.id
  )
  const { employees } = useEmployees()

  const handleSendMessage = async (content: string) => {
    if (!selectedEmployee) return

    setIsLoading(true)
    try {
      await sendMessage({
        senderId: currentEmployee.id,
        senderName: currentEmployee.name,
        recipientId: selectedEmployee.id,
        content,
        timestamp: Date.now(),
        isGroupChat: false,
      })
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-600 to-pink-600">
      {/* Sidebar */}
      <div className="w-64 bg-white bg-opacity-5 border-r border-white border-opacity-20 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-white border-opacity-20">
          <h3 className="text-white font-bold text-lg">Conversations</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <button
            onClick={() => setIsDeptMenuOpen(true)}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-2 rounded-lg mb-4 transition"
          >
            + New Chat
          </button>
          {selectedEmployee && (
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <p className="text-white font-semibold">{selectedEmployee.name}</p>
              <p className="text-white text-sm opacity-75">{selectedEmployee.department}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white bg-opacity-10 border-b border-white border-opacity-20 p-4 flex justify-between items-center md:hidden">
          <h2 className="text-white font-bold">
            {selectedEmployee ? selectedEmployee.name : 'PetChat'}
          </h2>
          <button
            onClick={() => setIsDeptMenuOpen(true)}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
          >
            <Menu size={24} />
          </button>
        </div>

        {!selectedEmployee ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white text-2xl font-bold mb-4">👋 Welcome!</p>
              <p className="text-white opacity-75 mb-6">Select a person to start chatting</p>
              <button
                onClick={() => setIsDeptMenuOpen(true)}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold px-6 py-3 rounded-lg transition"
              >
                Choose a Colleague
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <MessageList messages={messages} currentUserId={currentEmployee.id} />

            {/* Input */}
            <div className="p-4 border-t border-white border-opacity-20">
              <MessageInput onSend={handleSendMessage} disabled={isLoading} />
            </div>
          </>
        )}
      </div>

      {/* Department Menu */}
      <DepartmentMenu
        isOpen={isDeptMenuOpen}
        onClose={() => setIsDeptMenuOpen(false)}
        employees={employees}
        onSelectEmployee={(emp) => {
          setSelectedEmployee(emp)
          setIsDeptMenuOpen(false)
        }}
      />
    </div>
  )
}
