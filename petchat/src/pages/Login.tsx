import React, { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../services/firebase'

interface LoginProps {
  onLoginSuccess: (email: string) => void
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      onLoginSuccess(email)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await createUserWithEmailAndPassword(auth, email, password)
      onLoginSuccess(email)
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🐕 PetChat</h1>
          <p className="text-white opacity-75">Admin Portal</p>
        </div>

        <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
          <div>
            <label className="block text-white font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="admin@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-400 text-red-200 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
          >
            {isLoading ? '⏳ Loading...' : isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignup(!isSignup)
              setError('')
            }}
            className="text-white opacity-75 hover:opacity-100 transition"
          >
            {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign up"}
          </button>
        </div>

        <p className="text-white opacity-50 text-center text-sm mt-6">
          Admin accounts only. Contact your system administrator for access.
        </p>
      </div>
    </div>
  )
}
