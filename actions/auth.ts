'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
})

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

export type ActionResult = {
  success: boolean
  message: string
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { success: false, message: error.message }
  }

  redirect('/planner')
}

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    fullName: formData.get('fullName') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error) {
    return { success: false, message: error.message }
  }

  return {
    success: true,
    message: 'Check your email to confirm your account.',
  }
}

export async function forgotPasswordAction(formData: FormData): Promise<ActionResult> {
  const raw = { email: formData.get('email') as string }

  const parsed = emailSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { success: false, message: error.message }
  }

  return {
    success: true,
    message: 'Password reset link sent. Check your email.',
  }
}

export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const raw = { password: formData.get('password') as string }

  const parsed = resetPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return { success: false, message: error.message }
  }

  redirect('/planner')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
