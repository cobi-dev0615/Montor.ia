'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

// Global cache for user to prevent duplicate requests across components
let cachedUser: User | null = null
let userPromise: Promise<User | null> | null = null
let isFetching = false

export function useUser() {
  const [user, setUser] = useState<User | null>(cachedUser)
  const [loading, setLoading] = useState(!cachedUser)
  const supabase = createSupabaseClient()
  const hasFetched = useRef(false)

  useEffect(() => {
    // If we already have cached user, use it immediately
    if (cachedUser) {
      setUser(cachedUser)
      setLoading(false)
      return
    }

    // If another component is already fetching, wait for that promise
    if (userPromise && !hasFetched.current) {
      hasFetched.current = true
      userPromise.then((fetchedUser) => {
        cachedUser = fetchedUser
        setUser(fetchedUser)
        setLoading(false)
      })
      return
    }

    // If no one is fetching, start fetching
    if (!isFetching) {
      isFetching = true
      hasFetched.current = true
      userPromise = supabase.auth.getUser().then(({ data: { user }, error }) => {
        isFetching = false
        if (error || !user) {
          cachedUser = null
          return null
        }
        cachedUser = user
        return user
      })

      userPromise.then((fetchedUser) => {
        cachedUser = fetchedUser
        setUser(fetchedUser)
        setLoading(false)
      })
    }
  }, [supabase])

  return { user, loading }
}

