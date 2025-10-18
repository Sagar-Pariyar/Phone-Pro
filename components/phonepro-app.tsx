"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"

const API_BASE = "http://127.0.0.1:8000"

// Generic fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(errText || `Request failed: ${res.status}`)
  }
  return res.json()
}

// Types
type OptionsResponse = Record<string, any>
type RecommendationResult = {
  suggested_model?: string
  details?: Record<string, any>
  [k: string]: any
}
type Message = { type: "success" | "error" | "info"; text: string }

// --- Reusable UI Components ---

function SectionCard(props: { title?: string; children: React.ReactNode; className?: string }) {
  const { title, children, className } = props
  // FIX: Correct Tailwind CSS syntax for CSS variables
  return (
    <section className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 ${className || ""}`}>
      {title ? <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">{title}</h2> : null}
      {children}
    </section>
  )
}

function MessageArea({ message }: { message?: Message | null }) {
  if (!message) return null
  // FIX: Correct Tailwind CSS syntax for CSS variables
  const color =
    message.type === "error"
      ? "bg-[var(--color-destructive)]/10 text-[var(--color-destructive-foreground)]"
      : message.type === "success"
        ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
        : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
  return <div className={`mt-3 rounded-md px-3 py-2 text-sm ${color}`}>{message.text}</div>
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  // FIX: Correct Tailwind CSS syntax for CSS variables
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
      {children}
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  // FIX: Correct Tailwind CSS syntax for CSS variables
  return (
    <input
      {...rest}
      className={`w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 py-2 text-[var(--color-foreground)] outline-none ring-1 ring-transparent focus:ring-[var(--color-ring)] ${className || ""}`}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props
  // FIX: Correct Tailwind CSS syntax for CSS variables
  return (
    <select
      {...rest}
      className={`w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 py-2 text-[var(--color-foreground)] outline-none ring-1 ring-transparent focus:ring-[var(--color-ring)] ${className || ""}`}
    >
      {children}
    </select>
  )
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, children, ...rest } = props
  // FIX: Correct Tailwind CSS syntax for CSS variables
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50 ${className || ""}`}
    >
      {children}
    </button>
  )
}

function OutlineButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, children, ...rest } = props
  // FIX: Correct Tailwind CSS syntax for CSS variables
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] ${className || ""}`}
    >
      {children}
    </button>
  )
}

// --- Authentication View ---

function AuthView({ onAuthed }: { onAuthed: (username: string) => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login")
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupUsername, setSignupUsername] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupConfirm, setSignupConfirm] = useState("")
  const [message, setMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setMessage(null)
    if (!signupUsername || !signupEmail || !signupPassword || !signupConfirm) {
      setMessage({ type: "error", text: "Please fill in all sign up fields." })
      return
    }
    if (signupPassword !== signupConfirm) {
      setMessage({ type: "error", text: "Passwords do not match." })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: signupUsername,
          email: signupEmail,
          password: signupPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: "error", text: data?.detail || JSON.stringify(data) || "Sign up failed." })
      } else {
        setMessage({ type: "success", text: data?.message || "Sign up successful. You can now log in." })
        setTab("login")
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Sign up error." })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setMessage(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: "error", text: data?.detail || JSON.stringify(data) || "Login failed." })
      } else {
        localStorage.setItem("phonepro_username", loginUsername)
        onAuthed(loginUsername)
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Login error." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto my-16 w-full max-w-md">
      <SectionCard>
        <div className="mb-4 flex items-center gap-2">
          <OutlineButton
            aria-pressed={tab === "login"}
            onClick={() => setTab("login")}
            className={tab === "login" ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]" : ""}
          >
            Login
          </OutlineButton>
          <OutlineButton
            aria-pressed={tab === "signup"}
            onClick={() => setTab("signup")}
            className={tab === "signup" ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]" : ""}
          >
            Sign Up
          </OutlineButton>
        </div>

        {tab === "signup" ? (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              handleSignup()
            }}
          >
            <div>
              <Label htmlFor="signup-username">Username</Label>
              <TextInput
                id="signup-username"
                autoComplete="username"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="signup-email">Email</Label>
              <TextInput
                id="signup-email"
                type="email"
                autoComplete="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="signup-password">Password</Label>
              <TextInput
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="signup-confirm">Confirm Password</Label>
              <TextInput
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
              />
            </div>
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "Signing Up..." : "Sign Up"}
            </PrimaryButton>
            <MessageArea message={message} />
          </form>
        ) : (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              handleLogin()
            }}
          >
            <div>
              <Label htmlFor="login-username">Username</Label>
              <TextInput
                id="login-username"
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="login-password">Password</Label>
              <TextInput
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "Logging In..." : "Login"}
            </PrimaryButton>
            <MessageArea message={message} />
          </form>
        )}
      </SectionCard>
    </div>
  )
}

// --- Main Application View ---

function ApplicationView({
  username,
  onLogout,
}: {
  username: string
  onLogout: () => void
}) {
  const [phoneFilter, setPhoneFilter] = useState("")
  const [selectedModel, setSelectedModel] = useState<string>("")

  const [price, setPrice] = useState(15000)
  const [brand, setBrand] = useState("")
  const [support5g, setSupport5g] = useState<"Yes" | "No">("Yes")
  const [processor, setProcessor] = useState("")
  const [rearCam, setRearCam] = useState(64)
  const [charging, setCharging] = useState(25)
  const [battery, setBattery] = useState(4500)
  const [ram, setRam] = useState(6)
  const [storage, setStorage] = useState(128)
  const [refresh, setRefresh] = useState(90)
  const [os, setOs] = useState("")

  const [recMessage, setRecMessage] = useState<Message | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recResult, setRecResult] = useState<RecommendationResult | null>(null)

  const {
    data: options,
    error: optionsError,
    isLoading: optionsLoading,
  } = useSWR<OptionsResponse>(`${API_BASE}/options`, fetcher)

  // Use correct keys from backend response
  const brandOptions: string[] = useMemo(() => options?.brand_names || [], [options])
  const processorOptions: string[] = useMemo(() => options?.processor_brands || [], [options])
  const osOptions: string[] = useMemo(() => options?.operating_systems || [], [options])
  const phoneModels: string[] = useMemo(() => options?.phone_models || [], [options])

  // Set default form values once options are loaded
  useEffect(() => {
    if (brandOptions.length && !brand) setBrand(brandOptions[0])
    if (processorOptions.length && !processor) setProcessor(processorOptions[0])
    if (osOptions.length && !os) setOs(osOptions[0])
    if (phoneModels.length && !selectedModel) setSelectedModel(phoneModels[0])
  }, [brand, brandOptions, os, osOptions, phoneModels, processor, processorOptions, selectedModel])

  const filteredModels = useMemo(() => {
    const f = phoneFilter.trim().toLowerCase()
    if (!f) return phoneModels
    return phoneModels.filter((m) => m.toLowerCase().includes(f))
  }, [phoneFilter, phoneModels])

  const encodedModel = selectedModel ? encodeURIComponent(selectedModel) : ""
  const {
    data: phoneDetails,
    error: phoneError,
    isLoading: phoneLoading,
  } = useSWR<Record<string, any> | null>(selectedModel ? `${API_BASE}/phone/${encodedModel}` : null, fetcher)

  const handleRecommend = async () => {
    setRecMessage(null)
    setRecResult(null)
    setRecLoading(true)
    try {
      const payload = {
        price: Number(price),
        brand_name: String(brand),
        "5G_or_not": support5g === "Yes",
        processor_brand: String(processor),
        primary_camera_rear: Number(rearCam),
        fast_charging: Number(charging),
        battery_capacity: Number(battery),
        ram_capacity: Number(ram),
        internal_memory: Number(storage),
        refresh_rate: Number(refresh),
        os: String(os), // FIX: Use the correct 'os' key as per the Pydantic model
      }

      const res = await fetch(`${API_BASE}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      // FIX: Handle complex validation errors from FastAPI without crashing
      if (!res.ok) {
        let errorMessage = "Recommendation failed."
        if (data?.detail && typeof data.detail !== "string") {
          errorMessage = "Invalid input. " + JSON.stringify(data.detail)
        } else if (data?.detail) {
          errorMessage = data.detail
        }
        setRecMessage({ type: "error", text: errorMessage })
      } else {
        setRecResult(data)
        setRecMessage({ type: "success", text: "Recommendation generated." })
      }
    } catch (e: any) {
      setRecMessage({ type: "error", text: e?.message || "Recommendation error." })
    } finally {
      setRecLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-balance text-2xl font-semibold text-[var(--color-foreground)]">PhonePro</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-muted-foreground)]">Signed in as {username}</span>
          <OutlineButton onClick={onLogout}>Logout</OutlineButton>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <SectionCard title="About">
            <p className="text-pretty text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              PhonePro recommends the best phone for your needs. Search any model to view its details, then tune the
              controls to get a personalized suggestion.
            </p>
          </SectionCard>

          <SectionCard title="Search Phone Details" className="mt-4">
            <div className="mb-3">
              <Label htmlFor="phone-filter">Search phone model</Label>
              <TextInput
                id="phone-filter"
                placeholder="Type to filter models..."
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <Label htmlFor="phone-select">Available models</Label>
              <Select id="phone-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                {filteredModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>

            <div aria-live="polite" className="mt-2">
              {phoneLoading ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">Loading phone details...</p>
              ) : phoneError ? (
                <p className="text-sm text-[var(--color-destructive-foreground)]">Failed to load phone details.</p>
              ) : phoneDetails ? (
                <div className="max-h-64 overflow-auto rounded-md border border-[var(--color-border)] p-3">
                  <dl className="grid grid-cols-1 gap-2">
                    {Object.entries(phoneDetails).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-2 gap-2 text-sm">
                        <dt className="text-[var(--color-muted-foreground)]">{k}</dt>
                        <dd className="text-[var(--color-foreground)] break-words">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-muted-foreground)]">Select a model to view details.</p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2">
          <SectionCard title="Get Phone Recommendation">
            {optionsLoading ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Loading options...</p>
            ) : optionsError ? (
              <p className="text-sm text-[var(--color-destructive-foreground)]">
                Failed to load options. Please ensure the backend is running.
              </p>
            ) : null}

            <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="price">Price (INR): {price}</Label>
                <input
                  id="price"
                  type="range"
                  min={0}
                  max={100000}
                  step={1000}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="brand">Brand Name</Label>
                <Select id="brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="support5g">5G Support</Label>
                <Select id="support5g" value={support5g} onChange={(e) => setSupport5g(e.target.value as any)}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="processor">Processor Brand</Label>
                <Select id="processor" value={processor} onChange={(e) => setProcessor(e.target.value)}>
                  {processorOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="rearCam">Primary Rear Camera (MP): {rearCam}</Label>
                <input
                  id="rearCam"
                  type="range"
                  min={5}
                  max={108}
                  step={2}
                  value={rearCam}
                  onChange={(e) => setRearCam(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="charging">Charging (W): {charging}</Label>
                <input
                  id="charging"
                  type="range"
                  min={0}
                  max={120}
                  step={5}
                  value={charging}
                  onChange={(e) => setCharging(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="battery">Battery Capacity (mAh): {battery}</Label>
                <input
                  id="battery"
                  type="range"
                  min={1000}
                  max={10000}
                  step={100}
                  value={battery}
                  onChange={(e) => setBattery(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="ram">RAM Capacity (GB): {ram}</Label>
                <input
                  id="ram"
                  type="range"
                  min={1}
                  max={16}
                  step={1}
                  value={ram}
                  onChange={(e) => setRam(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="storage">Internal Memory (GB): {storage}</Label>
                <input
                  id="storage"
                  type="range"
                  min={8}
                  max={1024}
                  step={64}
                  value={storage}
                  onChange={(e) => setStorage(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="refresh">Refresh Rate (Hz): {refresh}</Label>
                <input
                  id="refresh"
                  type="range"
                  min={30}
                  max={144}
                  step={5}
                  value={refresh}
                  onChange={(e) => setRefresh(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="os">Operating System</Label>
                <Select id="os" value={os} onChange={(e) => setOs(e.target.value)}>
                  {osOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <PrimaryButton onClick={handleRecommend} disabled={recLoading}>
                {recLoading ? "Getting Recommendation..." : "Get Recommendation"}
              </PrimaryButton>
              <MessageArea message={recMessage} />
            </div>

            <div className="mt-4">
              {recResult ? (
                <div className="rounded-md border border-[var(--color-border)] p-3">
                  {"suggested_model" in recResult ? (
                    <p className="mb-2 text-sm">
                      <span className="font-medium">Suggested Model:</span>{" "}
                      <span className="text-[var(--color-foreground)]">{recResult.suggested_model}</span>
                    </p>
                  ) : null}
                  {recResult.details ? (
                    <dl className="grid grid-cols-1 gap-2">
                      {Object.entries(recResult.details).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-2 gap-2 text-sm">
                          <dt className="text-[var(--color-muted-foreground)]">{k}</dt>
                          <dd className="text-[var(--color-foreground)] break-words">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <pre className="text-wrap whitespace-pre-wrap text-sm text-[var(--color-foreground)]">
                      {JSON.stringify(recResult, null, 2)}
                    </pre>
                  )}
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

// --- Root Component ---

export default function PhoneProApp() {
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("phonepro_username")
    if (saved) {
      setUsername(saved)
    }
  }, [])

  const handleAuthed = (u: string) => {
    setUsername(u)
  }

  const handleLogout = () => {
    localStorage.removeItem("phonepro_username")
    setUsername(null)
  }

  return (
    <div className="mx-auto max-w-7xl px-4">
      {username ? (
        <ApplicationView username={username} onLogout={handleLogout} />
      ) : (
        <AuthView onAuthed={handleAuthed} />
      )}
    </div>
  )
}